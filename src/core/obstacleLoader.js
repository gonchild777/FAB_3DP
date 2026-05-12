/**
 * 障礙物 STL / OBJ 載入器
 *
 * 輸出格式（統一）:
 * {
 *   vertices: Float32Array,   // [x,y,z, x,y,z, ...]，順序與 indices 對應
 *   indices: Uint32Array,     // [i0,i1,i2, ...]
 *   triangleCount: number,
 *   bbox: { min: [x,y,z], max: [x,y,z] },
 * }
 */

/* ─────────────  STL  ───────────── */

/**
 * 判斷 STL 是否為二進位格式（檢查前 80 byte 不含 'solid' + 大小符合 binary 規格）
 */
function isBinarySTL(buffer) {
    const view = new DataView(buffer)
    if (buffer.byteLength < 84) return false
    const triangleCount = view.getUint32(80, true)
    const expectedSize = 84 + triangleCount * 50
    if (buffer.byteLength === expectedSize) return true
    // 文字 STL 第一個 token 是 "solid"
    const header = new Uint8Array(buffer, 0, Math.min(80, buffer.byteLength))
    const text = String.fromCharCode(...header).trim().toLowerCase()
    return !text.startsWith('solid')
}

function parseBinarySTL(buffer) {
    const view = new DataView(buffer)
    const triangleCount = view.getUint32(80, true)
    const vertices = new Float32Array(triangleCount * 9)
    const indices = new Uint32Array(triangleCount * 3)

    let offset = 84
    let vIdx = 0
    let iIdx = 0
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]

    for (let i = 0; i < triangleCount; i++) {
        offset += 12  // skip normal
        for (let v = 0; v < 3; v++) {
            const x = view.getFloat32(offset, true); offset += 4
            const y = view.getFloat32(offset, true); offset += 4
            const z = view.getFloat32(offset, true); offset += 4
            vertices[vIdx++] = x
            vertices[vIdx++] = y
            vertices[vIdx++] = z
            indices[iIdx] = iIdx++
            if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x
            if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y
            if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z
        }
        offset += 2  // skip attribute
    }

    return { vertices, indices, triangleCount, bbox: { min, max } }
}

function parseAsciiSTL(text) {
    const verts = []
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    const vertexRegex = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g
    let m
    while ((m = vertexRegex.exec(text)) !== null) {
        const x = parseFloat(m[1])
        const y = parseFloat(m[2])
        const z = parseFloat(m[3])
        verts.push(x, y, z)
        if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x
        if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y
        if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z
    }
    const triangleCount = verts.length / 9
    const vertices = new Float32Array(verts)
    const indices = new Uint32Array(triangleCount * 3)
    for (let i = 0; i < indices.length; i++) indices[i] = i
    return { vertices, indices, triangleCount, bbox: { min, max } }
}

/**
 * 解析 STL（自動偵測 binary / ASCII）
 * @param {ArrayBuffer | string} input
 */
export function parseSTL(input) {
    if (typeof input === 'string') {
        return parseAsciiSTL(input)
    }
    if (isBinarySTL(input)) {
        return parseBinarySTL(input)
    }
    // 從 ArrayBuffer 轉為字串再走 ASCII
    const text = new TextDecoder('utf-8').decode(new Uint8Array(input))
    return parseAsciiSTL(text)
}

/* ─────────────  OBJ  ───────────── */

/**
 * 解析 OBJ（簡化版：只支援 v + f；忽略 vt, vn, group, material）
 * 支援的 face 格式：
 *   f 1 2 3
 *   f 1/2 3/4 5/6
 *   f 1/2/3 4/5/6 7/8/9
 *   f 1//3 4//6 7//9
 * 多邊形 face 會自動三角化（fan triangulation）
 */
export function parseOBJ(text) {
    const verts = []  // flat xyz
    const triangles = []  // flat 3 indices
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]

    const lines = text.split(/\r?\n/)
    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const tokens = line.split(/\s+/)
        const tag = tokens[0]

        if (tag === 'v') {
            const x = parseFloat(tokens[1])
            const y = parseFloat(tokens[2])
            const z = parseFloat(tokens[3])
            verts.push(x, y, z)
            if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x
            if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y
            if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z
        } else if (tag === 'f') {
            // 1-based indices；取 '/' 前的 vertex index
            const idxs = tokens.slice(1).map(t => {
                const n = parseInt(t.split('/')[0], 10)
                return n > 0 ? n - 1 : (verts.length / 3) + n  // 負值為相對索引
            })
            // Fan triangulation
            for (let i = 1; i < idxs.length - 1; i++) {
                triangles.push(idxs[0], idxs[i], idxs[i + 1])
            }
        }
    }

    // 展平頂點為 per-triangle 順序（與 STL 一致）
    const triangleCount = triangles.length / 3
    const vertices = new Float32Array(triangleCount * 9)
    const indices = new Uint32Array(triangleCount * 3)
    for (let t = 0; t < triangleCount; t++) {
        for (let v = 0; v < 3; v++) {
            const srcIdx = triangles[t * 3 + v]
            vertices[t * 9 + v * 3 + 0] = verts[srcIdx * 3 + 0]
            vertices[t * 9 + v * 3 + 1] = verts[srcIdx * 3 + 1]
            vertices[t * 9 + v * 3 + 2] = verts[srcIdx * 3 + 2]
            indices[t * 3 + v] = t * 3 + v
        }
    }

    return { vertices, indices, triangleCount, bbox: { min, max } }
}

/**
 * 自動偵測格式並解析
 * @param {File} file
 * @returns {Promise<object>}
 */
export async function loadObstacleFile(file) {
    const lowerName = file.name.toLowerCase()
    if (lowerName.endsWith('.stl')) {
        const buffer = await file.arrayBuffer()
        return parseSTL(buffer)
    } else if (lowerName.endsWith('.obj')) {
        const text = await file.text()
        return parseOBJ(text)
    } else {
        throw new Error('不支援的檔案格式（僅支援 .stl / .obj）')
    }
}
