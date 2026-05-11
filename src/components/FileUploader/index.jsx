import { useRef } from 'react'
import useStore from '../../stores/useStore'
import { parseGcode } from '../../core/gcodeParser'

export default function FileUploader() {
    const fileInputRef = useRef(null)
    const setPathData = useStore((state) => state.setPathData)
    const setSourceType = useStore((state) => state.setSourceType)
    const sourceType = useStore((state) => state.sourceType)

    const handleButtonClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        const lowerName = file.name.toLowerCase()
        const isJson = lowerName.endsWith('.json')
        const isGcode = lowerName.endsWith('.gcode') || lowerName.endsWith('.gco') || lowerName.endsWith('.nc')

        if (!isJson && !isGcode) {
            alert('請選擇 .json 或 .gcode 檔案')
            event.target.value = ''
            return
        }

        try {
            const text = await file.text()

            if (isJson) {
                const data = JSON.parse(text)
                setPathData(data)
                setSourceType('json')
                console.log('成功載入 JSON:', file.name)
            } else {
                const data = parseGcode(text, { fileName: file.name })
                if (!data) {
                    alert('G-code 解析失敗：找不到有效的移動指令')
                    event.target.value = ''
                    return
                }
                setPathData(data)
                setSourceType('gcode')
                console.log(`成功載入 G-code: ${file.name} (${data.layers.length} 層, 單位偵測: ${data.header.source_unit})`)
            }
        } catch (error) {
            console.error('檔案解析錯誤:', error)
            alert(`檔案解析錯誤: ${error.message}`)
        }

        event.target.value = ''
    }

    const sourceBadge = sourceType ? (
        <span style={{
            padding: '2px 8px',
            borderRadius: '6px',
            background: sourceType === 'gcode' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(16, 185, 129, 0.25)',
            color: sourceType === 'gcode' ? '#a5b4fc' : '#6ee7b7',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            border: `1px solid ${sourceType === 'gcode' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
        }}>
            {sourceType}
        </span>
    ) : null

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sourceBadge}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json,.gcode,.gco,.nc"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <button
                onClick={handleButtonClick}
                style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <span>📂</span>
                <span>導入 JSON / G-code</span>
            </button>
        </div>
    )
}
