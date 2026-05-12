import { create } from 'zustand'

const useStore = create((set) => ({
    // 專案數據
    pathData: null,
    sourceType: null,   // 'json' | 'gcode' | null（資料來源）

    // 視覺化設定 - 圖層範圍
    startLayer: 0,
    endLayer: 999,
    showTravelMoves: true,
    useTubeRender: true,           // 是否使用管狀渲染
    showOverhangHeatmap: false,    // 是否顯示懸臂熱點圖

    // G-code 生成參數
    printSettings: {
        printSpeed: 60,           // mm/s
        travelSpeed: 200,         // mm/s
        extrusionMultiplier: 1.0, // 擠出乘數
        pumpOnDelay: 500,         // ms
        pumpOffAdvance: 10,       // mm
    },

    // 機器設定（從 config.ini 載入）
    machineSettings: {
        nozzleDiameter: 10,       // mm
        layerHeight: 6,           // mm
        filamentDiameter: 35,     // mm
        bedSize: { width: 1200, height: 1200 },
        retractLength: 0,
        retractSpeed: 20,
        temperature: 200,
        gcodeFlavor: 'reprap',
        configName: '',           // 配置檔名稱
    },

    // G-code 模板（舊版，保留相容性）
    gcodeTemplates: {
        startGcode: 'G28 ; home all axes\nG1 Z5 F1200 ; lift nozzle\n',
        endGcode: 'M104 S0 ; turn off temperature\nM84     ; disable motors\n',
        layerGcode: '',
    },

    // G-code 設備配置
    gcodeProfileId: 'marlin',  // 預設使用 Marlin

    // 自定義 G-code 配置
    customProfile: {
        id: 'custom',
        name: '自定義配置',
        description: '用戶自定義 G-code 格式',
        commands: {
            linearMove: 'G1 X{x} Y{y} Z{z} E{e} F{f}',
            rapidMove: 'G0 X{x} Y{y} Z{z} F{f}',
            dwell: 'G4 P{ms}',
            comment: '; {text}',
            extruderOn: '',
            extruderOff: '',
        },
        startGcode: 'G28 ; Home all axes\nG90 ; Absolute positioning\nM82 ; Absolute extrusion\nG92 E0\n',
        endGcode: 'G92 E0\nG28 X Y\nM84\n',
        layerChangeGcode: '; Layer {layer}\n',
        format: {
            coordinateDecimals: 3,
            extrusionDecimals: 5,
            speedUnit: 'mm/min',
            speedMultiplier: 60,
            useExtrusion: true,
            lineEnding: '\n',
        },
    },

    // 編輯器狀態
    isProfileEditorOpen: false,

    // 障礙物
    obstacles: [],             // [{ id, name, type, vertices, indices, bbox, color, visible }]
    obstacleSettings: {
        showInScene: true,
        avoidInOptimization: true,
        inflation: 0,          // cm，安全邊距（多邊形外擴）
    },

    // 路徑優化
    originalPathData: null,    // 優化前備份（供比較模式使用）
    optimizationSettings: {
        sortAlgorithm: 'nn_2opt',    // 'nn' | 'nn_2opt' | 'nn_oropt' | 'sa'
        useReversal: true,
        useSeam: true,
        seamMode: 'nearest',         // 'nearest' | 'corner' | 'random'
        useVisibilityGraph: false,
    },
    optimizationResult: null,  // 最後一次優化的 stats
    isOptimizing: false,
    compareMode: false,        // 是否同時顯示優化前/後

    // 動畫控制
    animation: {
        isPlaying: false,          // 是否正在播放
        progress: 0,               // 動畫進度 (0-1)
        speed: 1,                  // 播放速度倍率
    },



    // Actions
    setPathData: (data) => set({ pathData: data }),
    setSourceType: (type) => set({ sourceType: type }),
    setStartLayer: (layer) => set({ startLayer: layer }),
    setEndLayer: (layer) => set({ endLayer: layer }),
    setLayerRange: (start, end) => set({ startLayer: start, endLayer: end }),
    setShowTravelMoves: (show) => set({ showTravelMoves: show }),
    setUseTubeRender: (use) => set({ useTubeRender: use }),
    setShowOverhangHeatmap: (show) => set({ showOverhangHeatmap: show }),
    setGcodeProfileId: (id) => set({ gcodeProfileId: id }),

    // 更新單個列印參數
    updatePrintSetting: (key, value) => set((state) => ({
        printSettings: { ...state.printSettings, [key]: value }
    })),

    // 更新所有列印參數
    setPrintSettings: (settings) => set((state) => ({
        printSettings: { ...state.printSettings, ...settings }
    })),

    // 更新機器設定
    setMachineSettings: (settings) => set((state) => ({
        machineSettings: { ...state.machineSettings, ...settings }
    })),

    // 更新 G-code 模板
    setGcodeTemplates: (templates) => set((state) => ({
        gcodeTemplates: { ...state.gcodeTemplates, ...templates }
    })),

    // 載入完整配置（從 config.ini）
    loadConfig: (printSettings, machineSettings, gcodeTemplates, configName) => set((state) => ({
        printSettings: { ...state.printSettings, ...printSettings },
        machineSettings: { ...state.machineSettings, ...machineSettings, configName },
        gcodeTemplates: { ...state.gcodeTemplates, ...gcodeTemplates },
    })),

    // 動畫控制 Actions
    setAnimationPlaying: (isPlaying) => set((state) => ({
        animation: { ...state.animation, isPlaying }
    })),
    setAnimationProgress: (progress) => set((state) => ({
        animation: { ...state.animation, progress: Math.max(0, Math.min(1, progress)) }
    })),
    setAnimationSpeed: (speed) => set((state) => ({
        animation: { ...state.animation, speed }
    })),
    resetAnimation: () => set((state) => ({
        animation: { ...state.animation, isPlaying: false, progress: 0 }
    })),

    // 障礙物 Actions
    addObstacle: (obstacle) => set((state) => ({
        obstacles: [...state.obstacles, obstacle],
    })),
    removeObstacle: (id) => set((state) => ({
        obstacles: state.obstacles.filter((o) => o.id !== id),
    })),
    updateObstacle: (id, updates) => set((state) => ({
        obstacles: state.obstacles.map((o) => o.id === id ? { ...o, ...updates } : o),
    })),
    clearObstacles: () => set({ obstacles: [] }),
    updateObstacleSetting: (key, value) => set((state) => ({
        obstacleSettings: { ...state.obstacleSettings, [key]: value },
    })),

    // 路徑優化 Actions
    setOriginalPathData: (data) => set({ originalPathData: data }),
    updateOptimizationSetting: (key, value) => set((state) => ({
        optimizationSettings: { ...state.optimizationSettings, [key]: value }
    })),
    setOptimizationSettings: (settings) => set((state) => ({
        optimizationSettings: { ...state.optimizationSettings, ...settings }
    })),
    setOptimizationResult: (result) => set({ optimizationResult: result }),
    setIsOptimizing: (flag) => set({ isOptimizing: flag }),
    setCompareMode: (flag) => set({ compareMode: flag }),
    revertOptimization: () => set((state) => ({
        pathData: state.originalPathData ?? state.pathData,
        optimizationResult: null,
        compareMode: false,
    })),

    // 自定義配置 Actions
    setProfileEditorOpen: (isOpen) => set({ isProfileEditorOpen: isOpen }),

    updateCustomProfile: (updates) => set((state) => ({
        customProfile: { ...state.customProfile, ...updates }
    })),

    updateCustomProfileCommand: (key, value) => set((state) => ({
        customProfile: {
            ...state.customProfile,
            commands: { ...state.customProfile.commands, [key]: value }
        }
    })),

    updateCustomProfileFormat: (key, value) => set((state) => ({
        customProfile: {
            ...state.customProfile,
            format: { ...state.customProfile.format, [key]: value }
        }
    })),

    // 儲存/載入自定義配置
    saveCustomProfileToStorage: () => {
        const state = useStore.getState()
        localStorage.setItem('archprint_custom_profile', JSON.stringify(state.customProfile))
    },

    loadCustomProfileFromStorage: () => {
        const saved = localStorage.getItem('archprint_custom_profile')
        if (saved) {
            try {
                const profile = JSON.parse(saved)
                set({ customProfile: profile })
            } catch (e) {
                console.error('Failed to load custom profile:', e)
            }
        }
    },
}))

export default useStore
