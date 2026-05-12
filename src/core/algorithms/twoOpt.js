/**
 * 2-opt 演算法
 *
 * 預設模式：反轉子序列（標準 2-opt）— 會改變段落方向
 * preserveDirection=true：退化為「swap-only」— 僅交換兩段位置，不反轉內部 points
 */
import { getStart, getEnd, dist2D, ORIGIN } from './common.js'

function delta(segments, i, j, startPos) {
    const a = i > 0 ? getEnd(segments[i - 1]) : startPos
    const b = getStart(segments[i])
    const c = getEnd(segments[j])
    const d = j < segments.length - 1 ? getStart(segments[j + 1]) : c

    const beforeLen = dist2D(a, b) + dist2D(c, d)
    const afterLen = dist2D(a, getEnd(segments[j])) + dist2D(getStart(segments[i]), d)
    return afterLen - beforeLen
}

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

/**
 * swap-only delta：交換段落 i 和 j 的位置（不反轉內部）
 */
function deltaSwap(segments, i, j, startPos) {
    if (i === j) return 0
    const a = i > 0 ? getEnd(segments[i - 1]) : startPos
    const bi = segments[i], bj = segments[j]

    let before = dist2D(a, getStart(bi))
    let after = dist2D(a, getStart(bj))

    // 中間段落間距
    if (i + 1 <= j - 1) {
        before += dist2D(getEnd(bi), getStart(segments[i + 1]))
        before += dist2D(getEnd(segments[j - 1]), getStart(bj))
        after += dist2D(getEnd(bj), getStart(segments[i + 1]))
        after += dist2D(getEnd(segments[j - 1]), getStart(bi))
    } else if (j === i + 1) {
        // 相鄰
        before += dist2D(getEnd(bi), getStart(bj))
        after += dist2D(getEnd(bj), getStart(bi))
    }

    if (j < segments.length - 1) {
        before += dist2D(getEnd(bj), getStart(segments[j + 1]))
        after += dist2D(getEnd(bi), getStart(segments[j + 1]))
    }

    return after - before
}

function applySwap(segments, i, j) {
    const result = [...segments]
    ;[result[i], result[j]] = [result[j], result[i]]
    return result
}

export function optimize(segments, options = {}) {
    const startPos = options.startPos ?? ORIGIN
    const maxIterations = options.maxIterations ?? 100
    const epsilon = options.epsilon ?? 0.1
    const preserveDirection = options.preserveDirection ?? false

    if (segments.length <= 2) return [...segments]

    let current = [...segments]
    let improved = true
    let iterations = 0

    while (improved && iterations < maxIterations) {
        improved = false
        iterations++

        if (preserveDirection) {
            // Swap-only：交換兩段位置，不反轉
            for (let i = 0; i < current.length - 1; i++) {
                for (let j = i + 1; j < current.length; j++) {
                    const d = deltaSwap(current, i, j, startPos)
                    if (d < -epsilon) {
                        current = applySwap(current, i, j)
                        improved = true
                    }
                }
            }
        } else {
            // 標準 2-opt：反轉子序列
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
    }

    return current
}
