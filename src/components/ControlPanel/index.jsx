import { useControls, folder } from 'leva'
import { useState, useMemo, useEffect } from 'react'
import useStore from '../../stores/useStore'
import { generateGcode } from '../../core/postProcessor'
import { downloadGcode } from '../../utils/gcodeExporter'
import { usePathWorker } from '../../hooks/usePathWorker'
import { getProfileList, getProfile } from '../../core/gcodeProfiles'
import OptimizationPanel from '../OptimizationPanel'


// 卡片組件 - 簡約現代風格
function Card({ title, icon, children, accent = false, compact = false }) {
    return (
        <div style={{
            padding: compact ? '12px' : '16px',
            background: accent
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)'
                : 'rgba(255, 255, 255, 0.02)',
            borderRadius: '14px',
            border: accent
                ? '1px solid rgba(99, 102, 241, 0.25)'
                : '1px solid rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
        }}>
            {title && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: compact ? '10px' : '14px',
                    paddingBottom: compact ? '8px' : '12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                    <span style={{
                        fontSize: '16px',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                    }}>{icon}</span>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: accent ? '#a5b4fc' : 'rgba(255, 255, 255, 0.6)',
                        textTransform: 'uppercase',
                        letterSpacing: '1.2px',
                    }}>
                        {title}
                    </span>
                </div>
            )}
            {children}
        </div>
    )
}

// 資訊項目
function InfoItem({ label, value, color = 'white' }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0',
        }}>
            <span style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.5)',
            }}>
                {label}
            </span>
            <span style={{
                fontSize: '13px',
                color: color,
                fontWeight: '500',
                fontFamily: "'JetBrains Mono', monospace",
            }}>
                {value}
            </span>
        </div>
    )
}

export default function ControlPanel() {
    const pathData = useStore((state) => state.pathData)
    const printSettings = useStore((state) => state.printSettings)
    const machineSettings = useStore((state) => state.machineSettings)
    const updatePrintSetting = useStore((state) => state.updatePrintSetting)
    const showTravelMoves = useStore((state) => state.showTravelMoves)
    const setShowTravelMoves = useStore((state) => state.setShowTravelMoves)
    const useTubeRender = useStore((state) => state.useTubeRender)
    const setUseTubeRender = useStore((state) => state.setUseTubeRender)
    const showOverhangHeatmap = useStore((state) => state.showOverhangHeatmap)
    const setShowOverhangHeatmap = useStore((state) => state.setShowOverhangHeatmap)
    const gcodeProfileId = useStore((state) => state.gcodeProfileId)
    const setGcodeProfileId = useStore((state) => state.setGcodeProfileId)
    const setProfileEditorOpen = useStore((state) => state.setProfileEditorOpen)
    const customProfile = useStore((state) => state.customProfile)


    const [isGenerating, setIsGenerating] = useState(false)
    const [timeEstimate, setTimeEstimate] = useState(null)

    const { estimateTime } = usePathWorker()
    const setPathData = useStore((state) => state.setPathData)

    // 計算邊界
    const dimensions = useMemo(() => {
        if (!pathData) return null

        let minX = Infinity, minY = Infinity, minZ = Infinity
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

        for (const layer of pathData.layers) {
            for (const segment of layer.segments) {
                for (const point of segment.points) {
                    minX = Math.min(minX, point.x)
                    maxX = Math.max(maxX, point.x)
                    minY = Math.min(minY, point.y)
                    maxY = Math.max(maxY, point.y)
                    minZ = Math.min(minZ, point.z)
                    maxZ = Math.max(maxZ, point.z)
                }
            }
        }

        return {
            x: (maxX - minX).toFixed(1),
            y: (maxY - minY).toFixed(1),
            z: (maxZ - minZ).toFixed(1),
        }
    }, [pathData])

    // Leva 控制面板
    useControls(() => ({
        '列印參數': folder({
            printSpeed: {
                value: printSettings.printSpeed,
                min: 10, max: 200, step: 1,
                label: '列印速度 (mm/s)',
                onChange: (v) => updatePrintSetting('printSpeed', v),
            },
            travelSpeed: {
                value: printSettings.travelSpeed,
                min: 50, max: 500, step: 10,
                label: '空移速度 (mm/s)',
                onChange: (v) => updatePrintSetting('travelSpeed', v),
            },
            extrusionMultiplier: {
                value: printSettings.extrusionMultiplier,
                min: 0.5, max: 2.0, step: 0.05,
                label: '擠出乘數',
                onChange: (v) => updatePrintSetting('extrusionMultiplier', v),
            },
        }),
        '泵浦控制': folder({
            pumpOnDelay: {
                value: printSettings.pumpOnDelay,
                min: 0, max: 2000, step: 50,
                label: '開泵延遲 (ms)',
                onChange: (v) => updatePrintSetting('pumpOnDelay', v),
            },
            pumpOffAdvance: {
                value: printSettings.pumpOffAdvance,
                min: 0, max: 50, step: 1,
                label: '關泵提前 (mm)',
                onChange: (v) => updatePrintSetting('pumpOffAdvance', v),
            },
        }),
        '顯示設定': folder({
            showTravel: {
                value: showTravelMoves,
                label: '顯示空移路徑',
                onChange: (v) => setShowTravelMoves(v),
            },
            tubeRender: {
                value: useTubeRender,
                label: '3D 管狀渲染',
                onChange: (v) => setUseTubeRender(v),
            },
        }),
        '懸臂分析': folder({
            overhangHeatmap: {
                value: showOverhangHeatmap,
                label: '懸臂熱點圖',
                onChange: (v) => setShowOverhangHeatmap(v),
            },
        }),
        'G-code 設備': folder({
            profile: {
                value: gcodeProfileId,
                options: {
                    'Marlin': 'marlin',
                    'RepRap': 'reprap',
                    'KUKA Robot': 'kuka',
                    '自定義': 'custom',
                },
                label: '指令集風格',
                onChange: (v) => setGcodeProfileId(v),
            },
            editCustom: {
                value: false,
                label: '⚙️ 編輯自定義配置',
                render: () => gcodeProfileId === 'custom',
                onChange: () => setProfileEditorOpen(true),
            },
        }),
    }))

    // 生成 G-code
    const handleGenerateGcode = async () => {
        if (!pathData) return
        setIsGenerating(true)
        try {
            const gcode = generateGcode(pathData, printSettings, machineSettings, gcodeProfileId, customProfile)
            const filename = downloadGcode(gcode, pathData.header.project_name)
            console.log(`G-code 已生成 (${gcodeProfileId}): ${filename}`)
        } catch (error) {
            console.error('G-code 生成失敗:', error)
            alert(`生成失敗: ${error.message}`)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            height: '100%',
            overflowY: 'auto',
        }}>
            {/* 專案資訊 */}
            {pathData && (
                <Card title="專案資訊" icon="📋">
                    <InfoItem label="專案名稱" value={pathData.header.project_name} />
                    <InfoItem label="噴頭直徑" value={`${pathData.header.nozzle_diameter} mm`} />
                    <InfoItem label="層高" value={`${pathData.header.layer_height} mm`} />
                    <InfoItem label="圖層數" value={`${pathData.layers.length} 層`} />
                </Card>
            )}

            {/* 列印尺寸 */}
            {pathData && dimensions && (
                <Card title="列印尺寸" icon="📐" accent>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1, textAlign: 'center', padding: '12px 0' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#f87171' }}>
                                {dimensions.x}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                X (mm)
                            </div>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ flex: 1, textAlign: 'center', padding: '12px 0' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#4ade80' }}>
                                {dimensions.y}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                Y (mm)
                            </div>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ flex: 1, textAlign: 'center', padding: '12px 0' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#60a5fa' }}>
                                {dimensions.z}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                Z (mm)
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* 機器設定 */}
            {machineSettings.configName && (
                <Card title="機器設定" icon="⚙️">
                    <div style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.4)',
                        marginBottom: '8px',
                    }}>
                        {machineSettings.configName}
                    </div>
                    <InfoItem label="噴頭直徑" value={`${machineSettings.nozzleDiameter} mm`} />
                    <InfoItem label="列印床" value={`${machineSettings.bedSize.width}×${machineSettings.bedSize.height}`} />
                    <InfoItem label="溫度" value={`${machineSettings.temperature}°C`} />
                </Card>
            )}

            {/* 懸臂圖例 */}
            {showOverhangHeatmap && (
                <Card title="懸臂圖例" icon="🎨">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#22c55e' }} />
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>0° - 30°：安全</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#eab308' }} />
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>30° - 45°：警告</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#f97316' }} />
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>45° - 70°：危險</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#ef4444' }} />
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>&gt;70°：嚴重</span>
                        </div>
                    </div>
                </Card>
            )}

            {/* 路徑優化（OptimizationPanel） */}
            {pathData && <OptimizationPanel />}

            {/* 時間估算按鈕 */}
            {pathData && (
                <button
                    onClick={async () => {
                        try {
                            const r = await estimateTime(pathData, printSettings, machineSettings)
                            setTimeEstimate(r)
                        } catch (e) { console.error(e) }
                    }}
                    style={{
                        width: '100%',
                        padding: '8px',
                        background: 'rgba(96, 165, 250, 0.15)',
                        color: '#93c5fd',
                        border: '1px solid rgba(96, 165, 250, 0.3)',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                    }}
                >
                    ⏱ 估算列印時間與材料
                </button>
            )}

            {/* 時間與材料估算 */}
            {timeEstimate && (
                <Card title="列印估算" icon="⏱️" accent>
                    <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#60a5fa' }}>
                            {timeEstimate.estimatedTime.formatted}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                            預估列印時間
                        </div>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.7)'
                    }}>
                        <div>
                            <div style={{ color: 'rgba(255,255,255,0.4)' }}>列印距離</div>
                            <div style={{ fontWeight: '600' }}>{(timeEstimate.printDistance / 1000).toFixed(2)} m</div>
                        </div>
                        <div>
                            <div style={{ color: 'rgba(255,255,255,0.4)' }}>空移距離</div>
                            <div style={{ fontWeight: '600' }}>{(timeEstimate.travelDistance / 1000).toFixed(2)} m</div>
                        </div>
                        {timeEstimate.material && (
                            <>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)' }}>材料體積</div>
                                    <div style={{ fontWeight: '600', color: '#f59e0b' }}>{timeEstimate.material.volumeLiters} L</div>
                                </div>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)' }}>線材長度</div>
                                    <div style={{ fontWeight: '600', color: '#4ade80' }}>{timeEstimate.material.filamentLengthM} m</div>
                                </div>
                                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '4px' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.4)' }}>預估重量（混凝土 2.3g/cm³）</div>
                                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#ef4444' }}>{timeEstimate.material.weightKg} kg</div>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            )}

            {/* 生成按鈕 */}
            <button
                onClick={handleGenerateGcode}
                disabled={!pathData || isGenerating}
                style={{
                    padding: '14px 20px',
                    background: pathData
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: pathData ? 'pointer' : 'not-allowed',
                    opacity: isGenerating ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                    boxShadow: pathData ? '0 4px 16px rgba(102, 126, 234, 0.3)' : 'none',
                }}
            >
                {isGenerating ? '⏳ 生成中...' : '✨ 生成 G-code'}
            </button>

            {/* 空狀態提示 */}
            {!pathData && (
                <Card>
                    <div style={{
                        textAlign: 'center',
                        padding: '24px 16px',
                        color: 'rgba(255,255,255,0.4)',
                    }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
                        <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                            尚未載入專案
                        </div>
                        <div style={{ fontSize: '11px' }}>
                            請點擊右上角「導入 JSON」按鈕
                        </div>
                    </div>
                </Card>
            )}

            {/* 參數提示 */}
            <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.3)',
                textAlign: 'center',
                padding: '8px',
            }}>
                💡 更多參數請查看左上角控制面板
            </div>
        </div>
    )
}
