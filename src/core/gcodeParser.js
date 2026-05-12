/**
 * G-code Parser
 * 將 .gcode 檔案解析為內部 pathData 格式（與 JSON 格式相容）
 *
 * 額外為 G-code 保留模式追蹤每段的 sourceLines、preamble、epilogue，
 * 使優化後仍可保留所有原始指令（F/E/M-codes/註解）。
 *
 * 輸出格式：
 * {
 *   header: { project_name, nozzle_diameter, layer_height, machine_flavor, source_unit,
 *             preamble: [string], epilogue: [string], defaultTravelF: number },
 *   layers: [{ layer_index, z_height, segments: [{ type, is_extruding, points, sourceLines }] }]
 * }
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
 */
export function parseGcode(gcodeString, options = {}) {
    const { fileName = 'Imported G-code', unit = 'auto' } = options

    if (!gcodeString || typeof gcodeString !== 'string') return null

    const rawLines = gcodeString.split(/\r?\n/)

    // 機器狀態
    let pos = { x: 0, y: 0, z: 0 }
    let eValue = 0
    let lastPrintE = 0
    let absoluteMode = true
    let absoluteExtrusion = true
    let lastTravelF = null

    // 解析結果
    const layers = []
    let currentLayer = null
    let currentSegment = null
    let layerIndexCounter = 0
    let hasExplicitLayerMarker = false

    // 原始指令追蹤
    let pendingLines = []           // 累積尚未分配到 segment 的行
    let preamble = null             // 首個 movement 前的所有行
    let firstSegmentCreated = false
    let pendingLayerHeader = []     // 等待掛到新 layer 的標記行（;LAYER:n 等）

    // 中繼資料
    const meta = {
        projectName: deriveProjectName(fileName),
        nozzleDiameter: null,
        layerHeight: null,
        machineFlavor: null,
    }

    const ensureLayer = (z) => {
        if (currentLayer && Math.abs(currentLayer.z_height - z) < EPS) return currentLayer
        currentSegment = null
        const newLayer = {
            layer_index: layerIndexCounter++,
            z_height: z,
            segments: [],
            layerHeader: pendingLayerHeader,   // ;LAYER:n 等標記行
        }
        pendingLayerHeader = []
        layers.push(newLayer)
        currentLayer = newLayer
        return newLayer
    }

    const startSegment = (type, isExtruding, startPoint) => {
        currentSegment = {
            type,
            is_extruding: isExtruding,
            points: [{ ...startPoint }],
            sourceLines: [],   // 將在 main loop 賦值
        }
        currentLayer.segments.push(currentSegment)
        return currentSegment
    }

    /**
     * 將累積的 pendingLines 指派給對應 segment
     * 回傳是否建立了新 segment
     */
    const flushPendingTo = (point, type, isExtruding) => {
        if (!currentLayer) ensureLayer(point.z)

        const needNewSegment = !currentSegment ||
            currentSegment.type !== type ||
            currentSegment.is_extruding !== isExtruding

        if (needNewSegment) {
            startSegment(type, isExtruding, pos)
            // 新段：preamble 處理
            if (!firstSegmentCreated) {
                const movementLineIdx = pendingLines.length - 1
                preamble = pendingLines.slice(0, movementLineIdx)
                currentSegment.sourceLines = [pendingLines[movementLineIdx]]
                firstSegmentCreated = true
            } else {
                currentSegment.sourceLines = [...pendingLines]
            }
        } else {
            currentSegment.sourceLines.push(...pendingLines)
        }

        // 避免重複點
        const last = currentSegment.points[currentSegment.points.length - 1]
        if (!pointsEqual(last, point)) {
            currentSegment.points.push({ ...point })
        }

        pendingLines = []
    }

    for (const rawLine of rawLines) {
        const line = rawLine.trim()
        if (!line) continue

        // 純註解行：LAYER 標記特殊處理（不放入 pendingLines，改放 layerHeader）
        if (line.startsWith(';')) {
            const isLayerMarker = /^;\s*LAYER[:\s]+\d+/i.test(line) || /^;\s*LAYER_CHANGE/i.test(line)
            if (isLayerMarker) {
                pendingLayerHeader.push(rawLine)
                handleCommentLine(line, meta, () => {
                    hasExplicitLayerMarker = true
                    currentLayer = null
                    currentSegment = null
                })
                continue
            }
            pendingLines.push(rawLine)
            handleCommentLine(line, meta, () => {
                hasExplicitLayerMarker = true
                currentLayer = null
                currentSegment = null
            })
            continue
        }

        pendingLines.push(rawLine)

        // 去除行尾註解
        const codePart = line.split(';')[0].trim()
        if (!codePart) continue

        const tokens = codePart.split(/\s+/)
        const cmd = tokens[0].toUpperCase()

        // 模式設定（不消耗 pendingLines，等下次 movement 一起 attach）
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
            let nextF = null
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
                else if (axis === 'F') nextF = val
            }

            // 純擠出/回抽（無位置變化）→ 跳過位置更新，行保留在 pendingLines 中
            if (!hasXYZ) {
                if (hasE) eValue = nextE
                continue
            }

            const eDelta = hasE ? nextE - lastPrintE : 0
            const isExtruding = cmd === 'G1' && hasE && eDelta > EPS

            // 記錄 travel feedrate
            if (!isExtruding && nextF != null) lastTravelF = nextF

            // Z 變化偵測新層
            const zChanged = Math.abs(next.z - pos.z) > EPS
            if (zChanged && !hasExplicitLayerMarker) {
                currentLayer = null
                currentSegment = null
            }

            // 確保有 layer
            if (!currentLayer) ensureLayer(next.z)
            else if (currentLayer.segments.length === 0 && Math.abs(currentLayer.z_height - next.z) > EPS) {
                currentLayer.z_height = next.z
            }

            const segType = isExtruding ? 'printing' : 'travel'
            flushPendingTo(next, segType, isExtruding)

            pos = next
            eValue = nextE
            if (isExtruding) lastPrintE = nextE
            else if (hasE) lastPrintE = nextE
        }
    }

    // 收尾：剩餘 pendingLines 為 epilogue
    const epilogue = pendingLines

    // 過濾空層
    const validLayers = layers.filter((l) => l.segments.length > 0)
    if (validLayers.length === 0) return null

    validLayers.forEach((l, idx) => { l.layer_index = idx })

    const { scale, detectedUnit } = resolveUnitScale(validLayers, unit)
    if (scale !== 1) applyScale(validLayers, scale)

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
            preamble: preamble ?? [],
            epilogue,
            defaultTravelF: lastTravelF ?? 3000,
            sourceScale: scale,   // 重新導出時將 cm 換回原單位用
        },
        layers: validLayers,
    }
}

function handleCommentLine(line, meta, onLayerMarker) {
    const layerMatch = line.match(/^;\s*LAYER[:\s]+(\d+)/i)
    if (layerMatch) {
        onLayerMarker(parseInt(layerMatch[1], 10))
        return
    }

    if (/^;\s*LAYER_CHANGE/i.test(line)) {
        onLayerMarker(null)
        return
    }

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
