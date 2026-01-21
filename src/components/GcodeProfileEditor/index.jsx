/**
 * G-code 配置編輯器
 * 模態視窗，允許編輯自定義 G-code 配置
 */
import { useState, useEffect, useMemo } from 'react'
import useStore from '../../stores/useStore'
import { generateGcode } from '../../core/postProcessor'

// 可用變數說明
const AVAILABLE_VARIABLES = [
    { name: '{x}', desc: 'X 座標' },
    { name: '{y}', desc: 'Y 座標' },
    { name: '{z}', desc: 'Z 座標' },
    { name: '{e}', desc: '累計擠出量' },
    { name: '{f}', desc: '進給速度' },
    { name: '{layer}', desc: '當前圖層' },
    { name: '{ms}', desc: '暫停毫秒' },
    { name: '{sec}', desc: '暫停秒數' },
    { name: '{text}', desc: '註解文字' },
    { name: '{projectName}', desc: '專案名稱' },
    { name: '{date}', desc: '生成日期' },
]

// 輸入框組件
function InputField({ label, value, onChange, placeholder, multiline = false, rows = 3 }) {
    const baseStyle = {
        width: '100%',
        padding: '10px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '13px',
        fontFamily: "'JetBrains Mono', monospace",
        resize: 'vertical',
        transition: 'border-color 0.2s',
    }

    return (
        <div style={{ marginBottom: '12px' }}>
            <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '500',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
            }}>
                {label}
            </label>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={rows}
                    style={baseStyle}
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={baseStyle}
                />
            )}
        </div>
    )
}

// 折疊面板
function CollapsibleSection({ title, children, defaultOpen = true }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div style={{
            marginBottom: '16px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            overflow: 'hidden',
        }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}
            >
                <span>{title}</span>
                <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    ▼
                </span>
            </button>
            {isOpen && (
                <div style={{ padding: '16px' }}>
                    {children}
                </div>
            )}
        </div>
    )
}

// 主組件
export default function GcodeProfileEditor() {
    const isOpen = useStore((state) => state.isProfileEditorOpen)
    const customProfile = useStore((state) => state.customProfile)
    const pathData = useStore((state) => state.pathData)
    const printSettings = useStore((state) => state.printSettings)
    const setProfileEditorOpen = useStore((state) => state.setProfileEditorOpen)
    const updateCustomProfile = useStore((state) => state.updateCustomProfile)
    const updateCustomProfileCommand = useStore((state) => state.updateCustomProfileCommand)
    const updateCustomProfileFormat = useStore((state) => state.updateCustomProfileFormat)
    const saveCustomProfileToStorage = useStore((state) => state.saveCustomProfileToStorage)

    // 預覽 G-code
    const previewGcode = useMemo(() => {
        if (!pathData) return '; 請先載入 JSON 路徑檔案以預覽 G-code'
        try {
            const gcode = generateGcode(pathData, printSettings, null, 'custom')
            return gcode.split('\n').slice(0, 25).join('\n') + '\n...'
        } catch (e) {
            return '; 預覽錯誤: ' + e.message
        }
    }, [pathData, printSettings, customProfile])

    if (!isOpen) return null

    const handleSave = () => {
        saveCustomProfileToStorage()
        setProfileEditorOpen(false)
    }

    const handleExport = () => {
        const json = JSON.stringify(customProfile, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${customProfile.name || 'custom-profile'}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImport = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = (e) => {
            const file = e.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = (ev) => {
                try {
                    const profile = JSON.parse(ev.target.result)
                    updateCustomProfile(profile)
                } catch (err) {
                    alert('無法解析配置檔: ' + err.message)
                }
            }
            reader.readAsText(file)
        }
        input.click()
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
        }}>
            <div style={{
                width: '90%',
                maxWidth: '900px',
                maxHeight: '90vh',
                backgroundColor: 'rgba(20, 20, 28, 0.98)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* 標題列 */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>
                            ⚙️ 自定義 G-code 配置
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                            編輯指令模板、開始/結束 G-code
                        </p>
                    </div>
                    <button
                        onClick={() => setProfileEditorOpen(false)}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: '#fff',
                            fontSize: '16px',
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 內容區 */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '24px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px',
                }}>
                    {/* 左側：設定 */}
                    <div>
                        <InputField
                            label="配置名稱"
                            value={customProfile.name}
                            onChange={(v) => updateCustomProfile({ name: v })}
                            placeholder="例如: My Robot Arm"
                        />

                        <CollapsibleSection title="移動指令">
                            <InputField
                                label="列印移動 (linearMove)"
                                value={customProfile.commands.linearMove}
                                onChange={(v) => updateCustomProfileCommand('linearMove', v)}
                                placeholder="G1 X{x} Y{y} Z{z} E{e} F{f}"
                            />
                            <InputField
                                label="快速移動 (rapidMove)"
                                value={customProfile.commands.rapidMove}
                                onChange={(v) => updateCustomProfileCommand('rapidMove', v)}
                                placeholder="G0 X{x} Y{y} Z{z} F{f}"
                            />
                            <InputField
                                label="暫停指令 (dwell)"
                                value={customProfile.commands.dwell}
                                onChange={(v) => updateCustomProfileCommand('dwell', v)}
                                placeholder="G4 P{ms}"
                            />
                            <InputField
                                label="註解格式 (comment)"
                                value={customProfile.commands.comment}
                                onChange={(v) => updateCustomProfileCommand('comment', v)}
                                placeholder="; {text}"
                            />
                        </CollapsibleSection>

                        <CollapsibleSection title="擠出控制" defaultOpen={false}>
                            <InputField
                                label="擠出開啟 (extruderOn)"
                                value={customProfile.commands.extruderOn}
                                onChange={(v) => updateCustomProfileCommand('extruderOn', v)}
                                placeholder="M3 S255"
                            />
                            <InputField
                                label="擠出關閉 (extruderOff)"
                                value={customProfile.commands.extruderOff}
                                onChange={(v) => updateCustomProfileCommand('extruderOff', v)}
                                placeholder="M5"
                            />
                        </CollapsibleSection>

                        <CollapsibleSection title="開始/結束 G-code">
                            <InputField
                                label="開始 G-code (startGcode)"
                                value={customProfile.startGcode}
                                onChange={(v) => updateCustomProfile({ startGcode: v })}
                                multiline
                                rows={4}
                            />
                            <InputField
                                label="結束 G-code (endGcode)"
                                value={customProfile.endGcode}
                                onChange={(v) => updateCustomProfile({ endGcode: v })}
                                multiline
                                rows={3}
                            />
                            <InputField
                                label="圖層變更 (layerChangeGcode)"
                                value={customProfile.layerChangeGcode}
                                onChange={(v) => updateCustomProfile({ layerChangeGcode: v })}
                                placeholder="; Layer {layer}"
                            />
                        </CollapsibleSection>

                        <CollapsibleSection title="格式設定" defaultOpen={false}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <InputField
                                    label="座標精度 (小數位)"
                                    value={customProfile.format.coordinateDecimals}
                                    onChange={(v) => updateCustomProfileFormat('coordinateDecimals', parseInt(v) || 3)}
                                />
                                <InputField
                                    label="擠出精度 (小數位)"
                                    value={customProfile.format.extrusionDecimals}
                                    onChange={(v) => updateCustomProfileFormat('extrusionDecimals', parseInt(v) || 5)}
                                />
                            </div>
                            <div style={{ marginTop: '12px' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '13px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={customProfile.format.useExtrusion}
                                        onChange={(e) => updateCustomProfileFormat('useExtrusion', e.target.checked)}
                                    />
                                    使用 E 軸（擠出量）
                                </label>
                            </div>
                        </CollapsibleSection>
                    </div>

                    {/* 右側：預覽與變數 */}
                    <div>
                        <CollapsibleSection title="可用變數">
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                            }}>
                                {AVAILABLE_VARIABLES.map(v => (
                                    <span
                                        key={v.name}
                                        title={v.desc}
                                        style={{
                                            padding: '4px 8px',
                                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontFamily: "'JetBrains Mono', monospace",
                                            color: '#a5b4fc',
                                            cursor: 'help',
                                        }}
                                    >
                                        {v.name}
                                    </span>
                                ))}
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="G-code 預覽">
                            <pre style={{
                                margin: 0,
                                padding: '12px',
                                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontFamily: "'JetBrains Mono', monospace",
                                color: '#94a3b8',
                                overflow: 'auto',
                                maxHeight: '400px',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.6',
                            }}>
                                {previewGcode}
                            </pre>
                        </CollapsibleSection>
                    </div>
                </div>

                {/* 底部按鈕 */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleImport}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                backgroundColor: 'transparent',
                                color: '#fff',
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            📂 載入配置
                        </button>
                        <button
                            onClick={handleExport}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                backgroundColor: 'transparent',
                                color: '#fff',
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            💾 導出配置
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setProfileEditorOpen(false)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                backgroundColor: 'transparent',
                                color: '#fff',
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                            }}
                        >
                            ✓ 儲存配置
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
