/**
 * 段落方向反轉
 * 對每段落比較正向/反向到上段終點的距離，反轉可縮短空移者
 * 不適用封閉輪廓（反向後仍從同點開始）
 */
import { getStart, getEnd, dist2D, ORIGIN } from './common.js'

const CLOSURE_THRESHOLD = 0.5

function isClosed(seg) {
    return dist2D(getStart(seg), getEnd(seg)) < CLOSURE_THRESHOLD
}

export function optimize(segments, options = {}) {
    const startPos = options.startPos ?? ORIGIN
    if (segments.length === 0) return []

    const result = []
    let prevEnd = startPos

    for (const seg of segments) {
        if (isClosed(seg)) {
            result.push(seg)
            prevEnd = getEnd(seg)
            continue
        }

        const dForward = dist2D(prevEnd, getStart(seg))
        const dReversed = dist2D(prevEnd, getEnd(seg))

        if (dReversed < dForward) {
            const reversed = {
                ...seg,
                points: [...seg.points].reverse(),
            }
            result.push(reversed)
            prevEnd = getEnd(reversed)
        } else {
            result.push(seg)
            prevEnd = getEnd(seg)
        }
    }

    return result
}
