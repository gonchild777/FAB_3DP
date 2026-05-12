import { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../stores/useStore'

/**
 * 單個障礙物 mesh 渲染
 * 注意座標系：內部資料是 (x, y, z) with z 為垂直；Three.js 用 Y-up
 * 因此渲染時：position [x, z, y]，並對 geometry 的頂點做相同 swap
 */
function ObstacleMesh({ obstacle }) {
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry()
        // 將原始 vertices [x,y,z,...] 轉成 Three.js 的 [x,z,y,...]
        const src = obstacle.vertices
        const swapped = new Float32Array(src.length)
        for (let i = 0; i < src.length; i += 3) {
            swapped[i]     = src[i]      // x → x
            swapped[i + 1] = src[i + 2]  // z → y (up)
            swapped[i + 2] = src[i + 1]  // y → z
        }
        geo.setAttribute('position', new THREE.BufferAttribute(swapped, 3))
        geo.setIndex(new THREE.BufferAttribute(obstacle.indices, 1))
        geo.computeVertexNormals()
        return geo
    }, [obstacle.vertices, obstacle.indices])

    if (!obstacle.visible) return null

    return (
        <group>
            <mesh geometry={geometry}>
                <meshStandardMaterial
                    color={obstacle.color || '#ef4444'}
                    transparent
                    opacity={0.35}
                    roughness={0.6}
                    metalness={0.1}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* 線框輪廓 */}
            <mesh geometry={geometry}>
                <meshBasicMaterial
                    color={obstacle.color || '#ef4444'}
                    wireframe
                    transparent
                    opacity={0.5}
                />
            </mesh>
        </group>
    )
}

export default function ObstacleRenderer() {
    const obstacles = useStore((s) => s.obstacles)
    const showInScene = useStore((s) => s.obstacleSettings.showInScene)

    if (!showInScene || !obstacles.length) return null

    return (
        <group>
            {obstacles.map((obs) => (
                <ObstacleMesh key={obs.id} obstacle={obs} />
            ))}
        </group>
    )
}
