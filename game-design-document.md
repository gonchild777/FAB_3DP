# ArchPrint Pro: Advanced Web Slicer & Analyzer - Project Specification

## 1. 專案願景 (Project Vision)

ArchPrint Pro 是一個專為建築 3D 列印 (3DCP) 設計的數位孿生預檢平台。它銜接了 Rhino/Grasshopper 的設計端與工廠端的自動化設備，提供即時的幾何分析、路徑優化與工業級 G-code 生成，旨在降低列印現場的失敗率並優化材料性能。

---

## 2. 技術架構 (Technical Stack)

為了確保產品在處理數十萬個幾何點位時仍具備工業級的穩定性：

- **前端框架**: React 18 (Vite)
    
- **3D 渲染引擎**: Three.js (使用 `@react-three/fiber` 與 `@react-three/drei`)
    
- **效能優化**: 使用 **Web Workers** 處理幾何演算 (TSP, Overhang, G-code Generation)
    
- **狀態管理**: Zustand (Immutable state)
    
- **幾何運算**: gl-matrix (高性能向量運算)
    
- **UI 組件**: Tailwind CSS + Tweakpane (參數面板)
    

---

## 3. 數據協定 (Data Protocol: GH-to-Web JSON)

所有幾何數據需由 Grasshopper 預先離散化，輸出格式定義如下：

JSON

```
{
  "header": {
    "project_name": "Structure_01",
    "nozzle_diameter": 8.0,
    "layer_height": 4.0,
    "machine_flavor": "Marlin" 
  },
  "layers": [
    {
      "layer_index": 0,
      "z_height": 4.0,
      "segments": [
        {
          "type": "printing",
          "is_extruding": true,
          "points": [{"x": 0.0, "y": 0.0, "z": 4.0}, {"x": 100.0, "y": 0.0, "z": 4.0}]
        }
      ]
    }
  ]
}
```

---

## 4. 核心功能模組 (Core Modules)

### 4.1 幾何分析引擎 (Analysis Engine)

- **懸臂檢測 (Overhang Analysis)**:
    
    - 計算 $Layer_{n}$ 與 $Layer_{n-1}$ 頂點的法向偏移。
        
    - 公式: $\theta = \arctan(\frac{\Delta XY}{\Delta Z})$。若 $\theta > 45^\circ$ 則渲染為紅色警示。
        
- **穩定性監控 (Structural Stability)**:
    
    - **細長比 (Slenderness)**: 監控全高度與最小包絡寬度比，若 $> 6.0$ 觸發晃動警告。
        
    - **重心偏心度 (Eccentricity)**: 計算每一層質心相對於底座中心的位移軌跡。
        
- **冷縫預警 (Cold Joint Prediction)**:
    
    - 偵測空移距離 $D_{travel} > 300\text{mm}$ 或空移時間預估超過 30 秒的路徑段。
        

### 4.2 路徑序列最佳化 (Path Optimizer)

- **TSP 鄰近演算法**: 使用最近鄰搜尋 (Nearest Neighbor) 自動排序層內路徑段。
    
- **雙向路徑翻轉 (Path Flipping)**: 比較路徑「起點」與「終點」與噴頭的距離，動態決定是否反向列印該路徑。
    
- **空移最小化**: 自動計算優化後的空移路徑，減少泵浦閒置時間。
    

### 4.3 G-code 後處理器 (Post-Processor)

- **動態擠出係數**: 基於路徑長度與截面積公式計算 $E$ 值：
    
    $$E = L \times \text{Multiplier} \times \text{NozzleDia} \times \text{LayerH}$$
    
- **延遲補償邏輯**:
    
    - `Pump On Delay`: 到達起點後延遲移動。
        
    - `Pump Off Advance`: 抵達終點前 $d$ 距離提前關閉泵浦。
        
- **多設備適配**: 支持匯出 Marlin (.gcode) 與機器人手臂指令 (如 KUKA KRL, ABB RAPID)。
    

---

## 5. UI/UX 產品規格 (User Interface)

- **Viewport**: 支援 360 度旋轉、縮放、以及「透視/正交」切換。使用 `LineSegments` 渲染路徑，並以虛線區分空移。
    
- **Data Overlay**: 支援顯示 Hover 點位的座標與 G-code 行號。
    
- **Control Panel**:
    
    - **Global Settings**: 調整噴頭、速度、材料屬性。
        
    - **Analysis Toggles**: 切換「懸臂熱點圖」、「穩定性曲線」、「冷縫警示」。
        
    - **Timeline**: 逐層模擬列印動畫的拖動條。
        

---

## 6. 實作路徑圖 (Implementation Roadmap)

- [ ] **Phase 1: Foundation** - Vite + R3F 場景建立、JSON 導入、基礎 BufferGeometry 渲染。
    
- [ ] **Phase 2: Post-Process** - 參數面板實作、G-code 生成邏輯、檔案導出功能。
    
- [ ] **Phase 3: Analysis** - Overhang 與 Slenderness 運算邏輯、顏色映射熱點圖。
    
- [ ] **Phase 4: Optimization** - Web Worker 整合、TSP 排序算法、路徑自動翻轉邏輯。
    
- [ ] **Phase 5: Refinement** - UI 優化、移動端適配、KUKA/ABB 指令集支援。
    

---

## 7. Cursor Vibecoding 關鍵提示詞 (Prompts)

### 初始化專案

> "Initialize a high-performance React 18 project using Vite and Tailwind CSS. Setup a Three.js canvas using @react-three/fiber with a dark theme, grid helper, and OrbitControls."

### 幾何處理 (Web Worker)

> "Create a Web Worker to handle heavy geometry calculations. It should process the path JSON, calculate overhang angles for each segment, and run a Nearest Neighbor algorithm to optimize the printing sequence."

### G-code 生成

> "Implement a Post-Processor class that translates the optimized path data into G-code. It must handle cumulative E-values and allow for 'Pump On Delay' and 'Pump Off Advance' offsets defined by the user."

---

## 8. 驗收標準 (Acceptance Criteria)

1. 網頁需在 2 秒內解析完成 10MB 以上的路徑 JSON 檔案。
    
2. 3D 渲染在處理 100,000 個點位時需保持至少 60 FPS。
    
3. 生成的 G-code 檔案經測試需能在標準 Marlin 固件機台執行。
    
4. 分析結果（如懸臂危險區域）需能準確與 Rhino 模擬結果對齊。