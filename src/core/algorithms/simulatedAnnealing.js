/**
 * Simulated Annealing 演算法
 * 隨機交換段落位置，依溫度機率接受較差解，逐漸冷卻
 * 適合跳出 2-opt / Or-opt 困住的局部最優
 */
import { totalTravelDistance, ORIGIN } from './common.js'

// 簡單種子隨機（每次優化結果可重現）
function makeRng(seed = 1234567) {
    let state = seed >>> 0
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 0xffffffff
    }
}

export function optimize(segments, options = {}) {
    const startPos = options.startPos ?? ORIGIN
    const initialTemp = options.initialTemp ?? 1000
    const coolingRate = options.coolingRate ?? 0.995
    const minTemp = options.minTemp ?? 1
    const maxIterations = options.maxIterations ?? 10000
    const onProgress = options.onProgress
    const rng = makeRng(options.seed ?? 42)

    if (segments.length <= 2) return [...segments]

    let current = [...segments]
    let currentCost = totalTravelDistance(current, startPos)
    let best = [...current]
    let bestCost = currentCost

    let temp = initialTemp
    let iter = 0

    while (temp > minTemp && iter < maxIterations) {
        // 兩種鄰域操作：swap 或 reverse
        const op = rng() < 0.5 ? 'swap' : 'reverse'
        const next = [...current]

        if (op === 'swap') {
            const i = Math.floor(rng() * next.length)
            let j = Math.floor(rng() * next.length)
            if (j === i) j = (j + 1) % next.length
            ;[next[i], next[j]] = [next[j], next[i]]
        } else {
            const i = Math.floor(rng() * (next.length - 1))
            const j = i + 1 + Math.floor(rng() * (next.length - i - 1))
            const reversed = []
            for (let k = j; k >= i; k--) {
                reversed.push({ ...next[k], points: [...next[k].points].reverse() })
            }
            for (let k = 0; k < reversed.length; k++) next[i + k] = reversed[k]
        }

        const nextCost = totalTravelDistance(next, startPos)
        const dE = nextCost - currentCost

        if (dE < 0 || rng() < Math.exp(-dE / temp)) {
            current = next
            currentCost = nextCost
            if (currentCost < bestCost) {
                best = [...current]
                bestCost = currentCost
            }
        }

        temp *= coolingRate
        iter++

        if (onProgress && iter % 500 === 0) {
            onProgress(iter / maxIterations, `SA iter ${iter}, temp=${temp.toFixed(1)}, best=${bestCost.toFixed(1)}`)
        }
    }

    return best
}
