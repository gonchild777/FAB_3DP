/**
 * 路徑處理 Web Worker
 * 處理耗時運算：JSON 解析、懸臂分析、G-code 生成、路徑優化
 */

// 消息處理器
self.onmessage = function (e) {
    const { type, payload, taskId } = e.data

    try {
        switch (type) {
            case 'PARSE_JSON':
                handleParseJson(payload, taskId)
                break
            case 'ANALYZE_OVERHANG':
                handleAnalyzeOverhang(payload, taskId)
                break
            case 'OPTIMIZE_PATH':
                handleOptimizePath(payload, taskId)
                break
            case 'GENERATE_GCODE':
                handleGenerateGcode(payload, taskId)
                break
            case 'ESTIMATE_TIME':
                handleEstimateTime(payload, taskId)
                break
            default:
                throw new Error(`Unknown task type: ${type}`)
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            taskId,
            error: error.message
        })
    }
}

// 發送進度更新
function reportProgress(taskId, progress, message = '') {
    self.postMessage({
        type: 'PROGRESS',
        taskId,
        progress,
        message
    })
}

// 發送任務完成
function reportComplete(taskId, result) {
    self.postMessage({
        type: 'COMPLETE',
        taskId,
        result
    })
}

/**
 * 解析 JSON 數據
 */
function handleParseJson(payload, taskId) {
    reportProgress(taskId, 0, '開始解析 JSON...')

    const { jsonString } = payload
    const data = JSON.parse(jsonString)

    reportProgress(taskId, 50, '驗證數據結構...')

    // 驗證必要欄位
    if (!data.header || !data.layers) {
        throw new Error('無效的 JSON 格式：缺少 header 或 layers')
    }

    // 計算統計數據
    let totalPoints = 0
    let totalSegments = 0

    for (const layer of data.layers) {
        for (const segment of layer.segments) {
            totalSegments++
            totalPoints += segment.points.length
        }
    }

    reportProgress(taskId, 100, '解析完成')
    reportComplete(taskId, {
        data,
        stats: {
            totalLayers: data.layers.length,
            totalSegments,
            totalPoints
        }
    })
}

/**
 * 懸臂分析
 */
function handleAnalyzeOverhang(payload, taskId) {
    const { pathData } = payload

    if (!pathData || !pathData.layers) {
        throw new Error('無效的路徑數據')
    }

    const layerHeight = pathData.header?.layer_height || 6
    const layers = pathData.layers
    const sortedLayers = [...layers].sort((a, b) => a.layer_index - b.layer_index)

    // 收集每層點集
    const layerPointsCache = new Map()
    for (const layer of sortedLayers) {
        const points = []
        for (const segment of layer.segments) {
            if (segment.type !== 'travel' && segment.is_extruding) {
                points.push(...segment.points)
            }
        }
        layerPointsCache.set(layer.layer_index, points)
    }

    const pointAngles = []
    let processedLayers = 0

    for (const layer of sortedLayers) {
        const layerIndex = layer.layer_index
        const lowerLayerPoints = layerPointsCache.get(layerIndex - 1) || []

        for (const segment of layer.segments) {
            for (const point of segment.points) {
                if (segment.type === 'travel') {
                    pointAngles.push({ ...point, layerIndex, angle: -1, isTravel: true })
                } else {
                    let angle = 0
                    if (layerIndex > 0 && lowerLayerPoints.length > 0) {
                        let minDist = Infinity
                        for (const lp of lowerLayerPoints) {
                            const dx = point.x - lp.x
                            const dy = point.y - lp.y
                            const dist = Math.sqrt(dx * dx + dy * dy)
                            if (dist < minDist) minDist = dist
                        }
                        angle = Math.atan(minDist / layerHeight) * (180 / Math.PI)
                    }
                    pointAngles.push({ ...point, layerIndex, angle: Math.min(angle, 90), isTravel: false })
                }
            }
        }

        processedLayers++
        reportProgress(taskId, Math.round((processedLayers / sortedLayers.length) * 100), `分析圖層 ${processedLayers}/${sortedLayers.length}`)
    }

    // 統計
    const printingAngles = pointAngles.filter(p => !p.isTravel).map(p => p.angle)
    const stats = {
        safe: printingAngles.filter(a => a <= 30).length,
        warning: printingAngles.filter(a => a > 30 && a <= 45).length,
        danger: printingAngles.filter(a => a > 45 && a <= 70).length,
        critical: printingAngles.filter(a => a > 70).length
    }

    reportComplete(taskId, {
        pointAngles,
        maxAngle: Math.max(...printingAngles, 0),
        avgAngle: printingAngles.length > 0 ? printingAngles.reduce((a, b) => a + b, 0) / printingAngles.length : 0,
        stats
    })
}

/**
 * 路徑優化（最近鄰 + 2-opt）
 */
function handleOptimizePath(payload, taskId) {
    const { pathData, options = {} } = payload
    const { mode = 'nearest', apply2opt = true } = options

    reportProgress(taskId, 0, '開始路徑優化...')

    const optimizedData = JSON.parse(JSON.stringify(pathData)) // 深拷貝
    let totalOriginalDistance = 0
    let totalOptimizedDistance = 0

    for (let i = 0; i < optimizedData.layers.length; i++) {
        const layer = optimizedData.layers[i]

        // 只優化列印段落（跳過空移）
        const printSegments = layer.segments.filter(s => s.type !== 'travel' && s.is_extruding)
        const travelSegments = layer.segments.filter(s => s.type === 'travel')

        if (printSegments.length <= 1) continue

        // 計算原始空移距離
        let currentPos = { x: 0, y: 0 }
        for (const seg of printSegments) {
            const start = seg.points[0]
            totalOriginalDistance += Math.sqrt((start.x - currentPos.x) ** 2 + (start.y - currentPos.y) ** 2)
            currentPos = seg.points[seg.points.length - 1]
        }

        // 最近鄰排序
        const sorted = nearestNeighborSort(printSegments)

        // 2-opt 改進
        const optimized = apply2opt ? twoOptImprove(sorted) : sorted

        // 計算優化後空移距離
        currentPos = { x: 0, y: 0 }
        for (const seg of optimized) {
            const start = seg.points[0]
            totalOptimizedDistance += Math.sqrt((start.x - currentPos.x) ** 2 + (start.y - currentPos.y) ** 2)
            currentPos = seg.points[seg.points.length - 1]
        }

        // 重建段落（添加空移）
        const newSegments = []
        currentPos = { x: 0, y: 0 }
        for (const seg of optimized) {
            const start = seg.points[0]
            // 添加空移
            if (Math.abs(start.x - currentPos.x) > 0.1 || Math.abs(start.y - currentPos.y) > 0.1) {
                newSegments.push({
                    type: 'travel',
                    is_extruding: false,
                    points: [{ ...currentPos, z: seg.points[0].z }, { ...start, z: seg.points[0].z }]
                })
            }
            newSegments.push(seg)
            currentPos = seg.points[seg.points.length - 1]
        }

        layer.segments = newSegments

        reportProgress(taskId, Math.round(((i + 1) / optimizedData.layers.length) * 100), `優化圖層 ${i + 1}/${optimizedData.layers.length}`)
    }

    const improvement = totalOriginalDistance > 0
        ? ((totalOriginalDistance - totalOptimizedDistance) / totalOriginalDistance * 100).toFixed(1)
        : 0

    reportComplete(taskId, {
        optimizedData,
        stats: {
            originalTravelDistance: totalOriginalDistance.toFixed(1),
            optimizedTravelDistance: totalOptimizedDistance.toFixed(1),
            improvement: `${improvement}%`
        }
    })
}

/**
 * 最近鄰排序
 */
function nearestNeighborSort(segments) {
    if (segments.length <= 1) return segments

    const result = []
    const remaining = [...segments]
    let currentPos = { x: 0, y: 0 }

    while (remaining.length > 0) {
        let nearestIdx = 0
        let nearestDist = Infinity

        for (let i = 0; i < remaining.length; i++) {
            const start = remaining[i].points[0]
            const dist = Math.sqrt((start.x - currentPos.x) ** 2 + (start.y - currentPos.y) ** 2)
            if (dist < nearestDist) {
                nearestDist = dist
                nearestIdx = i
            }
        }

        const nearest = remaining.splice(nearestIdx, 1)[0]
        result.push(nearest)
        currentPos = nearest.points[nearest.points.length - 1]
    }

    return result
}

/**
 * 2-opt 改進
 */
function twoOptImprove(segments, maxIterations = 100) {
    if (segments.length <= 2) return segments

    let improved = true
    let iterations = 0
    let current = [...segments]

    while (improved && iterations < maxIterations) {
        improved = false
        iterations++

        for (let i = 0; i < current.length - 1; i++) {
            for (let j = i + 2; j < current.length; j++) {
                const delta = calculate2optDelta(current, i, j)
                if (delta < -0.1) {
                    // 執行交換
                    const newRoute = current.slice(0, i + 1)
                    const reversed = current.slice(i + 1, j + 1).reverse()
                    const rest = current.slice(j + 1)
                    current = [...newRoute, ...reversed, ...rest]
                    improved = true
                }
            }
        }
    }

    return current
}

function calculate2optDelta(segments, i, j) {
    const getEnd = (seg) => seg.points[seg.points.length - 1]
    const getStart = (seg) => seg.points[0]
    const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

    const a = i > 0 ? getEnd(segments[i - 1]) : { x: 0, y: 0 }
    const b = getStart(segments[i])
    const c = getEnd(segments[j])
    const d = j < segments.length - 1 ? getStart(segments[j + 1]) : getEnd(segments[j])

    const before = dist(a, b) + dist(c, d)
    const after = dist(a, getStart(segments[j])) + dist(getEnd(segments[i]), d)

    return after - before
}

/**
 * G-code 生成
 */
function handleGenerateGcode(payload, taskId) {
    reportProgress(taskId, 0, '開始生成 G-code...')

    const { pathData, printSettings, machineSettings } = payload
    // 這裡可以複製 postProcessor 的邏輯
    // 為了簡化，暫時返回佔位符

    reportProgress(taskId, 100, 'G-code 生成完成')
    reportComplete(taskId, { gcode: '; G-code generated by worker' })
}

/**
 * 時間與材料估算
 */
function handleEstimateTime(payload, taskId) {
    const { pathData, printSettings, machineSettings } = payload
    const { printSpeed = 60, travelSpeed = 200 } = printSettings || {}
    const nozzleDiameter = machineSettings?.nozzleDiameter || pathData.header?.nozzle_diameter || 10
    const layerHeight = pathData.header?.layer_height || 6

    let totalPrintDistance = 0
    let totalTravelDistance = 0

    for (const layer of pathData.layers) {
        for (const segment of layer.segments) {
            const points = segment.points
            for (let i = 0; i < points.length - 1; i++) {
                const dx = points[i + 1].x - points[i].x
                const dy = points[i + 1].y - points[i].y
                const dz = points[i + 1].z - points[i].z
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

                if (segment.type === 'travel') {
                    totalTravelDistance += dist
                } else if (segment.is_extruding) {
                    totalPrintDistance += dist
                }
            }
        }
    }

    // 轉換單位：cm -> mm
    const printDistanceMm = totalPrintDistance * 10
    const travelDistanceMm = totalTravelDistance * 10

    // 時間估算（秒）
    const printTime = printDistanceMm / printSpeed
    const travelTime = travelDistanceMm / travelSpeed
    const totalSeconds = printTime + travelTime

    // 材料估算
    // 擠出截面積 = 噴頭寬度 × 層高（矩形近似）
    const extrusionWidth = nozzleDiameter  // mm
    const extrusionHeight = layerHeight     // mm
    const crossSectionArea = extrusionWidth * extrusionHeight  // mm²

    // 體積 = 截面積 × 列印長度（mm³）
    const volumeMm3 = crossSectionArea * printDistanceMm
    const volumeCm3 = volumeMm3 / 1000  // cm³ = ml
    const volumeLiters = volumeCm3 / 1000  // L

    // 線材長度估算（假設圓形線材直徑 35mm，建築列印常用）
    const filamentDiameter = machineSettings?.filamentDiameter || 35  // mm
    const filamentRadius = filamentDiameter / 2
    const filamentCrossSection = Math.PI * filamentRadius * filamentRadius  // mm²
    const filamentLengthMm = volumeMm3 / filamentCrossSection
    const filamentLengthM = filamentLengthMm / 1000  // m

    reportComplete(taskId, {
        printDistance: (totalPrintDistance * 10).toFixed(1),  // mm
        travelDistance: (totalTravelDistance * 10).toFixed(1), // mm
        estimatedTime: {
            seconds: Math.round(totalSeconds),
            formatted: formatTime(totalSeconds)
        },
        material: {
            volumeMm3: Math.round(volumeMm3),
            volumeCm3: volumeCm3.toFixed(1),
            volumeLiters: volumeLiters.toFixed(3),
            filamentLengthMm: Math.round(filamentLengthMm),
            filamentLengthM: filamentLengthM.toFixed(2),
            // 假設混凝土密度 2.3 g/cm³
            weightKg: (volumeCm3 * 2.3 / 1000).toFixed(2)
        }
    })
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.round(seconds % 60)

    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}
