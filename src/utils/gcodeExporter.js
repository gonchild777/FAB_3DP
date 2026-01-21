/**
 * G-code 檔案導出工具
 */

/**
 * 生成時間戳字串
 */
function getTimestamp() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    return `${year}${month}${day}_${hour}${minute}`
}

/**
 * 下載 G-code 檔案
 * @param {string} gcodeString - G-code 內容
 * @param {string} projectName - 專案名稱（用於檔名）
 */
export function downloadGcode(gcodeString, projectName = 'output') {
    // 清理專案名稱（移除特殊字符）
    const cleanName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_')
    const timestamp = getTimestamp()
    const filename = `${cleanName}_${timestamp}.gcode`

    // 建立 Blob
    const blob = new Blob([gcodeString], { type: 'text/plain;charset=utf-8' })

    // 建立下載連結
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename

    // 觸發下載
    document.body.appendChild(link)
    link.click()

    // 清理
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return filename
}

export default { downloadGcode }
