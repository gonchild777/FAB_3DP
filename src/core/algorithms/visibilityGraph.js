/**
 * Visibility Graph — 幾何約束空移
 *
 * 確保空移路徑全程在幾何體內部，不穿越外壁。
 *
 * 演算法流程：
 *   1. extractLayerPolygon: 從 layer 提取最外輪廓多邊形
 *   2. travelCrossesPolygon: 檢查直線空移是否穿越邊界
 *   3. buildVisibilityGraph: 建立節點兩兩可見的圖
 *   4. dijkstra: 圖上最短路徑
 *   5. rebuildTravelMoves: 將穿越邊界的空移替換為內部繞行路徑
 */
import { getStart, getEnd, dist2D } from './common.js'

const EPS = 1e-6
const INSET = 0.01  // 微縮邊界，避免線段恰好貼著邊緣被判定為穿越

/* ─────────────  基本幾何  ───────────── */

export function pointInPolygon(point, polygon) {
    const { x, y } = point
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y
        const xj = polygon[j].x, yj = polygon[j].y
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi + EPS) + xi)
        if (intersect) inside = !inside
    }
    return inside
}

/**
 * 兩線段是否「穿越」（嚴格相交，端點接觸不算）
 */
export function segmentsIntersect(p1, p2, p3, p4) {
    const d1 = orientation(p3, p4, p1)
    const d2 = orientation(p3, p4, p2)
    const d3 = orientation(p1, p2, p3)
    const d4 = orientation(p1, p2, p4)

    if (d1 !== d2 && d3 !== d4) return true
    return false
}

function orientation(p, q, r) {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)
    if (Math.abs(val) < EPS) return 0
    return val > 0 ? 1 : 2
}

/**
 * 空移直線是否穿越多邊形邊界
 * 將兩端微縮，避免端點貼在 polygon 頂點時被誤判
 */
export function travelCrossesPolygon(start, end, polygon) {
    const t = 0.001
    const a = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }
    const b = { x: end.x + (start.x - end.x) * t, y: end.y + (start.y - end.y) * t }
    for (let i = 0; i < polygon.length; i++) {
        const p3 = polygon[i]
        const p4 = polygon[(i + 1) % polygon.length]
        if (segmentsIntersect(a, b, p3, p4)) return true
    }
    return false
}

/**
 * 從一層的列印段中提取最外輪廓多邊形
 * 策略：找出最長的「近似封閉」列印段作為輪廓
 * 回傳 [{x, y}, ...] 或 null（無可用輪廓）
 */
export function extractLayerPolygon(layer) {
    if (!layer?.segments) return null

    let bestSeg = null
    let bestArea = 0

    for (const seg of layer.segments) {
        if (seg.type === 'travel' || !seg.is_extruding) continue
        if (seg.points.length < 4) continue

        const first = seg.points[0]
        const last = seg.points[seg.points.length - 1]
        const isClosed = dist2D(first, last) < 0.5
        if (!isClosed) continue

        // 用 shoelace 公式估面積
        const pts = seg.points.slice(0, -1)
        let area = 0
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i]
            const b = pts[(i + 1) % pts.length]
            area += (a.x * b.y - b.x * a.y)
        }
        area = Math.abs(area) / 2

        if (area > bestArea) {
            bestArea = area
            bestSeg = seg
        }
    }

    if (!bestSeg) return null

    // 移除尾端閉合點
    const polygon = bestSeg.points
        .slice(0, -1)
        .map(p => ({ x: p.x, y: p.y }))

    // 確保逆時針（pointInPolygon 不依賴方向，但統一較佳）
    return polygon
}

/* ─────────────  可視圖  ───────────── */

/**
 * 兩節點是否可見：連線在多邊形內且不穿越邊界
 */
function isVisible(a, b, polygon) {
    if (Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS) return true
    if (travelCrossesPolygon(a, b, polygon)) return false

    // 中點需在多邊形內（防止外凸區域被誤判）
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    return pointInPolygon(mid, polygon)
}

/**
 * 建立可視圖：節點 = 多邊形頂點 + 額外點（A、B）
 * 回傳 { nodes: [{x,y}], edges: Map<nodeIdx, [{to, dist}]> }
 */
export function buildVisibilityGraph(polygon, extraPoints = []) {
    const nodes = [...polygon, ...extraPoints]
    const edges = new Map()
    for (let i = 0; i < nodes.length; i++) edges.set(i, [])

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (isVisible(nodes[i], nodes[j], polygon)) {
                const d = dist2D(nodes[i], nodes[j])
                edges.get(i).push({ to: j, dist: d })
                edges.get(j).push({ to: i, dist: d })
            }
        }
    }

    return { nodes, edges }
}

/* ─────────────  Dijkstra  ───────────── */

export function dijkstra(graph, sourceIdx, targetIdx) {
    const { nodes, edges } = graph
    const n = nodes.length
    const distArr = new Array(n).fill(Infinity)
    const prev = new Array(n).fill(-1)
    const visited = new Array(n).fill(false)

    distArr[sourceIdx] = 0
    // 簡易實作：n 通常 < 200，O(n²) 足夠
    for (let iter = 0; iter < n; iter++) {
        let u = -1
        let minD = Infinity
        for (let i = 0; i < n; i++) {
            if (!visited[i] && distArr[i] < minD) { minD = distArr[i]; u = i }
        }
        if (u === -1) break
        if (u === targetIdx) break
        visited[u] = true

        for (const { to, dist } of edges.get(u)) {
            if (visited[to]) continue
            const nd = distArr[u] + dist
            if (nd < distArr[to]) {
                distArr[to] = nd
                prev[to] = u
            }
        }
    }

    if (distArr[targetIdx] === Infinity) return null

    // 回溯
    const path = []
    let cur = targetIdx
    while (cur !== -1) {
        path.unshift(nodes[cur])
        cur = prev[cur]
    }
    return path
}

/* ─────────────  主入口  ───────────── */

/**
 * 對一層的 segments 重建空移，使空移路徑保留在多邊形內部
 *
 * @param {object} layer  - 含 segments 的 layer
 * @param {object} options
 *   - enabled: boolean (預設 true)
 *   - fallbackToDirect: boolean - 多邊形無法提取時是否保留原空移 (預設 true)
 *
 * @returns {object} { segments: 新 segments, stats: { modified, kept, skipped } }
 */
export function rebuildTravelMoves(layer, options = {}) {
    const { enabled = true, fallbackToDirect = true } = options
    const stats = { modified: 0, kept: 0, skipped: 0 }

    if (!enabled || !layer?.segments) {
        return { segments: layer?.segments ?? [], stats }
    }

    const polygon = extractLayerPolygon(layer)
    if (!polygon || polygon.length < 3) {
        if (!fallbackToDirect) stats.skipped = layer.segments.filter(s => s.type === 'travel').length
        return { segments: layer.segments, stats }
    }

    const z = layer.z_height
    const newSegments = []

    for (let i = 0; i < layer.segments.length; i++) {
        const seg = layer.segments[i]

        if (seg.type !== 'travel') {
            newSegments.push(seg)
            continue
        }

        const start = getStart(seg)
        const end = getEnd(seg)

        // 起或終點不在多邊形內 → 無法保證內部繞行，保留原始
        if (!pointInPolygon(start, polygon) || !pointInPolygon(end, polygon)) {
            newSegments.push(seg)
            stats.skipped++
            continue
        }

        // 直線不穿越 → 保留原始
        if (!travelCrossesPolygon(start, end, polygon)) {
            newSegments.push(seg)
            stats.kept++
            continue
        }

        // 需繞行
        const graph = buildVisibilityGraph(polygon, [start, end])
        const sIdx = graph.nodes.length - 2
        const tIdx = graph.nodes.length - 1
        const path = dijkstra(graph, sIdx, tIdx)

        if (!path || path.length < 2) {
            newSegments.push(seg)
            stats.skipped++
            continue
        }

        // 替換為多點空移
        newSegments.push({
            type: 'travel',
            is_extruding: false,
            points: path.map(p => ({ x: p.x, y: p.y, z })),
        })
        stats.modified++
    }

    return { segments: newSegments, stats }
}
