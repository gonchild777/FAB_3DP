/**
 * G-code 設備配置檔
 * 支援多種 G-code 風格：Marlin, RepRap, KUKA, Custom
 */

export const GCODE_PROFILES = {
    marlin: {
        id: 'marlin',
        name: 'Marlin',
        description: 'Marlin 固件（常用於 3D 打印機）',
        commands: {
            home: 'G28',
            absolutePosition: 'G90',
            relativePosition: 'G91',
            absoluteExtrusion: 'M82',
            relativeExtrusion: 'M83',
            resetExtrusion: 'G92 E0',
            linearMove: 'G1 X{x} Y{y} Z{z} E{e} F{f}',
            rapidMove: 'G0 X{x} Y{y} Z{z} F{f}',
            extrudeOnly: 'G1 E{e} F{f}',
            dwell: 'G4 P{ms}',
            setTemperature: 'M104 S{temp}',
            waitTemperature: 'M109 S{temp}',
            fanOn: 'M106 S{speed}',
            fanOff: 'M107',
            motorsOff: 'M84',
            comment: '; {text}',
        },
        format: {
            coordinateDecimals: 3,
            extrusionDecimals: 5,
            speedUnit: 'mm/min',
            speedMultiplier: 60,  // 將 mm/s 轉換為 mm/min
            lineEnding: '\n',
        },
        startGcode: `; FAB_3DP - Marlin 格式
; 專案: {projectName}
; 日期: {date}
G28 ; 歸零所有軸
G90 ; 絕對座標
M82 ; 絕對擠出
G92 E0 ; 重置擠出計數
`,
        endGcode: `; 列印完成
M104 S0 ; 關閉加熱
G91 ; 相對座標
G1 Z10 F1200 ; 抬升噴頭
G90 ; 絕對座標
G28 X Y ; 歸零 XY
M84 ; 關閉馬達
`,
        layerChangeGcode: '; Layer {layer}\n',
    },

    reprap: {
        id: 'reprap',
        name: 'RepRap',
        description: 'RepRap 固件（通用）',
        commands: {
            home: 'G28',
            absolutePosition: 'G90',
            relativePosition: 'G91',
            absoluteExtrusion: 'M82',
            relativeExtrusion: 'M83',
            resetExtrusion: 'G92 E0',
            linearMove: 'G1 X{x} Y{y} Z{z} E{e} F{f}',
            rapidMove: 'G0 X{x} Y{y} Z{z} F{f}',
            extrudeOnly: 'G1 E{e} F{f}',
            dwell: 'G4 S{sec}',  // RepRap 用秒而非毫秒
            setTemperature: 'M104 S{temp}',
            waitTemperature: 'M109 S{temp}',
            fanOn: 'M106 S{speed}',
            fanOff: 'M107',
            motorsOff: 'M84',
            comment: '; {text}',
        },
        format: {
            coordinateDecimals: 3,
            extrusionDecimals: 5,
            speedUnit: 'mm/min',
            speedMultiplier: 60,
            lineEnding: '\n',
            dwellUnit: 'sec',  // 暫停單位為秒
        },
        startGcode: `; FAB_3DP - RepRap 格式
G28 ; 歸零
G90 ; 絕對座標
M82 ; 絕對擠出
G92 E0 ; 重置擠出
`,
        endGcode: `M104 S0
M84
`,
        layerChangeGcode: '; Layer {layer}\n',
    },

    kuka: {
        id: 'kuka',
        name: 'KUKA Robot',
        description: 'KUKA 機械臂（KRL 語法）',
        commands: {
            home: 'PTP HOME',
            absolutePosition: '; ABS mode',
            linearMove: 'LIN {{X {x}, Y {y}, Z {z}, A 0, B 0, C 0}}',
            rapidMove: 'PTP {{X {x}, Y {y}, Z {z}, A 0, B 0, C 0}}',
            dwell: 'WAIT SEC {sec}',
            comment: '; {text}',
            extruderOn: '$OUT[1] = TRUE',   // 泵浦開
            extruderOff: '$OUT[1] = FALSE', // 泵浦關
        },
        format: {
            coordinateDecimals: 2,
            extrusionDecimals: 0,  // KUKA 通常不用 E 值
            speedUnit: 'mm/s',
            speedMultiplier: 1,
            lineEnding: '\n',
            useExtrusion: false,  // 不使用 E 軸
        },
        startGcode: `; FAB_3DP - KUKA 格式
; 專案: {projectName}
DEF PRINT_PATH()
PTP HOME
`,
        endGcode: `PTP HOME
END
`,
        layerChangeGcode: '; Layer {layer}\n',
    },

    custom: {
        id: 'custom',
        name: '自定義',
        description: '自定義 G-code 格式',
        commands: {
            home: 'G28',
            absolutePosition: 'G90',
            absoluteExtrusion: 'M82',
            resetExtrusion: 'G92 E0',
            linearMove: 'G1 X{x} Y{y} Z{z} E{e} F{f}',
            rapidMove: 'G0 X{x} Y{y} Z{z} F{f}',
            dwell: 'G4 P{ms}',
            comment: '; {text}',
        },
        format: {
            coordinateDecimals: 3,
            extrusionDecimals: 5,
            speedUnit: 'mm/min',
            speedMultiplier: 60,
            lineEnding: '\n',
        },
        startGcode: '',
        endGcode: '',
        layerChangeGcode: '',
    },
}

/**
 * 獲取所有可用配置的列表
 */
export function getProfileList() {
    return Object.values(GCODE_PROFILES).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
    }))
}

/**
 * 根據 ID 獲取配置
 * @param {string} id - 配置 ID
 * @param {Object} customProfile - 自定義配置（從 store 傳入）
 */
export function getProfile(id, customProfile = null) {
    if (id === 'custom' && customProfile) {
        return customProfile
    }
    return GCODE_PROFILES[id] || GCODE_PROFILES.marlin
}

/**
 * 替換指令模板中的變數
 */
export function formatCommand(template, variables) {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
    return result
}

/**
 * 格式化座標值
 */
export function formatCoordinate(value, decimals = 3) {
    return Number(value).toFixed(decimals)
}

/**
 * 格式化速度（轉換單位）
 */
export function formatSpeed(speedMmPerSec, profile) {
    const multiplied = speedMmPerSec * profile.format.speedMultiplier
    return Math.round(multiplied)
}
