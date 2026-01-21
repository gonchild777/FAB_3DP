/**
 * 懸臂分析引擎
 * 分析每個點的懸臂角度（相對於下層最近點）
 */

/**
 * 計算兩點之間的 XY 平面距離
 */
function calculateXYDistance(p1, p2) {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 在下層點集中找到最近鄰點
 * @param {Object} point - 當前點 {x, y, z}
 * @param {Array} lowerLayerPoints - 下層所有點的陣列
 * @returns {Object} 最近點和距離
 */
function findNearestPoint(point, lowerLayerPoints) {
    if (!lowerLayerPoints || lowerLayerPoints.length === 0) {
        return { nearestPoint: null, distance: Infinity }
    }

    let minDistance = Infinity
    let nearestPoint = null

    for (const lowerPoint of lowerLayerPoints) {
        const distance = calculateXYDistance(point, lowerPoint)
        if (distance < minDistance) {
            minDistance = distance
            nearestPoint = lowerPoint
        }
    }

    return { nearestPoint, distance: minDistance }
}

/**
 * 收集指定圖層的所有點
 */
function collectLayerPoints(layer) {
    const points = []
    for (const segment of layer.segments) {
        // 只收集列印路徑的點（不包含空移）
        if (segment.type !== 'travel' && segment.is_extruding) {
            for (const point of segment.points) {
                points.push(point)
            }
        }
    }
    return points
}

/**
 * 計算懸臂角度
 * θ = arctan(ΔXY / ΔZ)
 * @param {number} xyDistance - XY 平面偏移距離
 * @param {number} zDistance - Z 軸高度差
 * @returns {number} 角度（度）
 */
function calculateOverhangAngle(xyDistance, zDistance) {
    if (zDistance <= 0) return 0
    const radians = Math.atan(xyDistance / zDistance)
    return radians * (180 / Math.PI)
}

/**
 * 分析整個路徑數據的懸臂情況
 * @param {Object} pathData - 路徑數據（包含 header 和 layers）
 * @returns {Object} 分析結果，包含每個點的懸臂角度
 */
export function analyzeOverhang(pathData) {
    if (!pathData || !pathData.layers || pathData.layers.length === 0) {
        return { pointAngles: [], maxAngle: 0, avgAngle: 0 }
    }

    const layerHeight = pathData.header?.layer_height || 6
    const layers = pathData.layers

    // 結果陣列：每個元素對應一個點的懸臂角度
    const pointAngles = []

    // 按 layer_index 排序圖層
    const sortedLayers = [...layers].sort((a, b) => a.layer_index - b.layer_index)

    // 緩存每層的點集
    const layerPointsCache = new Map()
    for (const layer of sortedLayers) {
        layerPointsCache.set(layer.layer_index, collectLayerPoints(layer))
    }

    // 分析每一層
    for (let i = 0; i < sortedLayers.length; i++) {
        const currentLayer = sortedLayers[i]
        const layerIndex = currentLayer.layer_index

        // 取得下層點集
        const lowerLayerIndex = layerIndex - 1
        const lowerLayerPoints = layerPointsCache.get(lowerLayerIndex) || []

        // 遍歷當前層的每個段落
        for (const segment of currentLayer.segments) {
            if (segment.type === 'travel') {
                // 空移路徑的點角度設為 -1（不計算）
                for (const point of segment.points) {
                    pointAngles.push({
                        ...point,
                        layerIndex,
                        angle: -1, // 標記為空移
                        isTravel: true
                    })
                }
                continue
            }

            // 列印路徑
            for (const point of segment.points) {
                let angle = 0

                if (layerIndex === 0) {
                    // 底層（第一層）角度為 0
                    angle = 0
                } else if (lowerLayerPoints.length === 0) {
                    // 下層無點，完全懸空
                    angle = 90
                } else {
                    // 找下層最近點
                    const { distance } = findNearestPoint(point, lowerLayerPoints)
                    // 計算懸臂角度
                    angle = calculateOverhangAngle(distance, layerHeight)
                }

                pointAngles.push({
                    ...point,
                    layerIndex,
                    angle: Math.min(angle, 90), // 限制最大 90 度
                    isTravel: false
                })
            }
        }
    }

    // 計算統計數據
    const printingAngles = pointAngles.filter(p => !p.isTravel).map(p => p.angle)
    const maxAngle = printingAngles.length > 0 ? Math.max(...printingAngles) : 0
    const avgAngle = printingAngles.length > 0
        ? printingAngles.reduce((a, b) => a + b, 0) / printingAngles.length
        : 0

    // 統計各風險等級的點數
    const stats = {
        safe: printingAngles.filter(a => a <= 30).length,           // 0-30°: 安全
        warning: printingAngles.filter(a => a > 30 && a <= 45).length, // 30-45°: 警告
        danger: printingAngles.filter(a => a > 45 && a <= 70).length,  // 45-70°: 危險
        critical: printingAngles.filter(a => a > 70).length           // >70°: 嚴重
    }

    return {
        pointAngles,
        maxAngle: Math.round(maxAngle * 10) / 10,
        avgAngle: Math.round(avgAngle * 10) / 10,
        totalPoints: printingAngles.length,
        stats
    }
}

/**
 * 根據角度返回顏色
 * @param {number} angle - 懸臂角度
 * @returns {string} 十六進制顏色
 */
export function getOverhangColor(angle) {
    if (angle < 0) return '#808080'  // 空移：灰色
    if (angle <= 30) return '#22c55e' // 安全：綠色
    if (angle <= 45) return '#eab308' // 警告：黃色
    if (angle <= 70) return '#f97316' // 危險：橘色
    return '#ef4444'                  // 嚴重：紅色
}

/**
 * 根據角度返回 Three.js 顏色值 (0-1 範圍)
 */
export function getOverhangColorRGB(angle) {
    if (angle < 0) return { r: 0.5, g: 0.5, b: 0.5 }   // 灰色
    if (angle <= 30) return { r: 0.13, g: 0.77, b: 0.37 } // 綠色
    if (angle <= 45) return { r: 0.92, g: 0.7, b: 0.03 }  // 黃色
    if (angle <= 70) return { r: 0.98, g: 0.45, b: 0.09 } // 橘色
    return { r: 0.94, g: 0.27, b: 0.27 }                   // 紅色
}
