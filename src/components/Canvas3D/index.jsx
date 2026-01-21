import { Canvas } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei'
import * as THREE from 'three'
import PathRenderer from '../PathRenderer'

// 自定義網格地面組件
function GridFloor() {
    return (
        <gridHelper
            args={[1000, 100, '#606060', '#404040']}
            rotation={[0, 0, 0]}
        />
    )
}

function Scene() {
    return (
        <>
            {/* 軌道控制器 */}
            <OrbitControls
                makeDefault
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
            />

            {/* 網格地面 - 尺寸 1000，分割 100 */}
            <GridFloor />

            {/* 坐標軸輔助器 */}
            <axesHelper args={[100]} />

            {/* 路徑渲染器 */}
            <PathRenderer />

            {/* 環境光 - 增強 */}
            <ambientLight intensity={0.6} />

            {/* 主方向光 */}
            <directionalLight position={[500, 500, 500]} intensity={1} />

            {/* 補光 - 從下方 */}
            <directionalLight position={[-200, -200, 300]} intensity={0.3} />

            {/* 側光 */}
            <directionalLight position={[-500, 300, -500]} intensity={0.4} />
        </>
    )
}

export default function Canvas3D() {
    return (
        <Canvas
            camera={{
                position: [500, 500, 500],
                fov: 50,
                near: 1,
                far: 10000
            }}
            gl={{
                antialias: true,
                logarithmicDepthBuffer: true  // 解決 z-fighting 閃爍問題
            }}
            style={{
                background: '#1a1a2e',
                width: '100%',
                height: '100%'
            }}
            resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
        >
            <Scene />
        </Canvas>
    )
}
