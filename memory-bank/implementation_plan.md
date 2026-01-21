# ArchPrint Pro - 分步實施計劃

> **目標**: 建立一個建築 3D 列印預檢平台，支援 JSON 路徑導入、3D 視覺化、G-code 生成
> **原則**: 每步小而具體，先完成基礎功能，再逐步擴展

---

## 已確認規格 (Confirmed Specifications)

| 項目 | 決定 |
|------|------|
| **座標單位** | 公分 (cm) |
| **列印範圍** | 120cm × 120cm (1.2m × 1.2m) |
| **泵浦關閉方式** | 將 E 值設為 0 |
| **空移路徑渲染** | 半透明灰色實線（非虛線）|
| **懸臂計算方式** | 每個點找最近鄰下層點 |
| **G-code 初始化** | 包含標準 Marlin 初始化指令 |

---

## Phase 1: 專案初始化與基礎場景

### Step 1.1 - 建立 Vite + React 專案

**指令**:
1. 使用 Vite 建立新的 React 專案，專案名稱為當前目錄
2. 選擇 React + JavaScript 模板
3. 安裝所有依賴

**驗證測試**:
- 執行開發伺服器，瀏覽器開啟 `localhost:5173`
- 確認顯示 Vite + React 預設歡迎頁面
- 終端無錯誤訊息

---

### Step 1.2 - 安裝核心依賴套件

**指令**:
1. 安裝 Three.js 相關套件：`three`, `@react-three/fiber`, `@react-three/drei`
2. 安裝狀態管理：`zustand`
3. 安裝參數面板：`leva`
4. 安裝向量運算：`gl-matrix`
5. 安裝樣式框架：`tailwindcss`, `postcss`, `autoprefixer`
6. 初始化 Tailwind CSS 配置

**驗證測試**:
- 檢查 `package.json` 包含所有上述套件
- 執行 `npm run dev` 無報錯
- 確認 `tailwind.config.js` 已生成

---

### Step 1.3 - 配置 Tailwind CSS

**指令**:
1. 修改 `tailwind.config.js`，設定 content 路徑為 `./index.html` 和 `./src/**/*.{js,jsx}`
2. 在主 CSS 檔案中加入 Tailwind 的三個基礎指令層
3. 設定深色主題為預設

**驗證測試**:
- 在任意組件加入 Tailwind class（如 `bg-gray-900 text-white`）
- 重新載入頁面，確認樣式生效
- 背景應為深灰色，文字為白色

---

### Step 1.4 - 建立基礎 Three.js 場景

**指令**:
1. 建立 `src/components/Canvas3D/index.jsx` 組件
2. 使用 `@react-three/fiber` 的 Canvas 組件建立 3D 場景
3. 加入 OrbitControls 支援滑鼠拖曳旋轉
4. 加入 GridHelper 顯示地面網格（尺寸 1000x1000，分割 100）
5. 設定相機初始位置為 `[500, 500, 500]`，看向原點
6. 設定場景背景為深色（如 `#1a1a2e`）

**驗證測試**:
- 頁面顯示 3D 網格地面
- 滑鼠左鍵拖曳可旋轉視角
- 滑鼠滾輪可縮放
- 右鍵拖曳可平移

---

### Step 1.5 - 建立全域狀態管理 Store

**指令**:
1. 建立 `src/stores/useStore.js`
2. 使用 Zustand 建立 store，包含以下初始狀態：
   - `pathData`: null（儲存導入的 JSON）
   - `currentLayer`: 0（當前顯示層數）
   - `showTravelMoves`: true（是否顯示空移路徑）
3. 加入 action：`setPathData(data)`、`setCurrentLayer(layer)`

**驗證測試**:
- 在任意組件中 import useStore
- 呼叫 `setPathData({ test: 123 })`
- 確認 `pathData` 狀態已更新（可用 console.log 或 React DevTools）

---

### Step 1.6 - 建立 JSON 檔案導入功能

**指令**:
1. 建立 `src/components/FileUploader/index.jsx` 組件
2. 實作一個隱藏的 `<input type="file" accept=".json">` 元素
3. 建立一個按鈕，點擊時觸發檔案選擇
4. 讀取選中的 JSON 檔案內容
5. 解析 JSON 並呼叫 `setPathData` 存入 store
6. 處理錯誤情況（非法 JSON、檔案讀取失敗）

**驗證測試**:
- 點擊上傳按鈕，選擇一個有效的 JSON 檔案
- Console 輸出解析後的物件
- 選擇一個非 JSON 檔案，應顯示錯誤提示
- 選擇一個格式錯誤的 JSON，應顯示解析錯誤

---

### Step 1.7 - 建立測試用 JSON 檔案

**指令**:
1. 在專案根目錄建立 `public/sample-path.json`
2. 按照 GDD 定義的數據協定格式，建立一個包含以下內容的測試資料：
   - 3 個圖層（layer_index 0, 1, 2）
   - 每層 2 個列印路徑段（segments）
   - 每段包含 4-5 個座標點
   - 加入一個 travel 類型的空移段
   - **座標單位為公分 (cm)**
   - **範圍約 0-120cm 的正方形底座**

**驗證測試**:
- JSON 檔案可被瀏覽器正確載入
- 使用 Step 1.6 的上傳功能導入此檔案
- Console 輸出的結構符合預期

---

### Step 1.8 - 實作基礎路徑渲染（BufferGeometry）

**指令**:
1. 建立 `src/components/PathRenderer/index.jsx` 組件
2. 從 store 讀取 `pathData`
3. 將所有 segments 的 points 轉換為 Three.js 的 BufferGeometry
4. 使用 `<line>` 或 `<lineSegments>` 渲染路徑
5. 列印路徑使用綠色實線
6. 空移路徑使用**半透明灰色實線**（opacity 約 0.3）
6. 在 Canvas3D 中加入 PathRenderer 組件

**驗證測試**:
- 導入測試 JSON 後，3D 場景顯示路徑線條
- 列印路徑為綠色實線
- 空移路徑為灰色（若 `showTravelMoves` 為 true）
- 路徑位置與 JSON 座標一致

---

### Step 1.9 - 加入圖層切換控制

**指令**:
1. 建立 `src/components/LayerSlider/index.jsx` 組件
2. 使用 Leva 或原生 HTML range input 建立滑桿
3. 滑桿範圍為 0 到最大圖層數
4. 滑動時更新 store 的 `currentLayer`
5. 修改 PathRenderer，只渲染 `layer_index <= currentLayer` 的圖層

**驗證測試**:
- 滑桿顯示在畫面上
- 拖動滑桿，3D 場景中的路徑逐層顯示/隱藏
- 滑桿值 = 0 時只顯示第一層
- 滑桿值 = max 時顯示所有層

---

### Step 1.10 - 整合主頁面佈局

**指令**:
1. 修改 `src/App.jsx` 建立主要佈局
2. 左側：3D 視窗（佔 80% 寬度）
3. 右側：控制面板區域（佔 20% 寬度）
4. 頂部：標題列與檔案上傳按鈕
5. 底部：圖層滑桿
6. 使用 Tailwind CSS 實現 flex 佈局
7. 確保全螢幕顯示，無滾動條

**驗證測試**:
- 頁面佈局正確，3D 視窗佔據大部分空間
- 控制面板位於右側
- 調整瀏覽器視窗大小，佈局保持響應式
- 無多餘滾動條

---

## Phase 2: G-code 生成器

### Step 2.1 - 建立參數面板

**指令**:
1. 建立 `src/components/ControlPanel/index.jsx` 組件
2. 使用 Leva 建立參數控制面板
3. 加入以下可調參數：
   - Print Speed (mm/s)：範圍 10-200，預設 60
   - Travel Speed (mm/s)：範圍 50-500，預設 200
   - Extrusion Multiplier：範圍 0.5-2.0，預設 1.0
   - Pump On Delay (ms)：範圍 0-2000，預設 500
   - Pump Off Advance (mm)：範圍 0-50，預設 10
4. 將參數值存入 Zustand store

**驗證測試**:
- 控制面板顯示所有參數滑桿
- 調整參數值，store 狀態同步更新
- 重新整理頁面，參數恢復預設值

---

### Step 2.2 - 建立 G-code 生成核心邏輯

**指令**:
1. 建立 `src/core/postProcessor.js` 模組
2. 實作 `generateGcode(pathData, settings)` 函數
3. **加入標準 Marlin 初始化序列**：
   - `G28` 歸零
   - `G90` 絕對座標
   - `M82` 絕對擠出
   - `G92 E0` 重置擠出計數
4. 按圖層順序處理每個 segment
5. 列印段生成：G1 X Y Z E F 指令
6. 空移段生成：G0 X Y Z F 指令
7. E 值使用累加計算：E = 累計長度 × 乘數 × 噴頭直徑 × 層高
8. 加入開頭註解（專案名稱、生成時間、參數設定）

**驗證測試**:
- 呼叫函數並傳入測試 JSON
- 輸出字串包含正確的 G0/G1 指令
- 座標值與 JSON 一致
- E 值為正數且遞增

---

### Step 2.3 - 實作延遲補償邏輯

**指令**:
1. 在 postProcessor 中加入延遲補償
2. Pump On Delay：在每個列印段起點加入 `G4 P{delay}` 暫停指令
3. Pump Off Advance：計算終點前 N 公分的位置
4. **在該點將 E 值設為 0**（停止擠出）
5. 使用註解標記延遲補償位置

**驗證測試**:
- 設定 Pump On Delay = 1000ms
- 輸出每個列印段開始前有 `G4 P1000`
- 設定 Pump Off Advance = 20mm
- 輸出在段末前約 20mm 處有對應指令

---

### Step 2.4 - 實作 G-code 檔案導出

**指令**:
1. 建立 `src/utils/gcodeExporter.js` 模組
2. 實作 `downloadGcode(gcodeString, filename)` 函數
3. 使用 Blob 建立可下載檔案
4. 建立隱藏的 `<a>` 元素觸發下載
5. 預設檔名格式：`{project_name}_{timestamp}.gcode`

**驗證測試**:
- 點擊導出按鈕
- 瀏覽器開始下載 `.gcode` 檔案
- 用文字編輯器開啟，內容正確
- 檔名包含專案名稱與時間戳

---

### Step 2.5 - 加入導出按鈕到 UI

**指令**:
1. 在 ControlPanel 加入「Generate G-code」按鈕
2. 點擊時呼叫 postProcessor 生成 G-code
3. 自動觸發檔案下載
4. 按鈕在無 pathData 時禁用（灰色）
5. 生成過程中顯示 loading 狀態

**驗證測試**:
- 未導入 JSON 時，按鈕為灰色不可點擊
- 導入 JSON 後，按鈕可點擊
- 點擊後成功下載 G-code 檔案
- 下載完成後 loading 狀態消失

---

## Phase 3: 基礎分析功能

### Step 3.1 - 建立分析引擎模組

**指令**:
1. 建立 `src/core/analyzer.js` 模組
2. 實作 `analyzeOverhang(pathData)` 函數
3. 對每個 layer n 的每個點：
   - **找 layer n-1 中的最近鄰點**（使用歐幾里得距離）
   - 計算水平偏移量 ΔXY
4. 使用公式 θ = arctan(ΔXY / ΔZ) 計算懸臂角度
5. Layer 0（底層）的所有點角度設為 0
6. 回傳每個點的懸臂角度陣列

**驗證測試**:
- 傳入測試 JSON
- 回傳陣列長度等於總點數
- 完全垂直堆疊的點角度接近 0
- 有偏移的點角度大於 0

---

### Step 3.2 - 實作懸臂熱點圖渲染

**指令**:
1. 修改 PathRenderer 組件
2. 加入 `showOverhangHeatmap` 狀態控制
3. 根據懸臂角度動態設定頂點顏色：
   - 0-30°：綠色
   - 30-45°：黃色
   - \>45°：紅色
4. 使用 BufferAttribute 設定頂點顏色

**驗證測試**:
- 開啟熱點圖模式
- 路徑顏色根據懸臂角度變化
- 垂直段為綠色
- 傾斜超過 45° 的段為紅色

---

### Step 3.3 - 加入分析控制開關

**指令**:
1. 在 ControlPanel 加入分析開關區塊
2. 加入 Toggle：「Show Overhang Heatmap」
3. 開關狀態存入 store
4. PathRenderer 根據開關狀態切換渲染模式

**驗證測試**:
- 預設關閉，路徑為單一綠色
- 開啟後，路徑顯示熱度漸層
- 關閉後，恢復單一綠色

---

## 驗收里程碑

### Milestone 1 完成標準
- [ ] 可導入 JSON 檔案
- [ ] 3D 場景正確渲染路徑
- [ ] 可逐層檢視
- [ ] 可調整列印參數
- [ ] 可導出 G-code 檔案
- [ ] 基礎懸臂分析可視化

### 效能指標
- [ ] 載入 1MB JSON 於 1 秒內完成
- [ ] 10,000 點渲染保持 60 FPS
- [ ] G-code 生成於 2 秒內完成

---

> **下一階段**: Phase 4 將加入 Web Worker 優化與路徑排序算法，Phase 5 將支援多設備指令集。
