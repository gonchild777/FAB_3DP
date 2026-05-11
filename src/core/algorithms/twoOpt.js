/**
 * 2-opt 演算法
 * 反覆嘗試反轉段落子序列，若能縮短總空移距離則套用
 */
import { getStart, getEnd, dist2D, ORIGIN } from './common.js'

function delta(segments, i, j, startPos) {
    const a = i > 0 ? getEnd(segments[i - 1]) : startPos
    const b = getStart(segments[i])
    const c = getEnd(segments[j])
    const d = j < segments.length - 1 ? getStart(segments[j + 1]) : c

    // 注意：反轉子序列 [i..j] 後，段落的起點與終點也會互換
    // 因此 after 應使用反轉後段落的起終點
    const beforeLen = dist2D(a, b) + dist2D(c, d)
    const afterLen = dist2D(a, getEnd(segments[j])) + dist2D(getStart(segments[i]), d)
    return afterLen - beforeLen
}

/**
 * 反轉段落子序列：除了陣列順序反轉，每段內部的 points 也要反轉
 * （因為前一段的終點現在會接續到原本下一段的「終點」，所以該段需從原終點開始走）
 */
function reverseSubsequence(segments, i, j) {
    const reversed = []
    for (let k = j; k >= i; k--) {
        const seg = segments[k]
        reversed.push({
            ...seg,
            points: [...seg.points].reverse(),
        })
    }
    return [...segments.slice(0, i), ...reversed, ...segments.slice(j + 1)]
}

export function optimize(segments, options = {}) {
    const startPos = options.startPos ?? ORIGIN
    const maxIterations = options.maxIterations ?? 100
    const epsilon = options.epsilon ?? 0.1

    if (segments.length <= 2) return [...segments]

    let current = [...segments]
    let improved = true
    let iterations = 0

    while (improved && iterations < maxIterations) {
        improved = false
        iterations++

        for (let i = 0; i < current.length - 1; i++) {
            for (let j = i + 1; j < current.length; j++) {
                const d = delta(current, i, j, startPos)
                if (d < -epsilon) {
                    current = reverseSubsequence(current, i, j)
                    improved = true
                }
            }
        }
    }

    return current
}
