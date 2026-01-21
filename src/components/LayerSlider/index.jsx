import useStore from '../../stores/useStore'

export default function LayerSlider() {
    const pathData = useStore((state) => state.pathData)
    const startLayer = useStore((state) => state.startLayer)
    const endLayer = useStore((state) => state.endLayer)
    const setStartLayer = useStore((state) => state.setStartLayer)
    const setEndLayer = useStore((state) => state.setEndLayer)

    if (!pathData || !pathData.layers || pathData.layers.length === 0) {
        return null
    }

    const totalLayers = pathData.layers.length
    const maxLayer = totalLayers - 1

    const handleStartChange = (e) => {
        const value = parseInt(e.target.value)
        setStartLayer(Math.min(value, endLayer))
    }

    const handleEndChange = (e) => {
        const value = parseInt(e.target.value)
        setEndLayer(Math.max(value, startLayer))
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, rgba(20,20,30,0.95) 0%, rgba(30,30,45,0.95) 100%)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
            {/* 圖層圖標 */}
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
            }}>
                📚
            </div>

            {/* 起始層 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    From
                </span>
                <input
                    type="range"
                    min={0}
                    max={maxLayer}
                    value={startLayer}
                    onChange={handleStartChange}
                    style={{
                        width: '80px',
                        cursor: 'pointer',
                        accentColor: '#3b82f6',
                    }}
                />
                <span style={{
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '600',
                    fontFamily: "'JetBrains Mono', monospace",
                    minWidth: '24px',
                }}>
                    {startLayer}
                </span>
            </div>

            {/* 分隔線 */}
            <div style={{
                width: '1px',
                height: '20px',
                background: 'rgba(255,255,255,0.1)',
            }} />

            {/* 結束層 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    To
                </span>
                <input
                    type="range"
                    min={0}
                    max={maxLayer}
                    value={Math.min(endLayer, maxLayer)}
                    onChange={handleEndChange}
                    style={{
                        width: '80px',
                        cursor: 'pointer',
                        accentColor: '#3b82f6',
                    }}
                />
                <span style={{
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '600',
                    fontFamily: "'JetBrains Mono', monospace",
                    minWidth: '24px',
                }}>
                    {Math.min(endLayer, maxLayer)}
                </span>
            </div>

            {/* 總層數 */}
            <div style={{
                paddingLeft: '8px',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
            }}>
                <span style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '11px',
                }}>
                    / {totalLayers} 層
                </span>
            </div>
        </div>
    )
}
