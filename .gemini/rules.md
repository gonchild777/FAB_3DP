# ArchPrint Pro 開發規則

## 重要提示

> [!CAUTION]
> 以下規則**必須嚴格遵守**，違反可能導致架構不一致或功能衝突。

### 1. 寫任何代碼前必須完整閱讀：
- `memory-bank/@architecture.md`（包含完整數據結構與系統架構）
- `memory-bank/@game-design-document.md`（包含產品規格與功能需求）

### 2. 每完成一個重大功能或里程碑後：
- **必須**更新 `memory-bank/@architecture.md`
- 記錄新增的模組、API、數據結構變更

### 3. 代碼風格規範：
- 使用 TypeScript（若適用）
- 遵循 ESLint + Prettier 配置
- 組件採用函數式寫法 + Hooks

### 4. 提交規範：
- 重大變更需附帶 architecture.md 更新
- Commit message 格式：`feat/fix/docs: 簡短描述`
