# ArchPrint Pro - 分步實施計劃

> **目標**: 建立一個建築 3D 列印預檢平台，支援 G-code / JSON 路徑導入、3D 視覺化、多演算法路徑優化、動畫模擬、G-code 生成
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

## 驗收里程碑（Phase 1–3）

### Milestone 1 完成標準
- [x] 可導入 JSON 檔案
- [x] 3D 場景正確渲染路徑
- [x] 可逐層檢視
- [x] 可調整列印參數
- [x] 可導出 G-code 檔案
- [x] 基礎懸臂分析可視化

### 效能指標
- [x] 載入 1MB JSON 於 1 秒內完成
- [x] 10,000 點渲染保持 60 FPS
- [x] G-code 生成於 2 秒內完成

---

## Phase 4: 路徑優化與效能提升 ✅ 已完成

**完成日期**: 2026-01-19

### 已實現功能：
- `src/workers/pathWorker.js` Web Worker 非同步處理（`OPTIMIZE_PATH`、`ESTIMATE_TIME` task）
- 最近鄰 (Nearest Neighbor) 路徑排序（內嵌於 Worker）
- 2-opt TSP 改進算法（內嵌於 Worker）
- `src/hooks/usePathWorker.js` React Hook 封裝
- 空移距離優化統計（improvement %）
- 列印時間估算、材料體積/線材長度/重量估算

---

## Phase 5: 多設備指令集支援 ✅ 已完成

**完成日期**: 2026-01-21

### 已實現功能：
- `src/core/gcodeProfiles.js`：Marlin / RepRap / KUKA / 自定義四種預設配置
- `src/components/GcodeProfileEditor/index.jsx`：配置編輯器 Modal
- `src/utils/configParser.js`：config.ini 解析（PrusaSlicer 格式）
- `src/components/ConfigUploader/index.jsx`：config.ini 上傳入口
- LocalStorage 儲存/載入自定義配置、JSON 匯入/匯出

---

## Phase 6: G-code 檔案輸入與解析

> **目標**: 讓使用者直接上傳 `.gcode` 檔案，解析後轉換為內部格式（與現有 JSON pathData 完全相容），後續所有視覺化與優化流程無需修改。

### Step 6.1 - 建立 G-code Parser

**新增檔案**: `src/core/gcodeParser.js`

**指令**:
1. 實作 `parseGcode(gcodeString)` 函數，回傳與現有 JSON 格式完全相同的 `pathData` 物件
2. 逐行解析策略：
   - `G0` / `G1` → 提取 X、Y、Z、E、F 數值
   - `E > 0 且遞增` → `is_extruding: true`（列印段）
   - `E 無變化 / E=0 / G0` → `is_extruding: false, type: 'travel'`（空移段）
3. 層偵測邏輯（依優先順序）：
   - 優先：註解 `;LAYER:n` 或 `;layer n`（Cura / PrusaSlicer 格式）
   - 次要：Z 值遞增視為換層
4. 段落切分規則：
   - 連續擠出點 → 同一列印段
   - 擠出中斷（G0 或 E 歸零）→ 切斷，下一段為空移
5. 填充 `header` 欄位：
   - `project_name`：取自 G-code 檔名
   - `layer_height`：從 Z 差值自動計算
   - `nozzle_diameter`：從 `;nozzle_diameter = x` 註解讀取，預設 10
6. 錯誤處理：無有效座標回傳 `null` 並提示用戶

**驗證測試**:
- 傳入一個真實 PrusaSlicer 匯出的 `.gcode`，回傳 `pathData.layers.length > 0`
- 第一層的 Z 高度與 G-code 中 Z 值一致
- 列印段 `is_extruding === true`，空移段 `type === 'travel'`
- 回傳格式與現有 `sample-path.json` 結構相同（可直接丟入 PathRenderer）

---

### Step 6.2 - FileUploader 支援 .gcode 輸入

**修改檔案**: `src/components/FileUploader/index.jsx`

**指令**:
1. 修改 `<input accept>` 為 `".json,.gcode"`
2. 依副檔名分流：
   - `.json` → 現有 JSON 解析流程（不變）
   - `.gcode` → 呼叫 `gcodeParser.parseGcode()`
3. 解析完成後統一呼叫 `setPathData(data)` 存入 store（格式相同，後續無需修改）
4. 在 Header 按鈕旁顯示來源標籤（`JSON` / `G-code`）

**驗證測試**:
- 上傳 `.json` 檔案，行為與原本相同
- 上傳 `.gcode` 檔案，3D 場景正確顯示路徑
- Header 顯示對應的來源標籤
- 上傳損壞的 `.gcode` 顯示錯誤提示

---

### Step 6.3 - Store 新增來源狀態

**修改檔案**: `src/stores/useStore.js`

**指令**:
1. 新增 `sourceType: null`（值為 `'json'` | `'gcode'` | `null`）
2. 新增 `setSourceType(type)` action
3. `FileUploader` 在解析完成後同時呼叫 `setSourceType`

**驗證測試**:
- 導入 JSON 後，`store.sourceType === 'json'`
- 導入 G-code 後，`store.sourceType === 'gcode'`

---

### Step 6.4 - 建立測試用 G-code 樣本

**新增檔案**: `public/sample-print.gcode`

**指令**:
1. 生成一個簡單的 3 層正方形輪廓 G-code（120×120cm）
2. 包含 Cura 格式的層註解（`;LAYER:0`）
3. 包含合理的 F 速度值、累加 E 值

**驗證測試**:
- 上傳後 3D 場景顯示 3 層正方形
- 圖層滑桿可正確切換

---

## Phase 7: 進階路徑優化演算法

> **目標**: 在現有 Nearest Neighbor + 2-opt 基礎上，新增 Or-opt、Simulated Annealing、接縫優化、方向反轉、以及**幾何約束空移（Visibility Graph）**，並提供 UI 讓使用者選擇組合。

### 已確認規格（Phase 7）

| 項目 | 決定 |
|------|------|
| **算法模組位置** | `src/core/algorithms/` 目錄 |
| **執行環境** | Web Worker（`pathWorker.js`）|
| **輸入/輸出格式** | 內部 `pathData` 格式（不改變資料結構）|
| **優化目標** | 最小化空移距離（主要）+ 限制路徑在幾何體內（次要）|
| **幾何約束來源** | 每層的輪廓（contour）段落構成多邊形 |

---

### Step 7.1 - 提取算法模組（重構）

**新增檔案**:
- `src/core/algorithms/nearestNeighbor.js`
- `src/core/algorithms/twoOpt.js`

**指令**:
1. 將 `pathWorker.js` 中的 `nearestNeighborSort()` 和 `twoOptImprove()` 提取為獨立 ES 模組
2. 每個模組 export `{ optimize(segments, options) }` 統一介面
3. `pathWorker.js` 改為 `import` 這些模組（Worker 支援 ES Module import）
4. 驗證現有優化功能不受影響

**驗證測試**:
- 執行現有路徑優化，結果與重構前相同
- 兩個模組可被獨立 import 並測試

---

### Step 7.2 - Or-opt 演算法

**新增檔案**: `src/core/algorithms/orOpt.js`

**指令**:
1. 實作 `optimize(segments, options)` 函數
2. Or-opt 核心邏輯：對每個長度 k（k=1,2,3）的連續子序列，嘗試插入到所有其他位置
3. 若新位置空移總距離更短則執行移動
4. 參數 `options.maxK`（預設 3）、`options.maxIterations`（預設 50）
5. 回傳重排後的 `segments` 陣列

**演算法說明**:
```
For k = 1, 2, 3:
  For each segment chain [i, i+k):
    Try inserting chain after position j (j ≠ i-1, i+k-1)
    If travel_cost(new) < travel_cost(old): apply move
```

**驗證測試**:
- 傳入 10 個段落，回傳長度相同的重排陣列
- 優化後總空移距離 ≤ 優化前（不能更差）
- 與 2-opt 組合使用，優化效果優於單獨使用

---

### Step 7.3 - 模擬退火（Simulated Annealing）

**新增檔案**: `src/core/algorithms/simulatedAnnealing.js`

**指令**:
1. 實作 `optimize(segments, options)` 函數
2. SA 參數（透過 options 傳入）：
   - `initialTemp`（預設 1000）：初始溫度
   - `coolingRate`（預設 0.995）：冷卻係數
   - `minTemp`（預設 1）：終止溫度
   - `maxIterations`（預設 10000）
3. 每次迭代：隨機交換兩個段落位置
4. 接受機率：`P = exp(-deltaE / T)`，deltaE > 0 時有機率接受較差解
5. 每 500 次迭代向 Worker 發送一次進度（`reportProgress`）
6. 回傳找到的最佳排列

**驗證測試**:
- 段落數 ≤ 20 時，SA 結果優於純 2-opt
- 執行時間在 Worker 中 < 3 秒（maxIterations = 10000）
- 進度訊息正確從 Worker 傳回主執行緒

---

### Step 7.4 - 接縫點優化（Seam Optimizer）

**新增檔案**: `src/core/algorithms/seamOptimizer.js`

**指令**:
1. 實作 `optimizeSeams(segments, options)` 函數
2. 對每個**閉合輪廓段落**（起點和終點座標相近，距離 < threshold），找出最佳接縫起始點：
   - `mode: 'nearest'`：選距離上一段終點最近的輪廓點為新起點（預設）
   - `mode: 'corner'`：選曲率最大（接近 90° 轉角）的點
   - `mode: 'random'`：隨機選點（分散接縫痕跡）
3. 旋轉點陣列使選定點成為新起點（`points = [...points.slice(idx), ...points.slice(0, idx)]`）
4. 非閉合段落（直線段）不做處理

**驗證測試**:
- `mode: 'nearest'` 下，每段接縫點距上段終點距離明顯縮短
- 旋轉後段落點數不變，起終點座標已改變
- 原本封閉的輪廓旋轉後仍然封閉

---

### Step 7.5 - 段落方向反轉（Segment Reversal）

**新增檔案**: `src/core/algorithms/segmentReversal.js`

**指令**:
1. 實作 `optimize(segments)` 函數
2. 對每個段落，計算：
   - 正向起點到上段終點的距離 `d_forward`
   - 反向起點（原終點）到上段終點的距離 `d_reversed`
3. 若 `d_reversed < d_forward`：反轉該段落的 `points` 陣列
4. 逐段貪心處理（從第一段開始依序判斷）
5. 可與其他排序算法組合：在重排後再執行方向優化

**驗證測試**:
- 優化後每段起點到前段終點距離 ≤ 優化前
- 段落點數不變，僅順序可能反轉
- 不影響段落的 `type` 和 `is_extruding` 屬性

---

### Step 7.6 - 幾何約束空移（Visibility Graph）

**新增檔案**: `src/core/algorithms/visibilityGraph.js`

> **目的**: 確保空移路徑全程在幾何體內部，不穿越外壁，消除混凝土拉絲痕跡。

**指令**:

**Part A：多邊形工具函數**
1. `pointInPolygon(point, polygon)` — 射線法（ray casting），判斷點是否在多邊形內
2. `segmentIntersectsSegment(p1, p2, p3, p4)` — 兩線段是否相交（含端點處理）
3. `travelCrossesPolygon(start, end, polygon)` — 空移直線是否穿越多邊形邊界
4. `extractLayerPolygon(layer)` — 從 layer.segments 中提取輪廓段（type 非 travel 且最長閉合路徑），回傳 `[[x,y], ...]`

**Part B：可視圖建構**
5. `buildVisibilityGraph(polygon, extraPoints)` — 建立可視圖：
   - 節點：polygon 頂點 + `extraPoints`（A點、B點）
   - 對每對節點 (u, v)：若連線不穿越任何多邊形邊且在多邊形內部 → 加入 edge
   - 邊的權重為歐幾里得距離
6. 複雜度：O(n²) 節點對 × O(n) 邊檢查 = O(n³)，適用 n < 200

**Part C：最短路徑**
7. `dijkstra(graph, sourceId, targetId)` — 在可視圖上求最短路徑，回傳 waypoint 陣列

**Part D：空移重建**
8. `rebuildTravelMoves(layer, options)` — 主入口函數：
   ```
   for each consecutive print segment pair (A_end → B_start):
     if travelCrossesPolygon(A_end, B_start, polygon):
       path = dijkstra(visibilityGraph, A_end, B_start)
       replace travel segment with multi-point path
     else:
       keep original direct travel
   ```
9. `options.enabled`（預設 true）、`options.fallbackToDirect`（多邊形無法解析時直接空移）

**驗證測試**:
- 對一個凹多邊形（C字形）的跨越空移，路徑應繞過缺口
- 對不需繞路的空移（A、B在同側），輸出與輸入相同的直線
- `extractLayerPolygon` 在只有直線段（無封閉輪廓）的層回傳 `null`
- `rebuildTravelMoves` 加上 `fallbackToDirect: true` 時，無多邊形的層不報錯

---

### Step 7.7 - 更新 pathWorker 整合新算法

**修改檔案**: `src/workers/pathWorker.js`

**指令**:
1. 在 Worker 頂部加入 import（ES Module Worker）：
   ```js
   import { optimize as nnOptimize } from '../core/algorithms/nearestNeighbor.js'
   import { optimize as twoOptOptimize } from '../core/algorithms/twoOpt.js'
   import { optimize as orOptOptimize } from '../core/algorithms/orOpt.js'
   import { optimize as saOptimize } from '../core/algorithms/simulatedAnnealing.js'
   import { optimizeSeams } from '../core/algorithms/seamOptimizer.js'
   import { optimize as reversalOptimize } from '../core/algorithms/segmentReversal.js'
   import { rebuildTravelMoves } from '../core/algorithms/visibilityGraph.js'
   ```
2. 修改 `handleOptimizePath(payload, taskId)`：
   - `payload.options.algorithms` 為陣列，依序執行（如 `['nearest', '2opt', 'oropt', 'reversal', 'seam', 'visibility']`）
   - 每個 algorithm 完成後 `reportProgress`
   - `visibility` 步驟在所有排序完成後執行
3. 保留舊 `mode` 參數的向下相容性

**驗證測試**:
- 傳入 `algorithms: ['nearest', '2opt']`，結果與舊版相同
- 傳入 `algorithms: ['nearest', 'oropt', 'sa', 'seam', 'reversal', 'visibility']`，不報錯並回傳 stats
- `visibility` 步驟執行後，Worker console 應顯示修改了幾段空移

---

### Step 7.8 - OptimizationPanel UI

**新增檔案**: `src/components/OptimizationPanel/index.jsx`

**指令**:
1. 建立優化控制面板，整合進現有右側 `ControlPanel`（作為可折疊區塊）
2. **Algorithm 選擇區**（多選 checkbox）：
   ```
   排序演算法（選一）：
   ○ Nearest Neighbor（快速）
   ○ Nearest Neighbor + 2-opt（標準）  ← 預設
   ○ Nearest Neighbor + Or-opt（強化）
   ○ Simulated Annealing（最佳，較慢）

   輔助優化（可複選）：
   ☑ 段落方向反轉（Reversal）
   ☑ 接縫點優化（Seam）　模式：[nearest ▼]
   ☐ 幾何約束空移（Visibility Graph）
   ```
3. **執行按鈕**：「▶ 開始優化」，無 pathData 時 disabled
4. **進度顯示**：執行中顯示 spinner + 當前步驟文字（來自 Worker `PROGRESS` 訊息）
5. **結果統計卡片**（優化完成後顯示）：
   ```
   空移距離：1234.5mm → 678.2mm  (-45.1%)
   層數：48　　段落數：312
   ```
6. 優化完成後，`store.pathData` 替換為優化後資料（讓現有 PathRenderer 直接顯示結果）

**驗證測試**:
- 未上傳檔案時，按鈕 disabled
- 選擇不同算法組合，點擊按鈕，Worker 執行並回傳結果
- 結果統計正確顯示改善百分比
- 優化後 3D 視窗路徑自動更新

---

### Step 7.9 - Store 新增優化狀態

**修改檔案**: `src/stores/useStore.js`

**指令**:
1. 新增 `optimizationSettings`：
   ```js
   {
     sortAlgorithm: 'nn_2opt',   // 'nn' | 'nn_2opt' | 'nn_oropt' | 'sa'
     useReversal: true,
     useSeam: true,
     seamMode: 'nearest',        // 'nearest' | 'corner' | 'random'
     useVisibilityGraph: false,
   }
   ```
2. 新增 `optimizationResult: null`（儲存最後一次優化的 stats）
3. 新增 `isOptimizing: false`（Worker 執行中）
4. 新增對應 actions：`setOptimizationSettings`、`setOptimizationResult`、`setIsOptimizing`

**驗證測試**:
- `optimizationSettings` 有正確預設值
- OptimizationPanel 修改設定後 store 同步更新

---

## Phase 8: 動畫模擬增強

> **目標**: 將現有進度條動畫升級為完整的列印模擬體驗，包含噴頭游標、已完成/未完成路徑雙色渲染，以及 before/after 比較模式。

### 現有動畫架構（Phase 8 基礎）

- `AnimationPlayer`：已有播放/暫停/重置/速度/進度條 UI
- `PathRenderer`：已透過 `calculateVisibleProgress()` 支援依進度截斷路徑渲染
- `store.animation`：已有 `isPlaying`、`progress`（0–1）、`speed`

Phase 8 在此基礎上新增：噴頭游標、雙色渲染、layer/segment 進度顯示、比較模式。

---

### Step 8.1 - 噴頭游標（Nozzle Marker）

**修改檔案**: `src/components/PathRenderer/index.jsx`

**指令**:
1. 在 PathRenderer 主組件中計算當前噴頭座標：
   - 利用現有 `calculateVisibleProgress()` 取得 `{ layerIndex, segmentIndex, pointIndex }`
   - 從對應的 `segment.points[pointIndex]` 取得 `{x, y, z}`
2. 渲染噴頭游標：
   - 外球：橘色半透明大球（radius = nozzleRadius × 3，opacity 0.4）
   - 內球：亮橘色實心小球（radius = nozzleRadius × 1.5）
   - 使用 `<mesh position={[x, z, y]}>` 放置（注意 Three.js 的 Y-up 座標轉換）
3. 動畫未開始（progress = 0）或已完成（progress = 1）時不顯示游標

**驗證測試**:
- 播放動畫時，橘色球體沿路徑移動
- 暫停時球體停在當前位置
- 拖動進度條，球體即時跳到對應位置

---

### Step 8.2 - 雙色路徑渲染（已完成 vs 未完成）

**修改檔案**: `src/components/PathRenderer/index.jsx`

**指令**:
1. 修改 `LayerRenderer` 的渲染邏輯，加入 `renderMode` 參數：
   - `'preview'`（預設）：現有行為，全路徑同色
   - `'animation'`：動畫播放中時啟用雙色模式
2. 雙色邏輯（animation mode）：
   - **已完成段落**（layerIndex < current 或 segmentIndex < current）：保留原色（綠色 / 熱點圖色）
   - **當前段落**（segmentIndex == current）：已完成點用亮色，未完成點用暗灰色（`#404040`，opacity 0.4）
   - **未來段落**（segmentIndex > current）：暗灰色（`#404040`，opacity 0.4）
3. 動畫 `isPlaying === true` 或 `progress > 0` 時自動切換到 animation mode

**驗證測試**:
- 播放時，已印完的路徑為亮綠色，未印的為暗灰色
- 暫停、回到進度 0 後，恢復全部顯示模式
- 管狀渲染（useTubeRender）和線條渲染皆支援雙色

---

### Step 8.3 - AnimationPlayer 顯示層數進度

**修改檔案**: `src/components/AnimationPlayer/index.jsx`

**指令**:
1. 從 store 讀取 `pathData` 和 `animation.progress`
2. 利用 `calculateVisibleProgress()` 計算當前層：
   ```js
   const { layerIndex } = calculateVisibleProgress(visibleLayers, progress, totalPoints)
   const currentLayer = visibleLayers[layerIndex]?.layer_index ?? 0
   const totalLayers = pathData.layers.length
   ```
3. 在進度條下方顯示：
   ```
   Layer 12 / 48   Segment 34 / 312
   ```
4. 速度選項新增 `10×` 和 `50×`（快速預覽用）

**驗證測試**:
- 播放時層數標籤即時更新
- 拖動進度條，層數標籤跳到對應層
- 速度 50× 可在 3 秒內預覽完整個模型

---

### Step 8.4 - 優化前後比較模式

**指令**:
1. 在 `useStore.js` 新增 `originalPathData: null`（保存優化前資料）
2. 在 `OptimizationPanel` 的「開始優化」執行前，先將當前 `pathData` 備份到 `originalPathData`
3. 新增 `compareMode: false` 到 store
4. 在 `OptimizationPanel` 結果區加入「⇄ 比較模式」切換按鈕
5. `compareMode = true` 時：
   - `PathRenderer` 同時渲染兩份資料
   - 原始路徑：紅色半透明（opacity 0.3）
   - 優化後路徑：綠色正常顯示
6. StatusBar 在比較模式下顯示「比較模式」標籤

**驗證測試**:
- 優化後點擊比較按鈕，3D 場景同時顯示紅色（原始）和綠色（優化）路徑
- 再次點擊，恢復單一路徑顯示
- 比較模式下圖層滑桿仍可正常使用

---

## 驗收里程碑（Phase 6–8）

### Milestone 2 完成標準
- [ ] 可導入 `.gcode` 檔案並正確解析為 pathData
- [ ] OptimizationPanel 顯示所有算法選項
- [ ] Visibility Graph 空移重建不報錯並產生可見效果
- [ ] 動畫播放時噴頭游標沿路徑移動
- [ ] 雙色渲染（已完成/未完成）正常運作
- [ ] Before/After 比較模式可切換

### 效能指標（Phase 6–8）
- [ ] G-code 解析 1MB 檔案 < 2 秒（主執行緒）
- [ ] SA 算法 10,000 次迭代在 Worker 中 < 5 秒
- [ ] Visibility Graph 每層計算（n < 200 頂點）< 100ms
- [ ] 動畫播放 10,000 點保持 60 FPS

---

> **技術債與後續方向**: Constrained Delaunay Triangulation（處理帶孔多邊形）、Genetic Algorithm（更強的全域最優）、多路徑比較視圖（三欄並排）。
