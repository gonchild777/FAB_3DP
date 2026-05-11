/**
 * Or-opt 演算法
 * 將長度 k (1..maxK) 的連續子序列移到其他位置，若可縮短空移則套用
 *
 * 比 2-opt 互補：2-opt 修正交叉，Or-opt 修正「卡在錯位置」的段落
 */
import { getStart, getEnd, dist2D, ORIGIN } from './common.js'

function deltaRemove(segments, i, k, startPos) {
    const a = i > 0 ? getEnd(segments[i - 1]) : startPos
    const b = getStart(segments[i])
    const c = getEnd(segments[i + k - 1])
    const d = i + k < segments.length ? getStart(segments[i + k]) : null

    if (d === null) return -(dist2D(a, b))  // 子序列在尾端
    return dist2D(a, d) - dist2D(a, b) - dist2D(c, d)
}

function deltaInsert(segments, j, chainStart, chainEnd, startPos) {
    const prev = j > 0 ? getEnd(segments[j - 1]) : startPos
    const next = j < segments.length ? getStart(segments[j]) : null

    if (next === null) return dist2D(prev, chainStart)
    return dist2D(prev, chainStart) + dist2D(chainEnd, next) - dist2D(prev, next)
}

export function optimize(segments, options = {}) {
    const startPos = options.startPos ?? ORIGIN
    const maxK = options.maxK ?? 3
    const maxIterations = options.maxIterations ?? 50
    const epsilon = options.epsilon ?? 0.1

    if (segments.length <= 2) return [...segments]

    let current = [...segments]
    let improved = true
    let iterations = 0

    while (improved && iterations < maxIterations) {
        improved = false
        iterations++

        for (let k = 1; k <= Math.min(maxK, current.length - 1); k++) {
            for (let i = 0; i + k <= current.length; i++) {
                const chainStart = getStart(current[i])
                const chainEnd = getEnd(current[i + k - 1])

                const removeGain = deltaRemove(current, i, k, startPos)

                let bestJ = -1
                let bestTotalDelta = -epsilon

                // 嘗試所有插入位置（跳過原位置與其相鄰位置）
                for (let j = 0; j <= current.length - k; j++) {
                    if (j >= i && j <= i + k) continue  // 原位置區域
                    const targetIdx = j > i ? j + k : j
                    if (targetIdx === i || targetIdx === i + k) continue

                    const insertCost = deltaInsert(
                        current.filter((_, idx) => idx < i || idx >= i + k),
                        j > i ? j - k : j,
                        chainStart,
                        chainEnd,
                        startPos
                    )
                    const totalDelta = removeGain + insertCost

                    if (totalDelta < bestTotalDelta) {
                        bestTotalDelta = totalDelta
                        bestJ = j > i ? j - k : j
                    }
                }

                if (bestJ >= 0) {
                    const chain = current.slice(i, i + k)
                    const without = [...current.slice(0, i), ...current.slice(i + k)]
                    current = [...without.slice(0, bestJ), ...chain, ...without.slice(bestJ)]
                    improved = true
                    break  // 重新從頭開始（重要：索引已失效）
                }
            }
            if (improved) break
        }
    }

    return current
}
