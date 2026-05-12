/**
 * 路徑優化控制面板
 * 提供算法選擇、執行、結果統計、回復、比較模式
 */
import { useState } from 'react'
import useStore from '../../stores/useStore'
import { usePathWorker } from '../../hooks/usePathWorker'

const SORT_ALGORITHMS = [
    { id: 'nn', label: 'Nearest Neighbor', desc: '快速貪心，30-50% 改善' },
    { id: 'nn_2opt', label: 'NN + 2-opt', desc: '標準，再強化 5-15%' },
    { id: 'nn_oropt', label: 'NN + Or-opt', desc: '補強卡位段落' },
    { id: 'sa', label: 'Simulated Annealing', desc: '跳出局部最優，最慢' },
]

const SEAM_MODES = [
    { id: 'nearest', label: '最近接縫' },
    { id: 'corner', label: '對齊角落' },
    { id: 'random', label: '隨機分散' },
]

function Card({ title, icon, children }) {
    return (
        <div style={{
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.04)',
        }}>
            {title && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '14px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                    <span style={{ fontSize: '16px' }}>{icon}</span>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: 'rgba(255, 255, 255, 0.6)',
                        textTransform: 'uppercase',
                        letterSpacing: '1.2px',
                    }}>{title}</span>
                </div>
            )}
            {children}
        </div>
    )
}

function RadioOption({ checked, onClick, label, desc }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px',
                width: '100%',
                background: checked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                border: checked ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'white',
                transition: 'all 0.15s',
            }}
        >
            <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: '2px solid',
                borderColor: checked ? '#818cf8' : 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '2px',
                flexShrink: 0,
            }}>
                {checked && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '600' }}>{label}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{desc}</div>
            </div>
        </button>
    )
}

function Checkbox({ checked, onChange, label, hint, disabled = false }) {
    return (
        <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            borderRadius: '6px',
            transition: 'background 0.15s',
            opacity: disabled ? 0.5 : 1,
        }}
            onMouseOver={(e) => !disabled && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => !disabled && onChange(e.target.checked)}
                style={{ width: '14px', height: '14px', accentColor: '#818cf8', cursor: disabled ? 'not-allowed' : 'pointer' }}
            />
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: 'white' }}>{label}</div>
                {hint && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{hint}</div>}
            </div>
        </label>
    )
}

export default function OptimizationPanel() {
    const pathData = useStore((s) => s.pathData)
    const sourceType = useStore((s) => s.sourceType)
    const originalPathData = useStore((s) => s.originalPathData)
    const setOriginalPathData = useStore((s) => s.setOriginalPathData)
    const setPathData = useStore((s) => s.setPathData)
    const settings = useStore((s) => s.optimizationSettings)
    const updateSetting = useStore((s) => s.updateOptimizationSetting)
    const optimizationResult = useStore((s) => s.optimizationResult)
    const setOptimizationResult = useStore((s) => s.setOptimizationResult)
    const isOptimizing = useStore((s) => s.isOptimizing)
    const setIsOptimizing = useStore((s) => s.setIsOptimizing)
    const compareMode = useStore((s) => s.compareMode)
    const setCompareMode = useStore((s) => s.setCompareMode)
    const revertOptimization = useStore((s) => s.revertOptimization)

    const { optimizePath, progress, message } = usePathWorker()
    const [error, setError] = useState(null)

    const isGcodeSource = sourceType === 'gcode'
    const canOptimize = !!pathData && !isOptimizing

    const handleOptimize = async () => {
        if (!pathData) return
        setError(null)
        setIsOptimizing(true)
        try {
            if (!originalPathData) setOriginalPathData(pathData)

            const baseData = originalPathData ?? pathData
            // G-code 來源：自動啟用 preserveDirection
            const effectiveOptions = {
                ...settings,
                preserveDirection: isGcodeSource,
            }
            const result = await optimizePath(baseData, effectiveOptions)
            setPathData(result.optimizedData)
            setOptimizationResult(result.stats)
        } catch (err) {
            console.error('優化失敗:', err)
            setError(err.message)
        }
        setIsOptimizing(false)
    }

    const handleRevert = () => {
        revertOptimization()
        setError(null)
    }

    return (
        <Card title="路徑優化" icon="⚡">
            {/* G-code 保留模式提示 */}
            {isGcodeSource && (
                <div style={{
                    marginBottom: '14px',
                    padding: '10px 12px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#c7d2fe',
                    lineHeight: '1.5',
                }}>
                    <div style={{ fontWeight: '700', marginBottom: '4px' }}>🔒 G-code 保留模式</div>
                    <div style={{ color: 'rgba(199, 210, 254, 0.85)' }}>
                        所有 F/E 值、M-codes、註解、列印方向與接縫位置完整保留。僅優化段落順序與空移路徑。
                    </div>
                </div>
            )}

            {/* Step 1: 排序演算法 */}
            <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    1. 排序演算法
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {SORT_ALGORITHMS.map(alg => (
                        <RadioOption
                            key={alg.id}
                            checked={settings.sortAlgorithm === alg.id}
                            onClick={() => updateSetting('sortAlgorithm', alg.id)}
                            label={alg.label}
                            desc={alg.desc}
                        />
                    ))}
                </div>
            </div>

            {/* Step 2: 輔助優化 */}
            <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    2. 輔助優化（可複選）
                </div>
                <Checkbox
                    checked={isGcodeSource ? false : settings.useReversal}
                    onChange={(v) => updateSetting('useReversal', v)}
                    label="段落方向反轉"
                    hint={isGcodeSource ? '保留模式：自動停用（會改變列印方向）' : '非封閉段落自動選最短方向'}
                    disabled={isGcodeSource}
                />
                <Checkbox
                    checked={isGcodeSource ? false : settings.useSeam}
                    onChange={(v) => updateSetting('useSeam', v)}
                    label="接縫點優化"
                    hint={isGcodeSource ? '保留模式：自動停用（會改變接縫位置）' : '封閉輪廓重新選擇起點'}
                    disabled={isGcodeSource}
                />
                {settings.useSeam && !isGcodeSource && (
                    <div style={{ paddingLeft: '32px', marginTop: '-4px', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                        {SEAM_MODES.map(m => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => updateSetting('seamMode', m.id)}
                                style={{
                                    flex: 1,
                                    padding: '4px 6px',
                                    background: settings.seamMode === m.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.04)',
                                    color: settings.seamMode === m.id ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
                                    border: '1px solid ' + (settings.seamMode === m.id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.05)'),
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                }}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                )}
                <Checkbox
                    checked={settings.useVisibilityGraph}
                    onChange={(v) => updateSetting('useVisibilityGraph', v)}
                    label="幾何約束空移"
                    hint="空移繞行幾何體內部（防穿牆）"
                />
            </div>

            {/* 執行按鈕 */}
            <button
                onClick={handleOptimize}
                disabled={!canOptimize}
                style={{
                    width: '100%',
                    padding: '12px',
                    background: canOptimize
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                        : 'rgba(255,255,255,0.08)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: canOptimize ? 'pointer' : 'not-allowed',
                    boxShadow: canOptimize ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none',
                    transition: 'all 0.2s',
                }}
            >
                {isOptimizing ? `優化中… ${progress}%` : '▶ 開始優化'}
            </button>

            {isOptimizing && message && (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', textAlign: 'center' }}>
                    {message}
                </div>
            )}

            {error && (
                <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#fca5a5',
                    fontSize: '11px',
                    borderRadius: '6px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                }}>
                    ❌ {error}
                </div>
            )}

            {/* 結果統計 */}
            {optimizationResult && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#4ade80' }}>
                            {optimizationResult.improvement}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            空移距離減少
                        </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>原始空移</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{optimizationResult.originalTravelDistance} cm</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>優化後</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#4ade80' }}>{optimizationResult.optimizedTravelDistance} cm</span>
                        </div>
                        {optimizationResult.visibilityGraph && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                                    幾何約束統計
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>繞行重建</span>
                                    <span style={{ color: '#a5b4fc' }}>{optimizationResult.visibilityGraph.modified} 段</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>保留直線</span>
                                    <span>{optimizationResult.visibilityGraph.kept} 段</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 操作按鈕 */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                        <button
                            onClick={() => setCompareMode(!compareMode)}
                            style={{
                                flex: 1,
                                padding: '8px',
                                background: compareMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.05)',
                                color: compareMode ? '#a5b4fc' : 'rgba(255,255,255,0.8)',
                                border: '1px solid ' + (compareMode ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'),
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                            }}
                        >
                            ⇄ {compareMode ? '退出比較' : '比較模式'}
                        </button>
                        <button
                            onClick={handleRevert}
                            style={{
                                flex: 1,
                                padding: '8px',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'rgba(255,255,255,0.7)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                            }}
                        >
                            ↺ 還原原始
                        </button>
                    </div>
                </div>
            )}
        </Card>
    )
}
