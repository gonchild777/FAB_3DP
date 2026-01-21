/**
 * G-code 後處理器
 * 支援多種 G-code 風格：Marlin, RepRap, KUKA, Custom
 */
import { getProfile, formatCommand, formatCoordinate, formatSpeed } from './gcodeProfiles'

/**
 * 計算兩點之間的距離
 */
function calculateDistance(p1, p2) {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const dz = p2.z - p1.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * 計算路徑段的總長度
 */
function calculateSegmentLength(points) {
    let totalLength = 0
    for (let i = 1; i < points.length; i++) {
        totalLength += calculateDistance(points[i - 1], points[i])
    }
    return totalLength
}

/**
 * 生成 G-code 標頭註解
 */
function generateHeader(pathData, settings, machineSettings, profile) {
    const now = new Date().toISOString()
    const nozzleDiameter = machineSettings?.nozzleDiameter || pathData.header.nozzle_diameter
    const layerHeight = pathData.header.layer_height
    const commentCmd = profile.commands.comment || '; {text}'

    const comment = (text) => formatCommand(commentCmd, { text })

    const lines = [
        comment('========================================'),
        comment(`Project: ${pathData.header.project_name}`),
        comment(`Generated: ${now}`),
        comment(`Generator: FAB_3DP (${profile.name})`),
        comment('========================================'),
        comment('Machine Settings:'),
        comment(`Nozzle Diameter: ${nozzleDiameter} mm`),
        comment(`Layer Height: ${layerHeight} mm`),
        comment(`G-code Style: ${profile.name}`),
        comment('========================================'),
        comment('Print Settings:'),
        comment(`Print Speed: ${settings.printSpeed} mm/s`),
        comment(`Travel Speed: ${settings.travelSpeed} mm/s`),
        comment(`Extrusion Multiplier: ${settings.extrusionMultiplier}`),
        comment('========================================'),
        '',
    ]
    return lines.join('\n')
}

/**
 * 生成初始化序列
 */
function generateInitSequence(profile, pathData) {
    let startGcode = profile.startGcode || ''

    // 替換變數
    startGcode = startGcode
        .replace(/{projectName}/g, pathData.header?.project_name || 'Untitled')
        .replace(/{date}/g, new Date().toLocaleDateString())

    return startGcode
}

/**
 * 生成結束序列
 */
function generateEndSequence(profile) {
    return profile.endGcode || ''
}

/**
 * 生成移動指令
 */
function generateMoveCommand(profile, point, feedrate, extrusion = null, isTravel = false) {
    const format = profile.format
    const decimals = format.coordinateDecimals || 3
    const eDecimals = format.extrusionDecimals || 5

    const x = formatCoordinate(point.x, decimals)
    const y = formatCoordinate(point.y, decimals)
    const z = formatCoordinate(point.z, decimals)
    const f = Math.round(feedrate)

    if (isTravel) {
        // 快速移動（空移）
        const template = profile.commands.rapidMove || 'G0 X{x} Y{y} Z{z} F{f}'
        return formatCommand(template, { x, y, z, f })
    } else {
        // 列印移動
        const template = profile.commands.linearMove || 'G1 X{x} Y{y} Z{z} E{e} F{f}'
        const e = extrusion !== null ? Number(extrusion).toFixed(eDecimals) : '0'

        // 如果是 KUKA 等不使用 E 軸的設備
        if (format.useExtrusion === false) {
            const kukaTemplate = profile.commands.linearMove || 'LIN {{X {x}, Y {y}, Z {z}}}'
            return formatCommand(kukaTemplate, { x, y, z })
        }

        return formatCommand(template, { x, y, z, e, f })
    }
}

/**
 * 生成暫停指令
 */
function generateDwellCommand(profile, ms) {
    const dwellCmd = profile.commands.dwell
    if (!dwellCmd) return ''

    if (profile.format.dwellUnit === 'sec') {
        // RepRap 使用秒
        return formatCommand(dwellCmd, { sec: (ms / 1000).toFixed(2) })
    } else {
        // Marlin 使用毫秒
        return formatCommand(dwellCmd, { ms: Math.round(ms) })
    }
}

/**
 * 生成圖層變更註解
 */
function generateLayerChange(profile, layerIndex, zHeight) {
    const template = profile.layerChangeGcode || '; Layer {layer}\n'
    return formatCommand(template, { layer: layerIndex, z: zHeight })
}

/**
 * 主函數：生成 G-code
 * @param {Object} pathData - 路徑數據（JSON 格式）
 * @param {Object} settings - 列印設定
 * @param {Object} machineSettings - 機器設定
 * @param {string} profileId - G-code 配置檔 ID（預設 'marlin'）
 * @param {Object} customProfile - 自定義配置（當 profileId 為 'custom' 時使用）
 * @returns {string} G-code 字串
 */
export function generateGcode(pathData, settings, machineSettings = null, profileId = 'marlin', customProfile = null) {
    if (!pathData || !pathData.layers) {
        throw new Error('Invalid path data')
    }

    const profile = getProfile(profileId, customProfile)
    const format = profile.format || {}

    // 噴頭直徑和層高
    const nozzleDiameter = machineSettings?.nozzleDiameter || pathData.header.nozzle_diameter
    const layerHeight = pathData.header.layer_height

    // 速度轉換
    const printFeedrate = formatSpeed(settings.printSpeed, profile)
    const travelFeedrate = formatSpeed(settings.travelSpeed, profile)

    let gcodeLines = []
    let cumulativeE = 0

    // 添加標頭
    gcodeLines.push(generateHeader(pathData, settings, machineSettings, profile))
    gcodeLines.push(generateInitSequence(profile, pathData))

    // 處理每個圖層
    for (const layer of pathData.layers) {
        gcodeLines.push(generateLayerChange(profile, layer.layer_index, layer.z_height))

        // 處理每個路徑段
        for (const segment of layer.segments) {
            const points = segment.points

            if (segment.type === 'travel' || !segment.is_extruding) {
                // 空移段
                const commentCmd = profile.commands.comment || '; {text}'
                gcodeLines.push(formatCommand(commentCmd, { text: 'Travel move' }))

                for (const point of points) {
                    gcodeLines.push(generateMoveCommand(profile, point, travelFeedrate, null, true))
                }
            } else {
                // 列印段
                const commentCmd = profile.commands.comment || '; {text}'
                gcodeLines.push(formatCommand(commentCmd, { text: 'Print segment' }))

                // Pump On Delay
                if (settings.pumpOnDelay > 0) {
                    const dwellCmd = generateDwellCommand(profile, settings.pumpOnDelay)
                    if (dwellCmd) {
                        gcodeLines.push(dwellCmd + formatCommand(commentCmd, { text: ' Pump on delay' }).trim())
                    }
                }

                // 計算 Pump Off 位置
                const segmentLength = calculateSegmentLength(points)
                const pumpOffDistance = settings.pumpOffAdvance
                let accumulatedDistance = 0
                let pumpOffTriggered = false

                for (let i = 0; i < points.length; i++) {
                    const point = points[i]

                    if (i > 0) {
                        const prevPoint = points[i - 1]
                        const stepDistance = calculateDistance(prevPoint, point)
                        accumulatedDistance += stepDistance

                        // 計算擠出量
                        const deltaE = stepDistance * settings.extrusionMultiplier *
                            (nozzleDiameter * layerHeight) / 1000

                        // 檢查關泵
                        const remainingDistance = segmentLength - accumulatedDistance
                        if (!pumpOffTriggered && pumpOffDistance > 0 && remainingDistance <= pumpOffDistance) {
                            gcodeLines.push(formatCommand(commentCmd, { text: 'Pump off advance' }))
                            pumpOffTriggered = true
                            gcodeLines.push(generateMoveCommand(profile, point, printFeedrate, 0, false))
                        } else {
                            cumulativeE += deltaE
                            gcodeLines.push(generateMoveCommand(profile, point, printFeedrate, cumulativeE, false))
                        }
                    } else {
                        gcodeLines.push(generateMoveCommand(profile, point, printFeedrate, cumulativeE, false))
                    }
                }
            }
        }

        gcodeLines.push('')
    }

    // 添加結束序列
    gcodeLines.push(generateEndSequence(profile))

    return gcodeLines.join('\n')
}

export default { generateGcode }
