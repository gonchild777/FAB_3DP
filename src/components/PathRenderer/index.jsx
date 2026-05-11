import { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../stores/useStore'
import { analyzeOverhang, getOverhangColor } from '../../core/analyzer'
import { calculateTotalPoints, calculateVisibleProgress, getNozzlePosition } from '../../utils/animationProgress'

// 單個圓柱段
function CylinderSegment({ start, end, radius, color }) {
    const { position, quaternion, length } = useMemo(() => {
        const startVec = new THREE.Vector3(start.x, start.z, start.y)
        const endVec = new THREE.Vector3(end.x, end.z, end.y)

        const direction = new THREE.Vector3().subVectors(endVec, startVec)
        const length = direction.length()

        if (length < 0.001) return { position: null, quaternion: null, length: 0 }

        const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5)

        const quaternion = new THREE.Quaternion()
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())

        return { position: midPoint, quaternion, length }
    }, [start, end])

    if (!position || length < 0.001) return null

    return (
        <mesh position={position} quaternion={quaternion}>
            <cylinderGeometry args={[radius, radius, length, 16, 1]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </mesh>
    )
}

// 連接球體
function JointSphere({ point, radius, color }) {
    return (
        <mesh position={[point.x, point.z, point.y]}>
            <sphereGeometry args={[radius * 1.02, 16, 12]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </mesh>
    )
}

// 管狀路徑段組件（支持熱點圖）
function TubePathSegment({ points, radius, color, endIndex = -1, heatmapColors = null }) {
    const visiblePoints = endIndex >= 0 ? points.slice(0, endIndex + 1) : points

    if (visiblePoints.length < 2) return null

    return (
        <group>
            {visiblePoints.slice(0, -1).map((point, i) => {
                const segmentColor = heatmapColors ? (heatmapColors[i] || color) : color
                return (
                    <CylinderSegment
                        key={`cyl-${i}`}
                        start={point}
                        end={visiblePoints[i + 1]}
                        radius={radius}
                        color={segmentColor}
                    />
                )
            })}
            {visiblePoints.map((point, i) => {
                const sphereColor = heatmapColors ? (heatmapColors[i] || color) : color
                return (
                    <JointSphere
                        key={`sph-${i}`}
                        point={point}
                        radius={radius}
                        color={sphereColor}
                    />
                )
            })}
        </group>
    )
}

// 線條路徑（支持熱點圖）
function LinePathSegment({ points, color, opacity = 1, endIndex = -1 }) {
    const geometry = useMemo(() => {
        const visiblePoints = endIndex >= 0 ? points.slice(0, endIndex + 1) : points
        if (visiblePoints.length < 2) return null

        const pathPoints = visiblePoints.map((p) => new THREE.Vector3(p.x, p.z, p.y))
        return new THREE.BufferGeometry().setFromPoints(pathPoints)
    }, [points, endIndex])

    if (!geometry) return null

    return (
        <line geometry={geometry}>
            <lineBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} />
        </line>
    )
}

// 噴頭游標：橘色雙球體，沿路徑移動
function NozzleCursor({ position, radius, isTravel }) {
    if (!position) return null
    const innerColor = isTravel ? '#94a3b8' : '#fb923c'
    const outerColor = isTravel ? '#cbd5e1' : '#fed7aa'

    return (
        <group position={[position.x, position.z, position.y]}>
            {/* 外層光暈 */}
            <mesh>
                <sphereGeometry args={[radius * 2.5, 16, 12]} />
                <meshBasicMaterial color={outerColor} transparent opacity={0.25} />
            </mesh>
            {/* 內層實心 */}
            <mesh>
                <sphereGeometry args={[radius * 1.3, 24, 16]} />
                <meshStandardMaterial color={innerColor} emissive={innerColor} emissiveIntensity={0.4} roughness={0.3} metalness={0.2} />
            </mesh>
        </group>
    )
}

// 未來路徑虛影：尚未列印的段落以暗灰色顯示
function FutureSegmentsOverlay({ layers, visibleProgress, showTravelMoves }) {
    return (
        <group>
            {layers.map((layer, li) => {
                if (li < visibleProgress.layerIndex) return null
                const isCurrent = li === visibleProgress.layerIndex

                return (
                    <group key={`fut-${layer.layer_index}`}>
                        {layer.segments.map((seg, si) => {
                            if (isCurrent && si < visibleProgress.segmentIndex) return null
                            if (seg.type === 'travel' && !showTravelMoves) return null

                            // 當前 segment：從 pointIndex 之後渲染
                            if (isCurrent && si === visibleProgress.segmentIndex) {
                                const startIdx = Math.max(0, visibleProgress.pointIndex)
                                const remaining = seg.points.slice(startIdx)
                                if (remaining.length < 2) return null
                                return (
                                    <LinePathSegment
                                        key={`fut-${li}-${si}`}
                                        points={remaining}
                                        color="#4a5568"
                                        opacity={0.35}
                                    />
                                )
                            }

                            // 完整未來段落
                            return (
                                <LinePathSegment
                                    key={`fut-${li}-${si}`}
                                    points={seg.points}
                                    color="#4a5568"
                                    opacity={0.35}
                                />
                            )
                        })}
                    </group>
                )
            })}
        </group>
    )
}

// 單層渲染（支持熱點圖）
function LayerRenderer({
    layer,
    showTravelMoves,
    useTubeRender,
    showOverhangHeatmap,
    analysisResult,
    isLastVisibleLayer,
    lastSegmentIndex,
    lastPointIndex,
    nozzleRadius
}) {
    // 建立點到顏色的映射
    const getPointColors = (segment, segmentIndex) => {
        if (!showOverhangHeatmap || !analysisResult) return null

        // 找到這個 segment 在分析結果中對應的點
        const colors = segment.points.map((point, pointIndex) => {
            // 簡化：使用層索引計算近似顏色
            const layerIndex = layer.layer_index
            if (layerIndex === 0) return '#22c55e' // 底層安全

            // 從分析結果中查找對應點的角度
            const matchingPoint = analysisResult.pointAngles.find(
                p => p.layerIndex === layerIndex &&
                    Math.abs(p.x - point.x) < 0.01 &&
                    Math.abs(p.y - point.y) < 0.01
            )

            if (matchingPoint) {
                return getOverhangColor(matchingPoint.angle)
            }

            return '#4ade80' // 預設綠色
        })

        return colors
    }

    return (
        <group>
            {layer.segments.map((segment, segmentIndex) => {
                if (isLastVisibleLayer && segmentIndex > lastSegmentIndex) return null

                const isTravel = segment.type === 'travel'
                const isPrinting = !isTravel && segment.is_extruding

                // 空移 - 線條
                if (isTravel) {
                    if (!showTravelMoves) return null
                    const endIndex = isLastVisibleLayer && segmentIndex === lastSegmentIndex ? lastPointIndex : -1
                    return <LinePathSegment key={`t-${segmentIndex}`} points={segment.points} color="#808080" opacity={0.3} endIndex={endIndex} />
                }

                // 列印路徑
                if (isPrinting) {
                    const endIndex = isLastVisibleLayer && segmentIndex === lastSegmentIndex ? lastPointIndex : -1
                    const heatmapColors = showOverhangHeatmap ? getPointColors(segment, segmentIndex) : null
                    const defaultColor = showOverhangHeatmap ? '#22c55e' : '#4ade80'

                    if (useTubeRender) {
                        return (
                            <TubePathSegment
                                key={`p-${segmentIndex}`}
                                points={segment.points}
                                radius={nozzleRadius}
                                color={defaultColor}
                                endIndex={endIndex}
                                heatmapColors={heatmapColors}
                            />
                        )
                    } else {
                        // 線條模式：使用第一個點的顏色
                        const lineColor = heatmapColors ? heatmapColors[0] : defaultColor
                        return <LinePathSegment key={`l-${segmentIndex}`} points={segment.points} color={lineColor} opacity={1} endIndex={endIndex} />
                    }
                }

                return null
            })}
        </group>
    )
}

// 原始路徑覆蓋層（比較模式用，紅色半透明線條）
function OriginalOverlay({ pathData, startLayer, endLayer }) {
    if (!pathData?.layers) return null

    const visibleLayers = pathData.layers.filter(
        (l) => l.layer_index >= startLayer && l.layer_index <= endLayer
    )

    return (
        <group>
            {visibleLayers.map((layer) => (
                <group key={`orig-${layer.layer_index}`}>
                    {layer.segments.map((segment, si) => {
                        if (segment.type !== 'travel' && !segment.is_extruding) return null
                        return (
                            <LinePathSegment
                                key={`orig-s-${si}`}
                                points={segment.points}
                                color={segment.type === 'travel' ? '#fca5a5' : '#ef4444'}
                                opacity={segment.type === 'travel' ? 0.25 : 0.4}
                            />
                        )
                    })}
                </group>
            ))}
        </group>
    )
}

// 主渲染器
export default function PathRenderer() {
    const pathData = useStore((state) => state.pathData)
    const originalPathData = useStore((state) => state.originalPathData)
    const compareMode = useStore((state) => state.compareMode)
    const startLayer = useStore((state) => state.startLayer)
    const endLayer = useStore((state) => state.endLayer)
    const showTravelMoves = useStore((state) => state.showTravelMoves)
    const useTubeRender = useStore((state) => state.useTubeRender)
    const showOverhangHeatmap = useStore((state) => state.showOverhangHeatmap)
    const animation = useStore((state) => state.animation)
    const machineSettings = useStore((state) => state.machineSettings)

    // 計算懸臂分析結果（僅當啟用熱點圖時）
    const analysisResult = useMemo(() => {
        if (!showOverhangHeatmap || !pathData) return null
        return analyzeOverhang(pathData)
    }, [showOverhangHeatmap, pathData])

    if (!pathData?.layers) return null

    const nozzleDiameter = machineSettings?.nozzleDiameter || pathData.header.nozzle_diameter
    const nozzleRadius = nozzleDiameter / 2

    const visibleLayers = pathData.layers.filter(
        (layer) => layer.layer_index >= startLayer && layer.layer_index <= endLayer
    )

    const totalPoints = calculateTotalPoints(visibleLayers)
    const visibleProgress = animation.progress >= 1
        ? { layerIndex: visibleLayers.length, segmentIndex: -1, pointIndex: -1 }
        : calculateVisibleProgress(visibleLayers, animation.progress, totalPoints)

    // 動畫中（0 < progress < 1）才顯示噴頭游標與未來虛影
    const isAnimating = animation.progress > 0 && animation.progress < 1
    const nozzlePos = isAnimating ? getNozzlePosition(visibleLayers, visibleProgress) : null

    return (
        <group>
            {compareMode && originalPathData && (
                <OriginalOverlay
                    pathData={originalPathData}
                    startLayer={startLayer}
                    endLayer={endLayer}
                />
            )}

            {/* 未來路徑虛影（暗灰色） */}
            {isAnimating && (
                <FutureSegmentsOverlay
                    layers={visibleLayers}
                    visibleProgress={visibleProgress}
                    showTravelMoves={showTravelMoves}
                />
            )}

            {visibleLayers.map((layer, layerArrayIndex) => {
                if (layerArrayIndex > visibleProgress.layerIndex) return null
                const isLastVisibleLayer = layerArrayIndex === visibleProgress.layerIndex

                return (
                    <LayerRenderer
                        key={layer.layer_index}
                        layer={layer}
                        showTravelMoves={showTravelMoves}
                        useTubeRender={useTubeRender}
                        showOverhangHeatmap={showOverhangHeatmap}
                        analysisResult={analysisResult}
                        isLastVisibleLayer={isLastVisibleLayer}
                        lastSegmentIndex={isLastVisibleLayer ? visibleProgress.segmentIndex : layer.segments.length - 1}
                        lastPointIndex={isLastVisibleLayer ? visibleProgress.pointIndex : -1}
                        nozzleRadius={nozzleRadius}
                    />
                )
            })}

            {/* 噴頭游標 */}
            {nozzlePos && (
                <NozzleCursor
                    position={nozzlePos}
                    radius={nozzleRadius}
                    isTravel={nozzlePos.isTravel}
                />
            )}
        </group>
    )
}
