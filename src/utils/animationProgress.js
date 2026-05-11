/**
 * 動畫進度計算工具
 * 將 animation.progress (0-1) 映射為實際的 layer/segment/point 位置
 */

export function calculateTotalPoints(layers) {
    let total = 0
    for (const layer of layers) {
        for (const segment of layer.segments) {
            total += segment.points.length
        }
    }
    return total
}

export function calculateVisibleProgress(layers, progress, totalPoints) {
    const targetPointIndex = Math.floor(progress * totalPoints)
    let currentPointIndex = 0

    for (let li = 0; li < layers.length; li++) {
        const layer = layers[li]
        for (let si = 0; si < layer.segments.length; si++) {
            const segment = layer.segments[si]
            if (currentPointIndex + segment.points.length > targetPointIndex) {
                return {
                    layerIndex: li,
                    segmentIndex: si,
                    pointIndex: targetPointIndex - currentPointIndex,
                }
            }
            currentPointIndex += segment.points.length
        }
    }

    return { layerIndex: layers.length - 1, segmentIndex: -1, pointIndex: -1 }
}

/**
 * 從 visibleProgress 取得當前噴頭位置（內部 cm 座標）
 */
export function getNozzlePosition(layers, visibleProgress) {
    const { layerIndex, segmentIndex, pointIndex } = visibleProgress
    if (layerIndex < 0 || layerIndex >= layers.length) return null
    const layer = layers[layerIndex]
    if (!layer || segmentIndex < 0 || segmentIndex >= layer.segments.length) return null
    const segment = layer.segments[segmentIndex]
    if (pointIndex < 0 || pointIndex >= segment.points.length) return null
    return { ...segment.points[pointIndex], isTravel: segment.type === 'travel' }
}

/**
 * 取得當前 segment 累計索引（跨層計算）
 */
export function calculateSegmentCounts(layers, visibleProgress) {
    let totalSegments = 0
    for (const layer of layers) totalSegments += layer.segments.length

    let currentSegment = 0
    for (let li = 0; li < layers.length; li++) {
        if (li < visibleProgress.layerIndex) {
            currentSegment += layers[li].segments.length
        } else {
            currentSegment += Math.max(0, visibleProgress.segmentIndex)
            break
        }
    }
    return { currentSegment: currentSegment + 1, totalSegments }
}
