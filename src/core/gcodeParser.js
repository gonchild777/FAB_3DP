/**
 * G-code Parser
 * 將 .gcode 檔案解析為與 JSON pathData 完全相容的內部格式
 *
 * 輸出格式：
 * {
 *   header: { project_name, nozzle_diameter, layer_height, machine_flavor },
 *   layers: [{ layer_index, z_height, segments: [{ type, is_extruding, points: [{x,y,z}] }] }]
 * }
 *
 * 支援指令：G0 / G1 / G90 / G91 / G92 / M82 / M83
 * 支援層偵測：;LAYER:n、;LAYER_CHANGE、Z 變化
 * 支援自動單位偵測：若最大座標 > 500 視為 mm，轉換為 cm
 */

const EPS = 1e-6

function parseTokenValue(token) {
    return parseFloat(token.slice(1))
}

function pointsEqual(p1, p2) {
    return Math.abs(p1.x - p2.x) < EPS &&
        Math.abs(p1.y - p2.y) < EPS &&
        Math.abs(p1.z - p2.z) < EPS
}

/**
 * 解析 G-code 字串為內部 pathData 格式
 * @param {string} gcodeString
 * @param {object} options
 *   - fileName: 用於 header.project_name
 *   - unit: 'auto' | 'mm' | 'cm'（預設 auto）
 * @returns {object | null} pathData 或 null（解析失敗）
 */
export function parseGcode(gcodeString, options = {}) {
    const { fileName = 'Imported G-code', unit = 'auto' } = options

    if (!gcodeString || typeof gcodeString !== 'string') return null

    const lines = gcodeString.split(/\r?\n/)

    // 機器狀態
    let pos = { x: 0, y: 0, z: 0 }
    let eValue = 0
    let lastPrintE = 0
    let absoluteMode = true
    let absoluteExtrusion = true

    // 解析結果
    const layers = []
    let currentLayer = null
    let currentSegment = null
    let layerIndexCounter = 0
    let hasExplicitLayerMarker = false

    // 中繼資料
    const meta = {
        projectName: deriveProjectName(fileName),
        nozzleDiameter: null,
        layerHeight: null,
        machineFlavor: null,
    }

    const ensureLayer = (z) => {
        if (currentLayer && Math.abs(currentLayer.z_height - z) < EPS) return currentLayer
        // 關閉舊段落
        currentSegment = null
        const newLayer = {
            layer_index: layerIndexCounter++,
            z_height: z,
            segments: [],
        }
        layers.push(newLayer)
        currentLayer = newLayer
        return newLayer
    }

    const startSegment = (type, isExtruding, startPoint) => {
        currentSegment = {
            type,
            is_extruding: isExtruding,
            points: [{ ...startPoint }],
        }
        currentLayer.segments.push(currentSegment)
    }

    const addPointToSegment = (point, type, isExtruding) => {
        if (!currentLayer) ensureLayer(point.z)

        const needNewSegment = !currentSegment ||
            currentSegment.type !== type ||
            currentSegment.is_extruding !== isExtruding

        if (needNewSegment) {
            startSegment(type, isExtruding, pos)
        }

        // 避免重複點（同位置不重複加入）
        const last = currentSegment.points[currentSegment.points.length - 1]
        if (!pointsEqual(last, point)) {
            currentSegment.points.push({ ...point })
        }
    }

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line) continue

        // 純註解行
        if (line.startsWith(';')) {
            handleCommentLine(line, meta, () => {
                hasExplicitLayerMarker = true
                // 註解觸發層切換時，下一個移動指令會建立新層
                // 強制下次 ensureLayer 創新層：將 currentLayer 設為 null
                currentLayer = null
                currentSegment = null
            })
            continue
        }

        // 去除行尾註解
        const codePart = line.split(';')[0].trim()
        if (!codePart) continue

        const tokens = codePart.split(/\s+/)
        const cmd = tokens[0].toUpperCase()

        // 模式設定
        if (cmd === 'G90') { absoluteMode = true; continue }
        if (cmd === 'G91') { absoluteMode = false; continue }
        if (cmd === 'M82') { absoluteExtrusion = true; continue }
        if (cmd === 'M83') { absoluteExtrusion = false; continue }

        // 座標重置
        if (cmd === 'G92') {
            for (let i = 1; i < tokens.length; i++) {
                const tok = tokens[i]
                const axis = tok[0].toUpperCase()
                const val = parseTokenValue(tok)
                if (Number.isNaN(val)) continue
                if (axis === 'E') { eValue = val; lastPrintE = val }
                else if (axis === 'X') pos.x = val
                else if (axis === 'Y') pos.y = val
                else if (axis === 'Z') pos.z = val
            }
            continue
        }

        // 移動指令
        if (cmd === 'G0' || cmd === 'G1') {
            const next = { x: pos.x, y: pos.y, z: pos.z }
            let nextE = eValue
            let hasE = false
            let hasXYZ = false

            for (let i = 1; i < tokens.length; i++) {
                const tok = tokens[i]
                const axis = tok[0].toUpperCase()
                const val = parseTokenValue(tok)
                if (Number.isNaN(val)) continue
                if (axis === 'X') { next.x = absoluteMode ? val : pos.x + val; hasXYZ = true }
                else if (axis === 'Y') { next.y = absoluteMode ? val : pos.y + val; hasXYZ = true }
                else if (axis === 'Z') { next.z = absoluteMode ? val : pos.z + val; hasXYZ = true }
                else if (axis === 'E') {
                    nextE = absoluteExtrusion ? val : eValue + val
                    hasE = true
                }
            }

            // 純擠出/回抽（無位置變化）→ 跳過，只更新狀態
            if (!hasXYZ) {
                if (hasE) eValue = nextE
                continue
            }

            const eDelta = hasE ? nextE - lastPrintE : 0
            const isExtruding = cmd === 'G1' && hasE && eDelta > EPS

            // Z 變化偵測新層（無顯式 LAYER 標記時）
            const zChanged = Math.abs(next.z - pos.z) > EPS
            if (zChanged && !hasExplicitLayerMarker) {
                currentLayer = null
                currentSegment = null
            }

            // 確保有 layer
            if (!currentLayer) ensureLayer(next.z)
            // 若顯式標記產生空 layer，使用此 z
            else if (currentLayer.segments.length === 0 && Math.abs(currentLayer.z_height - next.z) > EPS) {
                currentLayer.z_height = next.z
            }

            const segType = isExtruding ? 'printing' : 'travel'
            addPointToSegment(next, segType, isExtruding)

            pos = next
            eValue = nextE
            if (isExtruding) lastPrintE = nextE
            else if (hasE) lastPrintE = nextE  // 回抽後同步基準
        }
    }

    // 過濾空層
    const validLayers = layers.filter((l) => l.segments.length > 0)
    if (validLayers.length === 0) return null

    // 重新指派 layer_index 以保證連續
    validLayers.forEach((l, idx) => { l.layer_index = idx })

    // 自動單位偵測與轉換
    const { scale, detectedUnit } = resolveUnitScale(validLayers, unit)
    if (scale !== 1) applyScale(validLayers, scale)

    // layer_height 須與座標同單位（cm）
    // 註解中的值通常是 mm，scale != 1 時一併換算
    const layerHeight = meta.layerHeight != null
        ? meta.layerHeight * scale
        : (inferLayerHeight(validLayers) ?? 4)

    return {
        header: {
            project_name: meta.projectName,
            nozzle_diameter: meta.nozzleDiameter ?? 10,
            layer_height: layerHeight,
            machine_flavor: meta.machineFlavor ?? 'Imported',
            source_unit: detectedUnit,
        },
        layers: validLayers,
    }
}

/**
 * 處理註解行：偵測層標記與中繼資料
 */
function handleCommentLine(line, meta, onLayerMarker) {
    // 層標記：;LAYER:0、;LAYER 0、;Layer:0
    const layerMatch = line.match(/^;\s*LAYER[:\s]+(\d+)/i)
    if (layerMatch) {
        onLayerMarker(parseInt(layerMatch[1], 10))
        return
    }

    // PrusaSlicer ;LAYER_CHANGE
    if (/^;\s*LAYER_CHANGE/i.test(line)) {
        onLayerMarker(null)
        return
    }

    // 中繼資料解析
    const nozzleMatch = line.match(/nozzle[_ ]?diameter\s*[=:]\s*([\d.]+)/i)
    if (nozzleMatch && meta.nozzleDiameter === null) {
        meta.nozzleDiameter = parseFloat(nozzleMatch[1])
        return
    }

    const layerHeightMatch = line.match(/layer[_ ]?height\s*[=:]\s*([\d.]+)/i)
    if (layerHeightMatch && meta.layerHeight === null) {
        meta.layerHeight = parseFloat(layerHeightMatch[1])
        return
    }

    const flavorMatch = line.match(/flavor\s*[=:]\s*(\w+)/i)
    if (flavorMatch && meta.machineFlavor === null) {
        meta.machineFlavor = flavorMatch[1]
        return
    }

    const generatedMatch = line.match(/(?:generated by|generator)\s*[=:]?\s*(.+)/i)
    if (generatedMatch && meta.machineFlavor === null) {
        meta.machineFlavor = generatedMatch[1].trim().split(/\s+/)[0]
    }
}

/**
 * 自動偵測單位：若最大座標 > 500 視為 mm
 */
function resolveUnitScale(layers, unitOption) {
    if (unitOption === 'cm') return { scale: 1, detectedUnit: 'cm' }
    if (unitOption === 'mm') return { scale: 0.1, detectedUnit: 'mm' }

    let maxCoord = 0
    for (const layer of layers) {
        for (const seg of layer.segments) {
            for (const p of seg.points) {
                const m = Math.max(Math.abs(p.x), Math.abs(p.y))
                if (m > maxCoord) maxCoord = m
            }
        }
    }

    if (maxCoord > 500) return { scale: 0.1, detectedUnit: 'mm' }
    return { scale: 1, detectedUnit: 'cm' }
}

function applyScale(layers, scale) {
    for (const layer of layers) {
        layer.z_height *= scale
        for (const seg of layer.segments) {
            for (const p of seg.points) {
                p.x *= scale
                p.y *= scale
                p.z *= scale
            }
        }
    }
}

/**
 * 自動推算 layer_height：取相鄰層 Z 差的中位數
 */
function inferLayerHeight(layers) {
    if (layers.length < 2) return null
    const diffs = []
    for (let i = 1; i < layers.length; i++) {
        const d = layers[i].z_height - layers[i - 1].z_height
        if (d > EPS) diffs.push(d)
    }
    if (diffs.length === 0) return null
    diffs.sort((a, b) => a - b)
    return diffs[Math.floor(diffs.length / 2)]
}

function deriveProjectName(fileName) {
    return fileName.replace(/\.gcode$/i, '').replace(/_/g, ' ').trim() || 'Imported G-code'
}
