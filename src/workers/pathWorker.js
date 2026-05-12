/**
 * 路徑處理 Web Worker
 * 處理耗時運算：JSON 解析、懸臂分析、G-code 生成、路徑優化
 */

import { optimize as nnOptimize } from '../core/algorithms/nearestNeighbor.js'
import { optimize as twoOptOptimize } from '../core/algorithms/twoOpt.js'
import { optimize as orOptOptimize } from '../core/algorithms/orOpt.js'
import { optimize as saOptimize } from '../core/algorithms/simulatedAnnealing.js'
import { optimizeSeams } from '../core/algorithms/seamOptimizer.js'
import { optimize as reversalOptimize } from '../core/algorithms/segmentReversal.js'
import { rebuildTravelMoves } from '../core/algorithms/visibilityGraph.js'
import { splitLayerSegments, rebuildWithTravels, totalTravelDistance, ORIGIN } from '../core/algorithms/common.js'

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
        self.postMessage({ type: 'ERROR', taskId, error: error.message })
    }
}

function reportProgress(taskId, progress, message = '') {
    self.postMessage({ type: 'PROGRESS', taskId, progress, message })
}

function reportComplete(taskId, result) {
    self.postMessage({ type: 'COMPLETE', taskId, result })
}

/**
 * 解析 JSON 數據
 */
function handleParseJson(payload, taskId) {
    reportProgress(taskId, 0, '開始解析 JSON...')
    const { jsonString } = payload
    const data = JSON.parse(jsonString)
    reportProgress(taskId, 50, '驗證數據結構...')

    if (!data.header || !data.layers) {
        throw new Error('無效的 JSON 格式：缺少 header 或 layers')
    }

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
        stats: { totalLayers: data.layers.length, totalSegments, totalPoints }
    })
}

/**
 * 懸臂分析
 */
function handleAnalyzeOverhang(payload, taskId) {
    const { pathData } = payload
    if (!pathData || !pathData.layers) throw new Error('無效的路徑數據')

    const layerHeight = pathData.header?.layer_height || 6
    const layers = pathData.layers
    const sortedLayers = [...layers].sort((a, b) => a.layer_index - b.layer_index)

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
 * 路徑優化（演算法管線）
 *
 * payload.options:
 *   sortAlgorithm: 'nn' | 'nn_2opt' | 'nn_oropt' | 'sa' | 'none'
 *   useReversal: boolean
 *   useSeam: boolean
 *   seamMode: 'nearest' | 'corner' | 'random'
 *   useVisibilityGraph: boolean
 *
 * 向下相容：若收到 { mode, apply2opt }（舊版），轉換為新格式
 */
function handleOptimizePath(payload, taskId) {
    const { pathData } = payload
    let options = payload.options || {}

    // 舊版相容
    if (options.mode || 'apply2opt' in options) {
        options = {
            sortAlgorithm: options.apply2opt ? 'nn_2opt' : 'nn',
            useReversal: false,
            useSeam: false,
            useVisibilityGraph: false,
        }
    }

    const {
        sortAlgorithm = 'nn_2opt',
        useReversal = false,
        useSeam = false,
        seamMode = 'nearest',
        useVisibilityGraph = false,
        preserveDirection = false,  // G-code 模式自動為 true，禁用會改變方向/接縫的操作
    } = options

    reportProgress(taskId, 0, '開始路徑優化...')

    // G-code 保留模式：強制關閉會修改段落內容的算法
    const effectiveUseReversal = useReversal && !preserveDirection
    const effectiveUseSeam = useSeam && !preserveDirection

    const optimizedData = JSON.parse(JSON.stringify(pathData))
    let totalOriginalDistance = 0
    let totalOptimizedDistance = 0
    const visibilityStats = { modified: 0, kept: 0, skipped: 0 }

    const totalLayers = optimizedData.layers.length

    for (let li = 0; li < totalLayers; li++) {
        const layer = optimizedData.layers[li]
        const { print: printSegments } = splitLayerSegments(layer)
        if (printSegments.length === 0) continue

        // 起點：layer 第一段的第一點（簡化處理，視覺上從上層終點開始也可接受）
        const startPos = ORIGIN
        totalOriginalDistance += totalTravelDistance(printSegments, startPos)

        // ─── Pipeline ───
        let result = printSegments

        // 1. 排序
        if (sortAlgorithm === 'nn') {
            result = nnOptimize(result, { startPos })
        } else if (sortAlgorithm === 'nn_2opt') {
            result = nnOptimize(result, { startPos })
            result = twoOptOptimize(result, { startPos, preserveDirection })
        } else if (sortAlgorithm === 'nn_oropt') {
            result = nnOptimize(result, { startPos })
            result = orOptOptimize(result, { startPos })
        } else if (sortAlgorithm === 'sa') {
            result = nnOptimize(result, { startPos })
            result = saOptimize(result, {
                startPos,
                maxIterations: 5000,
                preserveDirection,
                onProgress: (pct, msg) => {
                    const layerPct = Math.round((li / totalLayers) * 100 + (pct * 100 / totalLayers))
                    reportProgress(taskId, layerPct, `SA L${li + 1}/${totalLayers}: ${msg}`)
                }
            })
        }

        // 2. 段落方向反轉（封閉輪廓自動跳過；G-code 模式停用）
        if (effectiveUseReversal) {
            result = reversalOptimize(result, { startPos })
        }

        // 3. 接縫優化（G-code 模式停用）
        if (effectiveUseSeam) {
            result = optimizeSeams(result, { mode: seamMode, startPos })
        }

        totalOptimizedDistance += totalTravelDistance(result, startPos)

        // 4. 重建含空移的 segments
        let newSegments = rebuildWithTravels(result, startPos)

        // 5. Visibility Graph：在重建空移後再做幾何約束
        if (useVisibilityGraph) {
            const tmpLayer = { ...layer, segments: newSegments }
            const vgResult = rebuildTravelMoves(tmpLayer, { enabled: true, fallbackToDirect: true })
            newSegments = vgResult.segments
            visibilityStats.modified += vgResult.stats.modified
            visibilityStats.kept += vgResult.stats.kept
            visibilityStats.skipped += vgResult.stats.skipped
        }

        layer.segments = newSegments

        reportProgress(taskId, Math.round(((li + 1) / totalLayers) * 100), `優化圖層 ${li + 1}/${totalLayers}`)
    }

    const improvement = totalOriginalDistance > 0
        ? ((totalOriginalDistance - totalOptimizedDistance) / totalOriginalDistance * 100).toFixed(1)
        : '0'

    reportComplete(taskId, {
        optimizedData,
        stats: {
            originalTravelDistance: totalOriginalDistance.toFixed(1),
            optimizedTravelDistance: totalOptimizedDistance.toFixed(1),
            improvement: `${improvement}%`,
            algorithmsUsed: {
                sortAlgorithm,
                useReversal: effectiveUseReversal,
                useSeam: effectiveUseSeam,
                seamMode: effectiveUseSeam ? seamMode : null,
                useVisibilityGraph,
                preserveDirection,
            },
            visibilityGraph: useVisibilityGraph ? visibilityStats : null,
        }
    })
}

/**
 * G-code 生成（佔位）
 */
function handleGenerateGcode(payload, taskId) {
    reportProgress(taskId, 0, '開始生成 G-code...')
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

                if (segment.type === 'travel') totalTravelDistance += dist
                else if (segment.is_extruding) totalPrintDistance += dist
            }
        }
    }

    const printDistanceMm = totalPrintDistance * 10
    const travelDistanceMm = totalTravelDistance * 10
    const printTime = printDistanceMm / printSpeed
    const travelTime = travelDistanceMm / travelSpeed
    const totalSeconds = printTime + travelTime

    const extrusionWidth = nozzleDiameter
    const extrusionHeight = layerHeight
    const crossSectionArea = extrusionWidth * extrusionHeight
    const volumeMm3 = crossSectionArea * printDistanceMm
    const volumeCm3 = volumeMm3 / 1000
    const volumeLiters = volumeCm3 / 1000

    const filamentDiameter = machineSettings?.filamentDiameter || 35
    const filamentRadius = filamentDiameter / 2
    const filamentCrossSection = Math.PI * filamentRadius * filamentRadius
    const filamentLengthMm = volumeMm3 / filamentCrossSection
    const filamentLengthM = filamentLengthMm / 1000

    reportComplete(taskId, {
        printDistance: (totalPrintDistance * 10).toFixed(1),
        travelDistance: (totalTravelDistance * 10).toFixed(1),
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
