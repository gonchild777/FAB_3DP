# ArchPrint Pro - 技術棧規範

> **最後更新**: 2026-01-18

---

## 核心技術棧

| 層級 | 技術 | 版本 | 用途 |
|------|------|------|------|
| **建置工具** | Vite | ^5.x | 開發伺服器 & 打包 |
| **前端框架** | React | ^18.x | UI 組件 |
| **3D 渲染** | Three.js | ^0.160.x | WebGL 渲染 |
| **R3F 整合** | @react-three/fiber | ^8.x | Three.js React 封裝 |
| **3D 輔助** | @react-three/drei | ^9.x | 常用 3D 組件 |
| **狀態管理** | Zustand | ^4.x | 全域狀態 |
| **樣式框架** | Tailwind CSS | ^3.x | 原子化 CSS |
| **參數面板** | Leva | ^0.9.x | 調參 UI |
| **向量運算** | gl-matrix | ^3.x | 高效能幾何計算 |

---

## 選型理由

### Vite + React 18
- 極快的 HMR（熱模組替換）
- 零配置即可使用 JSX
- 生態成熟，文件完善

### Three.js + @react-three/fiber
- R3F 是 Three.js 的最佳 React 封裝
- 聲明式 API，易於維護
- @react-three/drei 提供大量開箱即用組件

### Zustand
- 極輕量（~1KB）
- 無 boilerplate，API 簡潔
- 與 R3F 完美配合

### Leva（取代 Tweakpane）
- 專為 R3F 生態設計
- 整合更順暢，樣式統一
- 支援複雜的嵌套面板

### Tailwind CSS
- 原子化 CSS，開發速度快
- 深色主題原生支援
- 響應式設計簡單

### gl-matrix
- 高效能向量/矩陣運算
- 專為 WebGL 優化
- API 穩定

---

## 效能優化策略

### Web Workers
將以下重型運算移至 Worker 線程：
- 懸臂角度計算 (Overhang Analysis)
- TSP 路徑排序算法
- G-code 生成

### BufferGeometry
- 使用 `InstancedMesh` 處理大量相似物件
- 頂點數據使用 `Float32Array`
- 避免每幀更新 geometry

### 狀態管理
- Zustand 使用 immutable 更新
- 避免不必要的 re-render
- 使用 selector 精確訂閱

---

## 安裝指令

```bash
# 建立專案
npm create vite@latest . -- --template react

# 安裝核心依賴
npm install three @react-three/fiber @react-three/drei
npm install zustand leva gl-matrix

# 安裝樣式
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 相關文件

- [實施計劃](./implementation_plan.md)
- [系統架構](./\@architecture.md)
- [產品規格](./\@game-design-document.md)
