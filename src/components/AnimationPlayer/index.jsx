import { useEffect, useRef, useMemo } from 'react'
import useStore from '../../stores/useStore'
import {
    calculateTotalPoints,
    calculateVisibleProgress,
    calculateSegmentCounts,
} from '../../utils/animationProgress'

export default function AnimationPlayer() {
    const pathData = useStore((state) => state.pathData)
    const startLayer = useStore((state) => state.startLayer)
    const endLayer = useStore((state) => state.endLayer)
    const animation = useStore((state) => state.animation)
    const setAnimationPlaying = useStore((state) => state.setAnimationPlaying)
    const setAnimationProgress = useStore((state) => state.setAnimationProgress)
    const setAnimationSpeed = useStore((state) => state.setAnimationSpeed)
    const resetAnimation = useStore((state) => state.resetAnimation)

    // 計算當前 layer / segment 進度
    const progressInfo = useMemo(() => {
        if (!pathData?.layers) return null
        const visibleLayers = pathData.layers.filter(
            (l) => l.layer_index >= startLayer && l.layer_index <= endLayer
        )
        if (visibleLayers.length === 0) return null

        const totalPoints = calculateTotalPoints(visibleLayers)
        const vp = animation.progress >= 1
            ? { layerIndex: visibleLayers.length - 1, segmentIndex: visibleLayers[visibleLayers.length - 1].segments.length - 1, pointIndex: -1 }
            : calculateVisibleProgress(visibleLayers, animation.progress, totalPoints)

        const segCount = calculateSegmentCounts(visibleLayers, vp)
        const currentLayerNum = visibleLayers[Math.min(vp.layerIndex, visibleLayers.length - 1)]?.layer_index ?? 0

        return {
            currentLayer: currentLayerNum + 1,
            totalLayers: visibleLayers.length,
            currentSegment: segCount.currentSegment,
            totalSegments: segCount.totalSegments,
        }
    }, [pathData, startLayer, endLayer, animation.progress])

    const animationRef = useRef(null)
    const lastTimeRef = useRef(0)
    const progressRef = useRef(animation.progress)
    const speedRef = useRef(animation.speed)

    useEffect(() => {
        progressRef.current = animation.progress
    }, [animation.progress])

    useEffect(() => {
        speedRef.current = animation.speed
    }, [animation.speed])

    useEffect(() => {
        if (!animation.isPlaying || !pathData) {
            lastTimeRef.current = 0
            return
        }

        const animate = (currentTime) => {
            if (lastTimeRef.current === 0) {
                lastTimeRef.current = currentTime
            }

            const deltaTime = currentTime - lastTimeRef.current
            lastTimeRef.current = currentTime

            const baseDuration = 10000
            const progressIncrement = (deltaTime / baseDuration) * speedRef.current

            const newProgress = progressRef.current + progressIncrement
            progressRef.current = newProgress

            if (newProgress >= 1) {
                setAnimationProgress(1)
                setAnimationPlaying(false)
                lastTimeRef.current = 0
            } else {
                setAnimationProgress(newProgress)
                animationRef.current = requestAnimationFrame(animate)
            }
        }

        animationRef.current = requestAnimationFrame(animate)

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [animation.isPlaying, pathData, setAnimationProgress, setAnimationPlaying])

    if (!pathData) return null

    const handlePlayPause = () => {
        if (animation.progress >= 1) {
            progressRef.current = 0
            resetAnimation()
            setTimeout(() => setAnimationPlaying(true), 50)
        } else {
            setAnimationPlaying(!animation.isPlaying)
        }
    }

    const handleReset = () => {
        progressRef.current = 0
        resetAnimation()
    }

    const handleProgressChange = (e) => {
        const value = parseFloat(e.target.value)
        progressRef.current = value
        setAnimationProgress(value)
    }

    const progressPercent = Math.round(animation.progress * 100)

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, rgba(20,20,30,0.95) 0%, rgba(30,30,45,0.95) 100%)',
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
            {/* 播放/暫停 */}
            <button
                onClick={handlePlayPause}
                style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: 'none',
                    background: animation.isPlaying
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: animation.isPlaying
                        ? '0 4px 12px rgba(245, 158, 11, 0.4)'
                        : '0 4px 12px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.2s ease',
                }}
            >
                {animation.isPlaying ? '⏸' : '▶️'}
            </button>

            {/* 重置 */}
            <button
                onClick={handleReset}
                style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                }}
            >
                ⏮
            </button>

            {/* 進度條 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: '200px',
            }}>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.001}
                    value={animation.progress}
                    onChange={handleProgressChange}
                    style={{
                        flex: 1,
                        cursor: 'pointer',
                        accentColor: '#667eea',
                        height: '6px',
                    }}
                />
                <span style={{
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '600',
                    fontFamily: "'JetBrains Mono', monospace",
                    minWidth: '45px',
                    textAlign: 'right',
                }}>
                    {progressPercent}%
                </span>
            </div>

            {/* 速度 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingLeft: '8px',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
            }}>
                <span style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    Speed
                </span>
                <select
                    value={animation.speed}
                    onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                    style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                    }}
                >
                    <option value={0.25}>0.25×</option>
                    <option value={0.5}>0.5×</option>
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                    <option value={4}>4×</option>
                    <option value={10}>10×</option>
                    <option value={50}>50×</option>
                </select>
            </div>

            {/* Layer / Segment 進度標籤 */}
            {progressInfo && (
                <div style={{
                    paddingLeft: '12px',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    fontFamily: "'JetBrains Mono', monospace",
                }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Layer
                    </div>
                    <div style={{ fontSize: '12px', color: 'white', fontWeight: '600' }}>
                        {progressInfo.currentLayer} / {progressInfo.totalLayers}
                    </div>
                </div>
            )}
            {progressInfo && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    fontFamily: "'JetBrains Mono', monospace",
                }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Segment
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>
                        {progressInfo.currentSegment} / {progressInfo.totalSegments}
                    </div>
                </div>
            )}
        </div>
    )
}
