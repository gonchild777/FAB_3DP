/**
 * 接縫點優化器
 * 對封閉輪廓段落（起點 ≈ 終點），重新選擇起始點以：
 *   - 'nearest': 距上一段終點最近
 *   - 'corner': 曲率最大（接近 90° 轉角）
 *   - 'random': 隨機分散縫痕
 */
import { getStart, getEnd, dist2D, ORIGIN } from './common.js'

const CLOSURE_THRESHOLD = 0.5  // cm，起終點距離 < 此值視為封閉

function isClosed(seg) {
    return dist2D(getStart(seg), getEnd(seg)) < CLOSURE_THRESHOLD
}

/**
 * 旋轉 points 陣列使 startIdx 成為新的起點
 * 對封閉路徑，最後一點是原起點的重複，需特別處理
 */
function rotatePoints(points, startIdx) {
    if (startIdx === 0) return points
    const isLoopClosed = dist2D(points[0], points[points.length - 1]) < CLOSURE_THRESHOLD
    const body = isLoopClosed ? points.slice(0, -1) : points
    const rotated = [...body.slice(startIdx), ...body.slice(0, startIdx)]
    if (isLoopClosed) rotated.push({ ...rotated[0] })
    return rotated
}

function pickNearest(seg, refPoint) {
    let bestIdx = 0
    let bestDist = Infinity
    seg.points.forEach((p, i) => {
        const d = dist2D(p, refPoint)
        if (d < bestDist) { bestDist = d; bestIdx = i }
    })
    return bestIdx
}

function pickCorner(seg) {
    const isLoopClosed = isClosed(seg)
    const pts = isLoopClosed ? seg.points.slice(0, -1) : seg.points
    if (pts.length < 3) return 0

    let bestIdx = 0
    let bestScore = -Infinity  // 角度越接近 90° 分數越高

    for (let i = 0; i < pts.length; i++) {
        const prev = pts[(i - 1 + pts.length) % pts.length]
        const curr = pts[i]
        const next = pts[(i + 1) % pts.length]

        const v1x = curr.x - prev.x, v1y = curr.y - prev.y
        const v2x = next.x - curr.x, v2y = next.y - curr.y
        const l1 = Math.sqrt(v1x * v1x + v1y * v1y)
        const l2 = Math.sqrt(v2x * v2x + v2y * v2y)
        if (l1 < 1e-6 || l2 < 1e-6) continue

        const cos = (v1x * v2x + v1y * v2y) / (l1 * l2)
        // 1 - |cos|：直線=0，90°=1，180°(回頭)=0
        const score = 1 - Math.abs(cos)
        if (score > bestScore) { bestScore = score; bestIdx = i }
    }
    return bestIdx
}

function pickRandom(seg, rng) {
    const isLoopClosed = isClosed(seg)
    const len = isLoopClosed ? seg.points.length - 1 : seg.points.length
    return Math.floor(rng() * len)
}

export function optimizeSeams(segments, options = {}) {
    const mode = options.mode ?? 'nearest'
    const startPos = options.startPos ?? ORIGIN
    const rng = options.rng ?? Math.random

    const result = []
    let prevEnd = startPos

    for (const seg of segments) {
        if (!isClosed(seg) || seg.points.length < 4) {
            result.push(seg)
            prevEnd = getEnd(seg)
            continue
        }

        let startIdx = 0
        if (mode === 'nearest') startIdx = pickNearest(seg, prevEnd)
        else if (mode === 'corner') startIdx = pickCorner(seg)
        else if (mode === 'random') startIdx = pickRandom(seg, rng)

        const rotated = {
            ...seg,
            points: rotatePoints(seg.points, startIdx),
        }
        result.push(rotated)
        prevEnd = getEnd(rotated)
    }

    return result
}
