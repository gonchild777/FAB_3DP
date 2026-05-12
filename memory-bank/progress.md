# ArchPrint Pro - 開發進度記錄

> **最後更新**: 2026-01-18

---

## Phase 1: 專案初始化與基礎場景

### ✅ Step 1.1 - 建立 Vite + React 專案

**完成日期**: 2026-01-18

**執行內容**:
1. 使用 `npm create vite@latest` 建立 React + JavaScript 專案
2. 執行 `npm install` 安裝所有依賴

**驗證結果**:
- ✅ `npm run dev` 成功啟動開發伺服器
- ✅ 瀏覽器開啟 `localhost:5173` 顯示 Vite + React 預設頁面
- ✅ 終端無錯誤訊息

---

### ✅ Step 1.2 - 安裝核心依賴套件

**完成日期**: 2026-01-18

**執行內容**:
1. 安裝 Three.js：`three@0.182.0`, `@react-three/fiber@9.5.0`, `@react-three/drei@10.7.7`
2. 安裝狀態管理：`zustand@5.0.10`
3. 安裝參數面板：`leva@0.10.1`
4. 安裝向量運算：`gl-matrix@3.4.4`
5. 安裝樣式：`tailwindcss@3.4.19`, `postcss@8.5.6`, `autoprefixer@10.4.23`

**驗證結果**:
- ✅ `package.json` 包含所有套件
- ✅ `tailwind.config.js` 和 `postcss.config.js` 已生成

---

### ✅ Step 1.3 - 配置 Tailwind CSS

**完成日期**: 2026-01-18

**執行內容**:
1. 修改 `tailwind.config.js`，設定 content 路徑為 `./index.html` 和 `./src/**/*.{js,jsx}`
2. 在 `src/index.css` 加入 `@tailwind base/components/utilities` 指令
3. 設定深色主題為預設（`bg-gray-900 text-white`）

**驗證結果**:
- ✅ 背景為深灰色，文字為白色
- ✅ 終端無報錯

---

### ✅ Step 1.4 - 建立基礎 Three.js 場景

**完成日期**: 2026-01-18

**執行內容**:
1. 建立 `src/components/Canvas3D/index.jsx` 組件
2. 使用 @react-three/fiber 的 Canvas 建立 3D 場景
3. 加入 OrbitControls（旋轉/縮放/平移）
4. 加入 gridHelper（1000x1000, 100分割）
5. 設定相機位置 [500, 500, 500]
6. 設定場景背景為 #1a1a2e
7. 修正 App.css 為全屏佈局

**驗證結果**:
- ✅ 頁面顯示 3D 網格地面（全螢幕）
- ✅ 滑鼠左鍵拖曳可旋轉視角
- ✅ 滑鼠滾輪可縮放
- ✅ 右鍵拖曳可平移

---

### ✅ Step 1.5 - 建立全域狀態管理 Store

**完成日期**: 2026-01-18

**執行內容**:
1. 建立 `src/stores/useStore.js`
2. 使用 Zustand 建立 store：pathData, currentLayer, showTravelMoves
3. 加入 setPathData, setCurrentLayer, setShowTravelMoves actions

**驗證結果**:
- ✅ `npm run dev` 無報錯

---

### ✅ Step 1.6 - 建立 JSON 檔案導入功能

**完成日期**: 2026-01-18

**執行內容**:
1. 建立 `src/components/FileUploader/index.jsx`
2. 實作隱藏的 file input（accept=".json"）
3. 建立藍色上傳按鈕，點擊觸發檔案選擇
4. 解析 JSON 並呼叫 setPathData 存入 store
5. 錯誤處理（非 JSON、格式錯誤）

**驗證結果**:
- ✅ 左上角顯示藍色「📂 導入 JSON」按鈕
- ✅ 點擊可選擇檔案

---

### ✅ Step 1.7 - 建立測試用 JSON 檔案

**完成日期**: 2026-01-18

**執行內容**:
1. 建立 `public/sample-path.json`
2. 包含 3 個圖層（z_height: 4, 8, 12 cm）
3. 每層有外框(120x120cm)和內框(80x80cm)的列印路徑
4. 包含 travel 類型的空移段

**驗證結果**:
- ✅ JSON 檔案可被瀏覽器正確載入
- ✅ 導入後 Console 輸出結構符合預期

---

### ✅ Step 1.8 - 實作基礎路徑渲染（BufferGeometry）

**完成日期**: 2026-01-18

**執行內容**:
1. 建立 `src/components/PathRenderer/index.jsx`
2. 將 JSON points 轉換為 Three.js BufferGeometry
3. 列印路徑使用綠色實線
4. 空移路徑使用半透明灰色實線（opacity 0.3）
5. 實現圖層過濾（layer_index <= currentLayer）

**驗證結果**:
- ✅ 導入 JSON 後顯示綠色路徑線條
- ✅ 空移路徑為灰色
- ✅ 3 層正確疊加顯示

---

### ✅ Step 1.9 - 加入圖層切換控制

**完成日期**: 2026-01-18

**執行內容**:
1. 建立 `src/components/LayerSlider/index.jsx`
2. 實現**雙滑桿**範圍控制（起始/結束圖層）
3. 更新 store 使用 startLayer 和 endLayer
4. PathRenderer 根據範圍過濾圖層

**驗證結果**:
- ✅ 底部顯示雙滑桿（起始/結束）
- ✅ 可選擇只顯示特定範圍的圖層（如只顯示第 2-3 層）
- ✅ 顯示當前選擇的圖層範圍

---

### ✅ Step 1.10 - 整合主頁面佈局

**完成日期**: 2026-01-18

**執行內容**:
1. 重構 `App.jsx` 建立主要佈局
2. 左側 3D 視窗（flex: 4）+ 右側控制面板（flex: 1）
3. 頂部標題列（Header），顯示專案名稱和上傳按鈕
4. 建立 ControlPanel 組件，顯示專案資訊
5. 確保響應式佈局（調整窗口大小正確響應）

**驗證結果**:
- ✅ 佈局正確（3D 左側大、控制面板右側小）
- ✅ 導入 JSON 後右側顯示專案資訊
- ✅ 調整窗口大小，佈局保持響應式
- ✅ 無滾動條

---

## 🎉 Phase 1 完成！

**Phase 1: 專案初始化與基礎場景** 已全部完成！

### 已實現功能：
- ✅ Vite + React + Tailwind CSS 專案架構
- ✅ Three.js 3D 場景（GridHelper, OrbitControls）
- ✅ Zustand 全域狀態管理
- ✅ JSON 路徑數據導入
- ✅ 3D 路徑渲染（BufferGeometry）
- ✅ 雙滑桿圖層範圍控制
- ✅ 響應式 80/20 佈局

---

## 🎉 Phase 2 完成！

**Phase 2: G-code 生成器** 已全部完成！

### 已實現功能：
- ✅ Leva 參數控制面板（5 個可調參數）
- ✅ G-code 核心生成邏輯
- ✅ Marlin 初始化序列
- ✅ 延遲補償（Pump On Delay + Pump Off Advance）
- ✅ E 值累加計算
- ✅ 檔案導出功能

---

## Phase 2: G-code 生成器

### ✅ Step 2.1 - 建立參數面板

**完成日期**: 2026-01-18

**執行內容**:
1. 建立 `src/components/ControlPanel/index.jsx`
2. 使用 Leva 建立參數控制面板
3. 更新 store 添加 printSettings

**驗證結果**:
- ✅ Leva 參數面板顯示正常

---

### ✅ Step 2.2-2.3 - G-code 生成核心 + 延遲補償

**完成日期**: 2026-01-18

**執行內容**:
1. 建立 `src/core/postProcessor.js`
2. 實作 Marlin 初始化序列（G28, G90, M82, G92）
3. G0 空移 / G1 列印指令生成
4. E 值累加計算公式
5. Pump On Delay（G4 暫停）
6. Pump Off Advance（提前關泵）

---

### ✅ Step 2.4-2.5 - G-code 導出 + UI 按鈕

**完成日期**: 2026-01-18

**執行內容**:
1. 建立 `src/utils/gcodeExporter.js`
2. 實作 Blob 下載
3. 在 ControlPanel 添加 Generate G-code 按鈕

**驗證結果**:
- ✅ 點擊按鈕成功下載 .gcode 檔案
- ✅ 檔案內容正確

---

## 🎉 Phase 3 完成！

**Phase 3: 基礎分析功能** 已全部完成！

### 已實現功能：
- ✅ `src/core/analyzer.js` 懸臂分析引擎
- ✅ 最近鄰搜索算法
- ✅ 懸臂角度計算 (θ = arctan(ΔXY / ΔZ))
- ✅ 熱點圖顏色渲染（綠/黃/橘/紅 四級）
- ✅ Leva 控制開關
- ✅ 顏色圖例顯示

### ✅ Step 3.1-3.3 - 懸臂分析功能

**完成日期**: 2026-01-19

**執行內容**:
1. 建立 `src/core/analyzer.js` - 分析引擎
2. 實作最近鄰點搜索
3. 計算懸臂角度並分類
4. 更新 PathRenderer 支援熱點圖
5. 添加 Leva 控制開關
6. 添加顏色圖例卡片

**顏色分級**:
- 🟢 0-30°：安全
- 🟡 30-45°：警告
- 🟠 45-70°：危險
- 🔴 >70°：嚴重

**驗證結果**:
- ✅ 開啟熱點圖後路徑顏色正確變化
- ✅ 底層為綠色（安全）
- ✅ 懸臂角度越大顏色越紅

---

## 🎉 Phase 4 完成！

**Phase 4: 路徑優化與效能提升** 已全部完成！

### 已實現功能：
- ✅ `src/workers/pathWorker.js` Web Worker 非同步處理
- ✅ 最近鄰 (Nearest Neighbor) 路徑排序
- ✅ 2-opt TSP 改進算法
- ✅ `src/hooks/usePathWorker.js` React Hook 封裝
- ✅ 空移距離優化（減少 30-50%）
- ✅ 列印時間估算
- ✅ 材料體積/線材長度/重量估算

### ✅ Step 4.1-4.3 - 路徑優化功能

**完成日期**: 2026-01-19

**執行內容**:
1. 建立 Web Worker 處理耗時運算
2. 實作最近鄰排序 + 2-opt 改進
3. 計算空移距離優化百分比
4. 時間估算（列印 + 空移）
5. 材料估算（體積 L、線材長度 m、重量 kg）

**驗證結果**:
- ✅ 路徑優化按鈕正常運作
- ✅ 顯示空移距離減少百分比
- ✅ 顯示預估時間與材料用量

---

## 🎉 Phase 5 完成！

**Phase 5: 多設備指令集支援** 已全部完成！

### ✅ Step 5.1-5.3 - 多設備 G-code 支援

**完成日期**: 2026-01-21

**執行內容**:
1. 建立 `src/core/gcodeProfiles.js` - 預設配置檔
2. 支援 Marlin / RepRap / KUKA / 自定義
3. 建立 `src/components/GcodeProfileEditor/index.jsx` - 配置編輯器
4. Store 添加 customProfile 狀態和 actions
5. Leva 面板 G-code 設備選擇器

**驗證結果**:
- ✅ 可選擇不同 G-code 風格
- ✅ 自定義配置編輯器正常運作
- ✅ 配置可儲存/載入 LocalStorage
- ✅ JSON 導入/導出

---

## 🚀 PWA 與 GitHub Pages 部署

**完成日期**: 2026-01-21

**執行內容**:
1. 安裝 `vite-plugin-pwa`
2. 配置 manifest、Service Worker
3. 生成 PWA 圖標
4. 設定 GitHub Pages 部署
5. 網站名稱更名為 FAB_3DP

**部署網址**: https://用戶名.github.io/FAB_3DP/

---

## ✅ 專案完成！

所有 Phase 1-5 已完成：
- Phase 1: 專案初始化、3D 可視化
- Phase 2: G-code 生成、延遲補償
- Phase 3: 懸臂分析、熱點圖
- Phase 4: 路徑優化 (TSP)、材料估算
- Phase 5: 多設備指令集、自定義編輯器
- 額外: PWA 支援、GitHub Pages 部署

## 🚧 Phase 9：障礙物避開

**完成日期**: 2026-05-12

> **需求**: 可以上傳障礙物幾何模型（STL / OBJ / 原型幾何體），讓列印路徑的空移完全避開這些障礙物。

### 已實現功能

1. **障礙物載入器** (`src/core/obstacleLoader.js`)
   - STL：自動偵測二進位 / ASCII 格式
   - OBJ：支援 `v` / `f`，自動三角化多邊形 face，支援多種 face 格式（`f 1 2 3`、`f 1/2 3/4`、`f 1//3` 等）
   - 統一輸出格式：`{ vertices, indices, triangleCount, bbox }`

2. **原型幾何體** (`src/core/obstaclePrimitives.js`)
   - `createBoxMesh({ width, depth, height, x, y, z })`：12 三角形
   - `createCylinderMesh({ radius, height, x, y, z, segments })`：可調精度

3. **網格切層器** (`src/core/obstacleSlicer.js`)
   - `sliceMeshAtZ(mesh, z)`：每三角形與水平面求交，鏈接成多邊形
   - `sliceAllObstaclesPerLayer`：批次處理所有障礙物 × 所有層

4. **3D 渲染** (`src/components/ObstacleRenderer/index.jsx`)
   - 半透明紅色 mesh + 線框
   - 自動座標系轉換（內部 z-up → Three.js y-up）
   - 整合進 Canvas3D

5. **ObstaclePanel UI** (`src/components/ObstaclePanel/index.jsx`)
   - STL/OBJ 檔案上傳
   - Box/Cylinder 原型表單（寬深高、半徑、中心座標）
   - 障礙物列表（每項顯示色塊、名稱、三角形數、可見性切換、刪除）
   - 設定：場景顯示、優化時避開、安全邊距（inflation）
   - 「清空全部」按鈕

6. **可視圖擴充** (`src/core/algorithms/visibilityGraph.js`)
   - `isVisible(a, b, polygon, obstacles)`：新增障礙物穿越/包含檢查
   - `buildVisibilityGraph(polygon, extra, obstacles)`：節點集擴展到障礙物頂點
   - `rebuildTravelMoves` 新增 `obstaclePolygons` 參數與 `obstacleAvoided` 統計

7. **Worker pipeline 整合** (`src/workers/pathWorker.js`)
   - 接收 `obstaclePolygonsByLayer`（主執行緒預切片）
   - 即使未啟用 Visibility Graph，只要有障礙物也會自動繞行
   - 回報 `obstacleAvoidance: { layersWithObstacles, travelsAvoided }`

8. **OptimizationPanel 整合**
   - 優化前主執行緒切片所有可見障礙物（每層）
   - 套用 inflation 膨脹（基於質心向外推）
   - 結果卡片新增「🚧 障礙物避開」區塊：受影響層數、繞道段數

9. **Store 擴充**
   - `obstacles[]`、`obstacleSettings: { showInScene, avoidInOptimization, inflation }`
   - Actions: `addObstacle` / `removeObstacle` / `updateObstacle` / `clearObstacles` / `updateObstacleSetting`

### 驗證結果
- ✅ Box 20×20×5 STL 切片 z=1 → 1 個方形多邊形
- ✅ 圓柱切片 → 1 個近似圓多邊形
- ✅ End-to-end 測試：travel (10,10)→(90,90) 穿越中央 20×20 障礙物 → 自動繞行 (10,10)→(40,60)→(90,90)
- ✅ Stats 正確：modified=1, obstacleAvoided=1
- ✅ npm run build 通過

---

## 🔒 Phase 8.5：G-code 保留模式

**完成日期**: 2026-05-12

> **需求**: 當輸入是 .gcode 檔案，路徑優化必須完整保留所有原始指令（F/E 值、M-codes、註解、列印方向、接縫位置），僅優化段落順序與空移路徑。

### 實作內容

1. **Parser 強化** (`src/core/gcodeParser.js`)
   - 每個 segment 追加 `sourceLines: string[]` — 產生此段的原始 G-code 行
   - header 新增 `preamble`（首移動前所有行）、`epilogue`（最後移動後行）
   - 新增 `defaultTravelF` 與 `sourceScale`（重新導出時換回原單位用）
   - `;LAYER:n` / `;LAYER_CHANGE` 標記抽到 `layer.layerHeader`（與 segments 分離，避免重排後遺失）

2. **演算法 preserveDirection 模式**
   - `twoOpt.js`：新增 swap-only 路徑（不反轉子序列），透過 `options.preserveDirection`
   - `simulatedAnnealing.js`：限制 op 為 swap-only
   - `nearestNeighbor.js` / `orOpt.js`：天生不反轉，無需修改

3. **Worker 自動切換** (`src/workers/pathWorker.js`)
   - `options.preserveDirection` 為 true 時：
     - 強制停用 `useReversal` 與 `useSeam`（記錄為 effectiveUseReversal/Seam）
     - 傳遞 `preserveDirection` 給 2-opt 與 SA
   - `rebuildWithTravels` 修正：Z 變化（換層）一律插入 travel 防止抬升動作遺失

4. **保留模式導出器** (`src/core/gcodePreservingExporter.js`)
   - 輸出順序：preamble → 每層 layerHeader + segments（依優化順序，原 sourceLines 直接輸出）→ epilogue
   - 優化器新生成的 travel（無 sourceLines）使用 `defaultTravelF` 生成 G0
   - 提供 `canUsePreservingExport(pathData)` 驗證

5. **UI 自動切換** (`OptimizationPanel`, `ControlPanel`)
   - G-code 來源時：
     - 頂端顯示「🔒 G-code 保留模式」提示卡
     - Reversal / Seam checkbox 灰化並 disabled
     - 自動傳遞 `preserveDirection: true` 給 worker
   - 生成按鈕：G-code 來源時顯示「💾 導出優化後 G-code（保留模式）」並走 `exportPreservedGcode`

### 驗證
- ✅ Parse sample-print.gcode 後，所有 24 行 G1+E 完整保留 sourceLines
- ✅ Optimize（NN + 2-opt preserveDirection）後重新導出，列印行數與內容完全相同
- ✅ LAYER:0/1/2 標記在 export 中位於對應層的開頭
- ✅ Z-lift travel（G0 X0 Y0 Z40）不再遺失
- ✅ preamble（G28/G90/M82/G92）與 epilogue（M104/M84）原樣保留
- ✅ npm run build 通過

---

## 🎉 Phase 8 完成！

**Phase 8: 動畫模擬增強** 已全部完成！

### 已實現功能

1. **動畫進度工具** (`src/utils/animationProgress.js`)
   - `calculateTotalPoints(layers)`、`calculateVisibleProgress(layers, progress, total)`
   - `getNozzlePosition(layers, vp)` — 含 travel/print 標記
   - `calculateSegmentCounts(layers, vp)` — 跨層累計段落索引
   - 從 PathRenderer 抽出，供 AnimationPlayer 共用

2. **噴頭游標**（`PathRenderer` 新增 `NozzleCursor`）
   - 內球：橘色實心（列印中）/ 灰藍（空移中），含 emissive 自發光
   - 外球：半透明光暈（2.5× 半徑）
   - 僅在 `0 < progress < 1` 時顯示
   - 自動依當前段落型態切換顏色（橘 = 列印、灰 = 空移）

3. **未來路徑虛影**（`PathRenderer` 新增 `FutureSegmentsOverlay`）
   - 尚未列印的段落以暗灰色（#4a5568）半透明（opacity 0.35）顯示
   - 含「當前段落內未完成的部分」邏輯：從 `pointIndex` 之後切片
   - 僅在動畫播放中啟用，靜止時恢復單一渲染模式

4. **AnimationPlayer 強化**
   - 新增 10× / 50× 速度選項（快速預覽用）
   - 新增 Layer x/y、Segment a/b 即時進度標籤
   - 利用 useMemo 避免每幀重算

### 驗證結果
- ✅ progress=0.5 在 sample-print 對應到 Layer 1 第 2 段第 0 點，座標 (0,0,8)，標記為 travel
- ✅ Layer 與 Segment 索引隨進度連續遞增（1→12）
- ✅ npm run build 通過
- ✅ Travel/print 顏色自動切換正常

---

## 🎉 Phase 7 完成！

**Phase 7: 進階路徑優化演算法** 已全部完成！

### 已實現演算法（`src/core/algorithms/`）

| 模組 | 演算法 | 用途 |
|------|--------|------|
| `nearestNeighbor.js` | NN 貪心 | 快速粗排（從 Worker 提取） |
| `twoOpt.js` | 2-opt 子序列反轉 | 局部最優改進（從 Worker 提取） |
| `orOpt.js` | Or-opt（k=1,2,3） | 移動子序列到更佳位置 |
| `simulatedAnnealing.js` | 模擬退火 | 跳出局部最優 |
| `seamOptimizer.js` | 接縫優化 | nearest/corner/random 三模式 |
| `segmentReversal.js` | 方向反轉 | 非封閉段落雙向選最短 |
| `visibilityGraph.js` | **幾何約束空移** | Dijkstra + 可視圖，繞行幾何體內部 |
| `common.js` | 共用工具 | distance、splitLayerSegments、rebuildWithTravels |

### 已實現功能

1. **OptimizationPanel** (`src/components/OptimizationPanel/index.jsx`)
   - 排序演算法 4 選 1（單選 RadioOption）
   - 輔助優化 3 項複選（反轉、接縫、幾何約束）
   - 接縫模式三按鈕切換
   - 結果統計卡片（改善百分比、原始/優化距離、VG 繞行段數）
   - 比較模式切換、還原原始按鈕

2. **PathRenderer 比較模式**
   - 新增 `OriginalOverlay` 子組件
   - 紅色半透明線條顯示原始路徑
   - 與優化後路徑（綠色）疊加顯示

3. **Store 擴充**
   - `originalPathData`、`optimizationSettings`、`optimizationResult`、`isOptimizing`、`compareMode`
   - 完整 actions + `revertOptimization`

4. **pathWorker 演算法管線**
   - `OPTIMIZE_PATH` task 改為接收 `{ sortAlgorithm, useReversal, useSeam, seamMode, useVisibilityGraph }`
   - 完整 pipeline：排序 → 反轉 → 接縫 → 重建空移 → VG 幾何約束
   - 舊版 `{ mode, apply2opt }` 自動轉換（向下相容）

### 驗證結果
- ✅ NN 對 5 段亂序輸入：250 → 45 cm（最優）
- ✅ Reversal 對 1 段測試：90 → 10 cm（反轉生效）
- ✅ VG 對凸形（square）：modified=0（保留直線）
- ✅ VG 對 C 字形：modified=1（路徑 (10,10) → (30,70) → (90,90) 繞行）
- ✅ end-to-end：sample-print.gcode → parse → optimize → VG 全流程跑通
- ✅ npm run build 通過（worker bundle 5KB → 11.8KB）

---

## 🎉 Phase 6 完成！

**Phase 6: G-code 檔案輸入與解析** 已全部完成！

### ✅ Step 6.1-6.4 - G-code Parser 與 UI 整合

**完成日期**: 2026-05-11

**執行內容**:
1. 建立 `src/core/gcodeParser.js`：
   - 完整 G-code 狀態機（G0/G1/G90/G91/G92/M82/M83）
   - 自動單位偵測（最大座標 > 500 視為 mm，自動換算為 cm）
   - 層偵測：優先 `;LAYER:n` / `;LAYER_CHANGE` 註解，次要 Z 變化
   - 中繼資料解析：nozzle_diameter、layer_height、flavor
   - 回抽（純 E 變化）自動忽略
2. 更新 `src/components/FileUploader/index.jsx`：
   - 支援 `.json` / `.gcode` / `.gco` / `.nc`
   - 副檔名分流，自動選擇對應解析器
   - 顯示來源徽章（JSON / G-code）
3. Store 新增 `sourceType` 狀態與 `setSourceType` action
4. 建立 `public/sample-print.gcode`（3 層 1200×1200mm 正方形）

**驗證結果**:
- ✅ sample-print.gcode 解析後 3 層、6 列印段、6 空移段，Z = 4/8/12 cm（mm → cm 換算正確）
- ✅ Cura 風格（M83 相對擠出 + 回抽）正確處理
- ✅ 解析結果格式與 sample-path.json 完全相容，PathRenderer 無需修改
- ✅ 來源徽章正確顯示 JSON / G-code

---

### ✅ 額外功能 - Config.ini 導入

**完成日期**: 2026-01-18

**執行內容**:
1. 建立 `src/utils/configParser.js` - INI 解析器
2. 建立 `src/components/ConfigUploader/index.jsx`
3. 更新 store 添加 machineSettings 和 gcodeTemplates
4. 更新 postProcessor 使用正確的參數來源

**參數來源邏輯**:
- 噴頭直徑 → config.ini（機器設定）
- 層高 → JSON 路徑檔案（專案設定）

**驗證結果**:
- ✅ 成功載入 PrusaSlicer config.ini
- ✅ G-code 標頭顯示正確的參數來源
