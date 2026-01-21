import { useRef } from 'react'
import useStore from '../../stores/useStore'

export default function FileUploader() {
    const fileInputRef = useRef(null)
    const setPathData = useStore((state) => state.setPathData)

    const handleButtonClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.json')) {
            alert('請選擇 .json 檔案')
            return
        }

        try {
            const text = await file.text()
            const data = JSON.parse(text)
            setPathData(data)
            console.log('成功載入:', file.name)
        } catch (error) {
            console.error('JSON 解析錯誤:', error)
            alert(`JSON 解析錯誤: ${error.message}`)
        }

        event.target.value = ''
    }

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
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
                onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
                <span>📂</span>
                <span>導入 JSON</span>
            </button>
        </>
    )
}
