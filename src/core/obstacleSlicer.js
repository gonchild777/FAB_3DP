/**
 * 網格切層器
 * 在給定 z 高度切割 mesh，回傳該層的 2D 多邊形（XY 平面）
 *
 * 演算法：
 *   1. 對每個三角形，找出與水平面 z=Z 的交線（線段）
 *   2. 將所有線段連接成封閉多邊形（鏈接演算法）
 *   3. 回傳 polygon 陣列（一個 mesh 可能切出多個分離的多邊形）
 */

const EPS = 1e-6

/**
 * 三角形與水平面 z=Z 的交線
 * 回傳 [{x, y}, {x, y}] 或 null
 */
function triangleIntersectPlane(v0, v1, v2, planeZ) {
    const d0 = v0[2] - planeZ
    const d1 = v1[2] - planeZ
    const d2 = v2[2] - planeZ

    // 全部在同側 → 不相交
    if ((d0 > EPS && d1 > EPS && d2 > EPS) || (d0 < -EPS && d1 < -EPS && d2 < -EPS)) {
        return null
    }
    // 全部在平面上 → 退化情況跳過
    if (Math.abs(d0) < EPS && Math.abs(d1) < EPS && Math.abs(d2) < EPS) {
        return null
    }

    const pts = []
    const checkEdge = (a, b, da, db) => {
        if ((da > EPS && db < -EPS) || (da < -EPS && db > EPS)) {
            const t = da / (da - db)
            pts.push({
                x: a[0] + (b[0] - a[0]) * t,
                y: a[1] + (b[1] - a[1]) * t,
            })
        } else if (Math.abs(da) < EPS) {
            pts.push({ x: a[0], y: a[1] })
        }
    }

    checkEdge(v0, v1, d0, d1)
    checkEdge(v1, v2, d1, d2)
    checkEdge(v2, v0, d2, d0)

    if (pts.length < 2) return null
    // 去重（兩點重合時退化）
    if (Math.abs(pts[0].x - pts[1].x) < EPS && Math.abs(pts[0].y - pts[1].y) < EPS) return null
    return [pts[0], pts[1]]
}

/**
 * 將線段連接成多邊形
 * 採用簡化鏈接：以端點配對（距離 < tol）連接
 */
function chainSegmentsToPolygons(segments, tol = 0.01) {
    const remaining = segments.map(s => [{ ...s[0] }, { ...s[1] }])
    const polygons = []

    while (remaining.length > 0) {
        const chain = remaining.shift()
        let extended = true

        while (extended) {
            extended = false
            const tail = chain[chain.length - 1]
            const head = chain[0]

            for (let i = 0; i < remaining.length; i++) {
                const seg = remaining[i]
                // tail-start: 直接接
                if (Math.abs(seg[0].x - tail.x) < tol && Math.abs(seg[0].y - tail.y) < tol) {
                    chain.push(seg[1])
                    remaining.splice(i, 1)
                    extended = true
                    break
                }
                // tail-end: 反向接
                if (Math.abs(seg[1].x - tail.x) < tol && Math.abs(seg[1].y - tail.y) < tol) {
                    chain.push(seg[0])
                    remaining.splice(i, 1)
                    extended = true
                    break
                }
                // head-end: 接到頭部
                if (Math.abs(seg[1].x - head.x) < tol && Math.abs(seg[1].y - head.y) < tol) {
                    chain.unshift(seg[0])
                    remaining.splice(i, 1)
                    extended = true
                    break
                }
                // head-start: 反向接到頭部
                if (Math.abs(seg[0].x - head.x) < tol && Math.abs(seg[0].y - head.y) < tol) {
                    chain.unshift(seg[1])
                    remaining.splice(i, 1)
                    extended = true
                    break
                }
            }
        }

        // 至少 3 點才算多邊形
        if (chain.length >= 3) {
            // 若首尾重合，移除尾端重複點
            const first = chain[0]
            const last = chain[chain.length - 1]
            if (Math.abs(first.x - last.x) < tol && Math.abs(first.y - last.y) < tol) {
                chain.pop()
            }
            if (chain.length >= 3) polygons.push(chain)
        }
    }

    return polygons
}

/**
 * 切割 mesh 在 z 高度，回傳 2D 多邊形陣列
 * @param {object} mesh - { vertices: Float32Array, indices: Uint32Array, triangleCount }
 * @param {number} z - 切割高度（mesh 原始座標）
 * @returns {Array<Array<{x, y}>>} 多邊形陣列
 */
export function sliceMeshAtZ(mesh, z) {
    const { vertices, indices, triangleCount } = mesh
    const segments = []

    for (let t = 0; t < triangleCount; t++) {
        const i0 = indices[t * 3 + 0] * 3
        const i1 = indices[t * 3 + 1] * 3
        const i2 = indices[t * 3 + 2] * 3
        const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]]
        const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]]
        const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]]

        const seg = triangleIntersectPlane(v0, v1, v2, z)
        if (seg) segments.push(seg)
    }

    return chainSegmentsToPolygons(segments)
}

/**
 * 將座標縮放（給單位轉換用）
 */
export function scaleMesh(mesh, scale) {
    if (scale === 1) return mesh
    const vertices = new Float32Array(mesh.vertices.length)
    for (let i = 0; i < vertices.length; i++) vertices[i] = mesh.vertices[i] * scale
    return {
        ...mesh,
        vertices,
        bbox: {
            min: mesh.bbox.min.map(v => v * scale),
            max: mesh.bbox.max.map(v => v * scale),
        },
    }
}

/**
 * 為 pathData 的每一層計算所有障礙物的切片
 * @param {Array} obstacles - 障礙物陣列
 * @param {Array} layers - pathData.layers
 * @returns {Map<number, Array<Polygon>>} layer_index → polygon 列表
 */
export function sliceAllObstaclesPerLayer(obstacles, layers) {
    const result = new Map()
    if (!obstacles || obstacles.length === 0) return result

    for (const layer of layers) {
        const polys = []
        for (const obs of obstacles) {
            if (!obs.visible && obs.visible !== undefined) continue
            const slices = sliceMeshAtZ(obs, layer.z_height)
            for (const s of slices) polys.push(s)
        }
        if (polys.length > 0) result.set(layer.layer_index, polys)
    }
    return result
}
