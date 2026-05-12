/**
 * G-code 保留模式導出器
 *
 * 用於從 G-code 來源（sourceType === 'gcode'）的優化結果重新生成檔案。
 *
 * 規則：
 * - 完整保留 preamble、epilogue 與 layerHeader
 * - 每個 segment 若有 sourceLines（原始行）→ 原樣輸出
 * - 若 segment 無 sourceLines（優化器新生成的 travel 或繞行）→ 用原檔的 defaultTravelF 生成 G0
 * - 不重算 E 值、不改任何 G1 內容
 */

const EPS = 1e-6

/**
 * 將內部 cm 座標換回原檔單位（通常 mm）
 */
function unscale(value, scale) {
    if (!scale || scale === 1) return value
    return value / scale  // cm / 0.1 = mm
}

function formatNum(v, decimals = 3) {
    return v.toFixed(decimals).replace(/\.?0+$/, '') || '0'
}

/**
 * 生成單一 G0 travel 行（用於優化器新增的繞行 waypoint）
 */
function generateTravelLine(prevPoint, point, defaultF, scale, decimals = 3) {
    const x = formatNum(unscale(point.x, scale), decimals)
    const y = formatNum(unscale(point.y, scale), decimals)
    const z = formatNum(unscale(point.z, scale), decimals)
    const f = Math.round(defaultF)
    // F 只在第一行或速度改變時輸出（簡化：每行都加）
    return `G0 X${x} Y${y} Z${z} F${f}`
}

/**
 * 為一個沒有 sourceLines 的 travel segment 生成 G-code 行
 */
function generateTravelSegment(seg, header, decimals = 3) {
    const scale = header.sourceScale ?? 1
    const defaultF = header.defaultTravelF ?? 3000
    const lines = []
    for (let i = 1; i < seg.points.length; i++) {
        lines.push(generateTravelLine(seg.points[i - 1], seg.points[i], defaultF, scale, decimals))
    }
    return lines
}

/**
 * 導出保留模式 G-code
 * @param {object} pathData - 必須含 header.preamble/epilogue/sourceScale/defaultTravelF，
 *                           segments 必須含 sourceLines（原始）或無（新生成）
 * @returns {string} 完整 G-code 字串
 */
export function exportPreservedGcode(pathData) {
    if (!pathData?.header) throw new Error('無效 pathData')
    if (!pathData.header.preamble) {
        throw new Error('此 pathData 不支援保留模式（缺少 preamble，可能非 G-code 來源）')
    }

    const out = []
    const { header, layers } = pathData

    // 1. Preamble
    out.push(`; ─── FAB_3DP 路徑優化（保留模式） ───`)
    out.push(`; 原始檔: ${header.project_name}`)
    out.push(`; 優化日期: ${new Date().toISOString()}`)
    out.push(`; 保留：所有 F/E 值、M-codes、註解、列印方向、接縫位置`)
    out.push(`; 僅優化：段落順序與空移路徑`)
    out.push('')
    for (const line of header.preamble) out.push(line)

    // 2. 每層
    for (const layer of layers) {
        // Layer header（;LAYER:n）
        if (layer.layerHeader && layer.layerHeader.length > 0) {
            for (const l of layer.layerHeader) out.push(l)
        }

        // 每個 segment
        for (const seg of layer.segments) {
            if (seg.sourceLines && seg.sourceLines.length > 0) {
                // 原始保留段
                for (const l of seg.sourceLines) out.push(l)
            } else {
                // 優化器新生成（如 rebuildWithTravels 產生的 travel、VG 繞行）
                const lines = generateTravelSegment(seg, header)
                for (const l of lines) out.push(l)
            }
        }
    }

    // 3. Epilogue
    for (const line of header.epilogue) out.push(line)

    return out.join('\n') + '\n'
}

/**
 * 驗證 pathData 是否能用保留模式導出
 */
export function canUsePreservingExport(pathData) {
    return !!(pathData?.header?.preamble && pathData?.header?.epilogue)
}
