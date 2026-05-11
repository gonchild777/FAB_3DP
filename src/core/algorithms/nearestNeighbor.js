/**
 * Nearest Neighbor 演算法
 * 貪心法：每次選擇離當前位置最近的未訪問段落
 */
import { getStart, getEnd, dist2D, ORIGIN } from './common.js'

export function optimize(segments, options = {}) {
    const startPos = options.startPos ?? ORIGIN
    if (segments.length <= 1) return [...segments]

    const result = []
    const remaining = [...segments]
    let currentPos = startPos

    while (remaining.length > 0) {
        let nearestIdx = 0
        let nearestDist = Infinity

        for (let i = 0; i < remaining.length; i++) {
            const d = dist2D(currentPos, getStart(remaining[i]))
            if (d < nearestDist) {
                nearestDist = d
                nearestIdx = i
            }
        }

        const nearest = remaining.splice(nearestIdx, 1)[0]
        result.push(nearest)
        currentPos = getEnd(nearest)
    }

    return result
}
