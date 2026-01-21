/**
 * PrusaSlicer config.ini 解析器
 * 解析 INI 格式的配置檔案並提取相關參數
 */

/**
 * 解析 INI 格式字串
 * @param {string} iniText - INI 格式的文字內容
 * @returns {Object} 解析後的鍵值對物件
 */
export function parseIni(iniText) {
    const result = {}
    const lines = iniText.split(/\r?\n/)

    for (const line of lines) {
        // 跳過空行和註解
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
            continue
        }

        // 解析 key = value 格式
        const equalIndex = trimmed.indexOf('=')
        if (equalIndex > 0) {
            const key = trimmed.substring(0, equalIndex).trim()
            let value = trimmed.substring(equalIndex + 1).trim()

            // 移除引號
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1)
            }

            result[key] = value
        }
    }

    return result
}

/**
 * 將 INI 配置轉換為 printSettings 格式
 * @param {Object} iniConfig - 解析後的 INI 配置
 * @returns {Object} 應用配置
 */
export function convertToPrintSettings(iniConfig) {
    const settings = {}

    // 列印速度相關
    if (iniConfig.perimeter_speed) {
        settings.printSpeed = parseFloat(iniConfig.perimeter_speed) || 60
    } else if (iniConfig.infill_speed) {
        settings.printSpeed = parseFloat(iniConfig.infill_speed) || 60
    }

    // 空移速度
    if (iniConfig.travel_speed) {
        settings.travelSpeed = parseFloat(iniConfig.travel_speed) || 200
    }

    // 擠出乘數
    if (iniConfig.extrusion_multiplier) {
        settings.extrusionMultiplier = parseFloat(iniConfig.extrusion_multiplier) || 1.0
    }

    return settings
}

/**
 * 從 INI 配置提取機器參數
 * @param {Object} iniConfig - 解析後的 INI 配置
 * @returns {Object} 機器參數
 */
export function extractMachineSettings(iniConfig) {
    return {
        // 噴頭直徑
        nozzleDiameter: parseFloat(iniConfig.nozzle_diameter) || 10,

        // 層高
        layerHeight: parseFloat(iniConfig.layer_height) || 6,
        firstLayerHeight: parseFloat(iniConfig.first_layer_height) || 6,

        // 材料設定
        filamentDiameter: parseFloat(iniConfig.filament_diameter) || 35,

        // 列印床尺寸（從 bed_shape 解析）
        bedSize: parseBedShape(iniConfig.bed_shape),

        // 回抽設定
        retractLength: parseFloat(iniConfig.retract_length) || 0,
        retractSpeed: parseFloat(iniConfig.retract_speed) || 20,
        retractLift: parseFloat(iniConfig.retract_lift) || 0,

        // 溫度
        temperature: parseFloat(iniConfig.temperature) || 200,
        bedTemperature: parseFloat(iniConfig.bed_temperature) || 0,

        // G-code 風格
        gcodeFlavor: iniConfig.gcode_flavor || 'reprap',

        // 原始設定名稱
        printerSettingsId: iniConfig.printer_settings_id || '',
        printSettingsId: iniConfig.print_settings_id || '',
        filamentSettingsId: iniConfig.filament_settings_id || '',
    }
}

/**
 * 解析 bed_shape 格式（如 "0x0,1200x0,1200x1200,0x1200"）
 * @param {string} bedShapeStr - bed_shape 字串
 * @returns {Object} { width, height }
 */
function parseBedShape(bedShapeStr) {
    if (!bedShapeStr) return { width: 1200, height: 1200 }

    try {
        const points = bedShapeStr.split(',').map(p => {
            const [x, y] = p.split('x').map(Number)
            return { x, y }
        })

        // 找出最大 X 和 Y 值
        const maxX = Math.max(...points.map(p => p.x))
        const maxY = Math.max(...points.map(p => p.y))

        return { width: maxX, height: maxY }
    } catch (e) {
        return { width: 1200, height: 1200 }
    }
}

/**
 * 提取 G-code 模板
 * @param {Object} iniConfig - 解析後的 INI 配置
 * @returns {Object} G-code 模板
 */
export function extractGcodeTemplates(iniConfig) {
    // 將轉義字符轉換回實際換行
    const unescape = (str) => {
        if (!str) return ''
        return str.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
    }

    return {
        startGcode: unescape(iniConfig.start_gcode),
        endGcode: unescape(iniConfig.end_gcode),
        layerGcode: unescape(iniConfig.layer_gcode),
        beforeLayerGcode: unescape(iniConfig.before_layer_gcode),
    }
}

export default {
    parseIni,
    convertToPrintSettings,
    extractMachineSettings,
    extractGcodeTemplates,
}
