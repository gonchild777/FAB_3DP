import { Leva } from 'leva'
import Canvas3D from './components/Canvas3D'
import FileUploader from './components/FileUploader'
import ConfigUploader from './components/ConfigUploader'
import LayerSlider from './components/LayerSlider'
import AnimationPlayer from './components/AnimationPlayer'
import ControlPanel from './components/ControlPanel'
import GcodeProfileEditor from './components/GcodeProfileEditor'
import useStore from './stores/useStore'
import './App.css'

// 頂部導航列
function Header() {
  const pathData = useStore((state) => state.pathData)
  const projectName = pathData?.header?.project_name || 'FAB_3DP'

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: '56px',
      background: 'linear-gradient(180deg, rgba(20,20,30,0.98) 0%, rgba(15,15,25,0.95) 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Logo 與專案名稱 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
        }}>
          🏗️
        </div>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: 'white',
            letterSpacing: '0.5px',
          }}>
            {projectName}
          </h1>
          <span style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            G-Code Post Processor
          </span>
        </div>
      </div>

      {/* 工具列 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ConfigUploader />
        <FileUploader />
      </div>
    </header>
  )
}

// 底部狀態列
function StatusBar() {
  const pathData = useStore((state) => state.pathData)
  const animation = useStore((state) => state.animation)

  if (!pathData) return null

  const progress = Math.round(animation.progress * 100)

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '28px',
      background: 'rgba(0,0,0,0.8)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      fontSize: '11px',
      color: 'rgba(255,255,255,0.6)',
      zIndex: 100,
    }}>
      <span>📂 {pathData.header.project_name}</span>
      <span>
        {animation.isPlaying ? '▶️ 播放中' : '⏸️ 已暫停'} • {progress}%
      </span>
      <span>圖層: {pathData.layers.length} 層</span>
    </div>
  )
}

function App() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#0a0a0f',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Leva 控制面板 - 移到右上角 */}
      <Leva
        collapsed={true}
        oneLineLabels={false}
        flat={false}
        hideCopyButton={true}
        theme={{
          sizes: {
            rootWidth: '320px',
            controlWidth: '160px',
            titleBarHeight: '40px',
            rowHeight: '28px',
          },
          space: {
            sm: '6px',
            md: '12px',
          },
          radii: {
            xs: '4px',
            sm: '6px',
            lg: '10px',
          },
          fontSizes: {
            root: '11px',
            toolTip: '10px',
          },
          fonts: {
            mono: "'JetBrains Mono', monospace",
            sans: "'Inter', sans-serif",
          },
          colors: {
            elevation1: 'rgba(15, 15, 22, 0.98)',
            elevation2: 'rgba(25, 25, 35, 0.98)',
            elevation3: 'rgba(35, 35, 50, 0.98)',
            accent1: '#6366f1',
            accent2: '#818cf8',
            accent3: '#a5b4fc',
            highlight1: '#ffffff',
            highlight2: 'rgba(255, 255, 255, 0.85)',
            highlight3: 'rgba(255, 255, 255, 0.55)',
            vivid1: '#22c55e',
            folderWidgetColor: '#6366f1',
            folderTextColor: '#e2e8f0',
            toolTipBackground: 'rgba(0, 0, 0, 0.9)',
            toolTipText: '#ffffff',
          },
        }}
      />

      {/* 頂部導航 */}
      <Header />

      {/* 主內容區 */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0,
        position: 'relative',
      }}>
        {/* 左側 3D 視窗 */}
        <div style={{
          flex: 1,
          position: 'relative',
          minWidth: 0,
          height: '100%',
        }}>
          <Canvas3D />

          {/* 中央控制區 - 動畫播放器 */}
          <div style={{
            position: 'absolute',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
          }}>
            <AnimationPlayer />
          </div>

          {/* 左下角 - 圖層滑桿 */}
          <div style={{
            position: 'absolute',
            bottom: '60px',
            left: '20px',
            zIndex: 10,
          }}>
            <LayerSlider />
          </div>

          {/* 狀態列 */}
          <StatusBar />
        </div>

        {/* 右側控制面板 */}
        <aside style={{
          width: '320px',
          minWidth: '280px',
          maxWidth: '360px',
          background: 'linear-gradient(180deg, rgba(18,18,28,0.98) 0%, rgba(12,12,20,0.98) 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <ControlPanel />
        </aside>
      </div>

      {/* G-code 配置編輯器模態視窗 */}
      <GcodeProfileEditor />
    </div>
  )
}

export default App
