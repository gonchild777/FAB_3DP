import { useRef } from 'react'
import useStore from '../../stores/useStore'
import {
    parseIni,
    convertToPrintSettings,
    extractMachineSettings,
    extractGcodeTemplates
} from '../../utils/configParser'

export default function ConfigUploader() {
    const fileInputRef = useRef(null)
    const loadConfig = useStore((state) => state.loadConfig)

    const handleButtonClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.ini')) {
            alert('請選擇 .ini 配置檔案')
            return
        }

        try {
            const text = await file.text()
            const iniConfig = parseIni(text)

            const printSettings = convertToPrintSettings(iniConfig)
            const machineSettings = extractMachineSettings(iniConfig)
            const gcodeTemplates = extractGcodeTemplates(iniConfig)

            loadConfig(printSettings, machineSettings, gcodeTemplates, file.name)
            console.log('成功載入配置:', file.name)
        } catch (error) {
            console.error('配置檔解析錯誤:', error)
            alert(`解析錯誤: ${error.message}`)
        }

        event.target.value = ''
    }

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".ini"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <button
                onClick={handleButtonClick}
                style={{
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.8)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.12)'
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                }}
                onMouseOut={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.08)'
                    e.target.style.borderColor = 'rgba(255,255,255,0.12)'
                }}
            >
                <span>⚙️</span>
                <span>載入配置</span>
            </button>
        </>
    )
}
