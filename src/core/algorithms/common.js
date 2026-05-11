/**
 * 演算法共用工具
 * 所有路徑優化演算法的輸入為「列印段陣列」（is_extruding=true 的段），
 * 輸出為重新排序後的相同陣列。
 */

export const ORIGIN = { x: 0, y: 0 }

export function getStart(seg) {
    return seg.points[0]
}

export function getEnd(seg) {
    return seg.points[seg.points.length - 1]
}

export function dist2D(a, b) {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
}

export function dist3D(a, b) {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = (a.z ?? 0) - (b.z ?? 0)
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * 計算段落序列的總空移距離（從原點起，每段起點到上段終點）
 */
export function totalTravelDistance(segments, startPos = ORIGIN) {
    if (segments.length === 0) return 0
    let total = dist2D(startPos, getStart(segments[0]))
    for (let i = 1; i < segments.length; i++) {
        total += dist2D(getEnd(segments[i - 1]), getStart(segments[i]))
    }
    return total
}

/**
 * 切分一層的 segments 為：列印段（保留排序資訊）與其他
 */
export function splitLayerSegments(layer) {
    const print = []
    const others = []
    for (const seg of layer.segments) {
        if (seg.type !== 'travel' && seg.is_extruding) print.push(seg)
        else others.push(seg)
    }
    return { print, others }
}

/**
 * 將排序後的列印段重建為含空移的完整 segments 陣列
 * 空移距離 < threshold 時不插入空移
 */
export function rebuildWithTravels(printSegments, startPos = ORIGIN, threshold = 0.01) {
    const result = []
    let currentPos = startPos
    let currentZ = printSegments[0]?.points[0]?.z ?? 0

    for (const seg of printSegments) {
        const start = getStart(seg)
        const segZ = start.z ?? currentZ
        const travelDist = dist2D(currentPos, start)

        if (travelDist > threshold) {
            result.push({
                type: 'travel',
                is_extruding: false,
                points: [
                    { x: currentPos.x, y: currentPos.y, z: segZ },
                    { x: start.x, y: start.y, z: segZ },
                ],
            })
        }

        result.push(seg)
        currentPos = getEnd(seg)
        currentZ = currentPos.z ?? currentZ
    }

    return result
}
