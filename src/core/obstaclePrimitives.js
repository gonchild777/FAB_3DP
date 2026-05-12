/**
 * 障礙物原型幾何體
 * 生成與 obstacleLoader 同格式的 mesh：
 *   { vertices, indices, triangleCount, bbox }
 */

function makeMeshFromTriangles(triangles, bbox) {
    const triangleCount = triangles.length / 9
    const vertices = new Float32Array(triangles)
    const indices = new Uint32Array(triangleCount * 3)
    for (let i = 0; i < indices.length; i++) indices[i] = i
    return { vertices, indices, triangleCount, bbox }
}

/**
 * 長方體（軸對齊）
 * @param {object} opts - { width, depth, height, x=0, y=0, z=0 }
 *   座標為 box 中心；width=X、depth=Y、height=Z
 */
export function createBoxMesh({ width, depth, height, x = 0, y = 0, z = 0 }) {
    const hw = width / 2, hd = depth / 2, hh = height / 2
    // 8 個頂點（基於中心 + 偏移）
    const v = [
        [x - hw, y - hd, z - hh], // 0: -X-Y-Z
        [x + hw, y - hd, z - hh], // 1: +X-Y-Z
        [x + hw, y + hd, z - hh], // 2: +X+Y-Z
        [x - hw, y + hd, z - hh], // 3: -X+Y-Z
        [x - hw, y - hd, z + hh], // 4: -X-Y+Z
        [x + hw, y - hd, z + hh], // 5: +X-Y+Z
        [x + hw, y + hd, z + hh], // 6: +X+Y+Z
        [x - hw, y + hd, z + hh], // 7: -X+Y+Z
    ]
    const facesIdx = [
        [0, 2, 1], [0, 3, 2],   // bottom (-Z)
        [4, 5, 6], [4, 6, 7],   // top (+Z)
        [0, 1, 5], [0, 5, 4],   // front (-Y)
        [2, 3, 7], [2, 7, 6],   // back (+Y)
        [1, 2, 6], [1, 6, 5],   // right (+X)
        [3, 0, 4], [3, 4, 7],   // left (-X)
    ]
    const triangles = []
    for (const [a, b, c] of facesIdx) {
        triangles.push(...v[a], ...v[b], ...v[c])
    }
    return makeMeshFromTriangles(triangles, {
        min: [x - hw, y - hd, z - hh],
        max: [x + hw, y + hd, z + hh],
    })
}

/**
 * 圓柱（Z 軸方向）
 * @param {object} opts - { radius, height, x=0, y=0, z=0, segments=24 }
 */
export function createCylinderMesh({ radius, height, x = 0, y = 0, z = 0, segments = 24 }) {
    const hh = height / 2
    const zBot = z - hh
    const zTop = z + hh

    const triangles = []
    const ring = []
    for (let i = 0; i < segments; i++) {
        const t = (i / segments) * Math.PI * 2
        ring.push([x + Math.cos(t) * radius, y + Math.sin(t) * radius])
    }

    for (let i = 0; i < segments; i++) {
        const a = ring[i]
        const b = ring[(i + 1) % segments]
        // 側面（兩個三角形）
        triangles.push(a[0], a[1], zBot, b[0], b[1], zBot, b[0], b[1], zTop)
        triangles.push(a[0], a[1], zBot, b[0], b[1], zTop, a[0], a[1], zTop)
        // 底面
        triangles.push(x, y, zBot, b[0], b[1], zBot, a[0], a[1], zBot)
        // 頂面
        triangles.push(x, y, zTop, a[0], a[1], zTop, b[0], b[1], zTop)
    }

    return makeMeshFromTriangles(triangles, {
        min: [x - radius, y - radius, zBot],
        max: [x + radius, y + radius, zTop],
    })
}
