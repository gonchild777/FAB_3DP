/**
 * 障礙物管理面板
 * - 上傳 STL / OBJ
 * - 新增原型幾何體（Box / Cylinder）
 * - 列表顯示已載入障礙物（可開關顯示、刪除）
 * - 設定：場景顯示、優化時避開、安全邊距
 */
import { useRef, useState } from 'react'
import useStore from '../../stores/useStore'
import { loadObstacleFile } from '../../core/obstacleLoader'
import { createBoxMesh, createCylinderMesh } from '../../core/obstaclePrimitives'

const OBSTACLE_COLORS = ['#ef4444', '#f59e0b', '#a855f7', '#06b6d4', '#84cc16']

function genId() {
    return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function Card({ title, icon, children, compact = false }) {
    return (
        <div style={{
            padding: compact ? '12px' : '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.04)',
        }}>
            {title && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '12px',
                    paddingBottom: '10px',
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

function PrimitiveForm({ onAdd }) {
    const [type, setType] = useState('box')
    const [dims, setDims] = useState({ w: 30, d: 30, h: 20, r: 15 })
    const [pos, setPos] = useState({ x: 60, y: 60, z: 10 })

    const handleAdd = () => {
        let mesh
        if (type === 'box') {
            mesh = createBoxMesh({ width: dims.w, depth: dims.d, height: dims.h, x: pos.x, y: pos.y, z: pos.z })
        } else {
            mesh = createCylinderMesh({ radius: dims.r, height: dims.h, x: pos.x, y: pos.y, z: pos.z, segments: 24 })
        }
        onAdd({
            id: genId(),
            name: type === 'box'
                ? `Box ${dims.w}×${dims.d}×${dims.h}`
                : `Cyl r${dims.r} h${dims.h}`,
            type,
            ...mesh,
            visible: true,
        })
    }

    const inputStyle = {
        width: '100%',
        padding: '4px 6px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '4px',
        color: 'white',
        fontSize: '11px',
        fontFamily: "'JetBrains Mono', monospace",
    }
    const labelStyle = { fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
                <button
                    onClick={() => setType('box')}
                    style={{
                        flex: 1,
                        padding: '6px',
                        background: type === 'box' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                        color: type === 'box' ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
                        border: '1px solid ' + (type === 'box' ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)'),
                        borderRadius: '6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                    }}
                >
                    ⬛ 長方體
                </button>
                <button
                    onClick={() => setType('cyl')}
                    style={{
                        flex: 1,
                        padding: '6px',
                        background: type === 'cyl' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                        color: type === 'cyl' ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
                        border: '1px solid ' + (type === 'cyl' ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)'),
                        borderRadius: '6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                    }}
                >
                    ⬭ 圓柱
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {type === 'box' ? (
                    <>
                        <div><div style={labelStyle}>寬 W</div><input type="number" value={dims.w} onChange={e => setDims({ ...dims, w: +e.target.value })} style={inputStyle} /></div>
                        <div><div style={labelStyle}>深 D</div><input type="number" value={dims.d} onChange={e => setDims({ ...dims, d: +e.target.value })} style={inputStyle} /></div>
                        <div><div style={labelStyle}>高 H</div><input type="number" value={dims.h} onChange={e => setDims({ ...dims, h: +e.target.value })} style={inputStyle} /></div>
                    </>
                ) : (
                    <>
                        <div><div style={labelStyle}>半徑</div><input type="number" value={dims.r} onChange={e => setDims({ ...dims, r: +e.target.value })} style={inputStyle} /></div>
                        <div style={{ gridColumn: 'span 2' }}><div style={labelStyle}>高 H</div><input type="number" value={dims.h} onChange={e => setDims({ ...dims, h: +e.target.value })} style={inputStyle} /></div>
                    </>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                <div><div style={labelStyle}>X 中心</div><input type="number" value={pos.x} onChange={e => setPos({ ...pos, x: +e.target.value })} style={inputStyle} /></div>
                <div><div style={labelStyle}>Y 中心</div><input type="number" value={pos.y} onChange={e => setPos({ ...pos, y: +e.target.value })} style={inputStyle} /></div>
                <div><div style={labelStyle}>Z 中心</div><input type="number" value={pos.z} onChange={e => setPos({ ...pos, z: +e.target.value })} style={inputStyle} /></div>
            </div>

            <button
                onClick={handleAdd}
                style={{
                    padding: '8px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                }}
            >
                ＋ 新增障礙物
            </button>
        </div>
    )
}

export default function ObstaclePanel() {
    const obstacles = useStore((s) => s.obstacles)
    const addObstacle = useStore((s) => s.addObstacle)
    const removeObstacle = useStore((s) => s.removeObstacle)
    const updateObstacle = useStore((s) => s.updateObstacle)
    const clearObstacles = useStore((s) => s.clearObstacles)
    const obstacleSettings = useStore((s) => s.obstacleSettings)
    const updateObstacleSetting = useStore((s) => s.updateObstacleSetting)

    const fileInputRef = useRef(null)
    const [error, setError] = useState(null)
    const [showPrimitive, setShowPrimitive] = useState(false)

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setError(null)
        try {
            const mesh = await loadObstacleFile(file)
            const colorIdx = obstacles.length % OBSTACLE_COLORS.length
            addObstacle({
                id: genId(),
                name: file.name,
                type: 'mesh',
                ...mesh,
                visible: true,
                color: OBSTACLE_COLORS[colorIdx],
            })
            console.log(`障礙物已載入: ${file.name} (${mesh.triangleCount} 三角形)`)
        } catch (err) {
            console.error('障礙物載入失敗:', err)
            setError(err.message)
        }
        e.target.value = ''
    }

    return (
        <Card title="障礙物" icon="🚧">
            {/* 上傳 + 原型新增 */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".stl,.obj"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        flex: 1,
                        padding: '8px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                    }}
                >
                    📁 上傳 STL/OBJ
                </button>
                <button
                    onClick={() => setShowPrimitive(!showPrimitive)}
                    style={{
                        flex: 1,
                        padding: '8px',
                        background: showPrimitive ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                        color: showPrimitive ? '#a5b4fc' : 'rgba(255,255,255,0.7)',
                        border: '1px solid ' + (showPrimitive ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'),
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                    }}
                >
                    ＋ 幾何體
                </button>
            </div>

            {showPrimitive && (
                <div style={{ marginBottom: '10px' }}>
                    <PrimitiveForm onAdd={(o) => { addObstacle(o); setShowPrimitive(false) }} />
                </div>
            )}

            {error && (
                <div style={{
                    padding: '6px',
                    background: 'rgba(239,68,68,0.15)',
                    color: '#fca5a5',
                    fontSize: '10px',
                    borderRadius: '4px',
                    border: '1px solid rgba(239,68,68,0.3)',
                    marginBottom: '8px',
                }}>{error}</div>
            )}

            {/* 障礙物列表 */}
            {obstacles.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    {obstacles.map((obs) => (
                        <div key={obs.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 8px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '6px',
                            border: `1px solid ${obs.color}40`,
                        }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: obs.color, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '11px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {obs.name}
                                </div>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
                                    {obs.triangleCount}△ · {obs.type}
                                </div>
                            </div>
                            <button
                                onClick={() => updateObstacle(obs.id, { visible: !obs.visible })}
                                title={obs.visible ? '隱藏' : '顯示'}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: obs.visible ? '#a5b4fc' : 'rgba(255,255,255,0.3)' }}
                            >
                                {obs.visible ? '👁' : '⊘'}
                            </button>
                            <button
                                onClick={() => removeObstacle(obs.id)}
                                title="刪除"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px' }}>
                    尚無障礙物
                </div>
            )}

            {/* 設定 */}
            <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={obstacleSettings.showInScene}
                        onChange={(e) => updateObstacleSetting('showInScene', e.target.checked)}
                        style={{ accentColor: '#818cf8' }}
                    />
                    <span style={{ fontSize: '11px', color: 'white' }}>3D 場景顯示</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={obstacleSettings.avoidInOptimization}
                        onChange={(e) => updateObstacleSetting('avoidInOptimization', e.target.checked)}
                        style={{ accentColor: '#818cf8' }}
                    />
                    <span style={{ fontSize: '11px', color: 'white' }}>優化時讓空移避開</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                    <span style={{ fontSize: '11px', color: 'white', flex: 1 }}>安全邊距 (cm)</span>
                    <input
                        type="number"
                        value={obstacleSettings.inflation}
                        onChange={(e) => updateObstacleSetting('inflation', +e.target.value)}
                        min={0}
                        max={50}
                        step={0.5}
                        style={{
                            width: '60px',
                            padding: '4px 6px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '11px',
                            textAlign: 'right',
                        }}
                    />
                </div>
            </div>

            {obstacles.length > 0 && (
                <button
                    onClick={clearObstacles}
                    style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '6px',
                        background: 'rgba(239,68,68,0.1)',
                        color: '#fca5a5',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '6px',
                        fontSize: '10px',
                        cursor: 'pointer',
                    }}
                >
                    清空全部
                </button>
            )}
        </Card>
    )
}
