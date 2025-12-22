<!--
Sync Impact Report:
- Version change: 1.0.1 → 1.1.0
- Modified sections: 測試與品質保證（新增強制測試要求）、新增 Changelog 文件化與版本控制章節
- Added major features:
  * 單元測試與整合測試強制要求（NON-NEGOTIABLE）
  * Changelog 文件化流程（參考 .github/instructions/changelog.instructions.md）
  * 版本控制自動化工作流程（git-auto-push）
  * 安全性檢查（金鑰/密鑰檢查）
  * 測試驅動開發（TDD）原則明確化
- Templates requiring updates:
  ✅ constitution.md (this file)
  ⚠ plan-template.md (pending - needs test requirements and changelog sections)
  ⚠ spec-template.md (pending - needs test scenarios alignment)
  ⚠ tasks-template.md (pending - needs test tasks and changelog tasks patterns)
- Follow-up TODOs: None
-->

# Obsidian AI Plugin 專案憲章

## 核心原則

### I. 基於官方範本開發（NON-NEGOTIABLE）

外掛開發必須基於 [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) 作為基礎架構。這確保：
- 遵循 Obsidian 官方建議的最佳實踐
- 使用正確的建置工具鏈（esbuild + TypeScript）
- 符合社群外掛的標準結構
- 降低未來維護和升級的複雜度

**環境要求（NON-NEGOTIABLE）**：
- **Node.js 版本**: 最低 v16（建議使用 LTS v18+）
- **套件管理器**: npm（必須，本專案的 `package.json` 定義 npm scripts 與依賴）
- **TypeScript 編譯器**: 透過專案依賴安裝
- **建置工具**: esbuild（必須，`esbuild.config.mjs` 與建置腳本依賴此工具）

**強制要求**：
- 使用 TypeScript 開發，啟用 `"strict": true` 模式
- 使用 esbuild 作為打包工具（替代方案如 Rollup、webpack 需確保能將所有外部依賴打包至 `main.js`）
- 入口點必須為 `src/main.ts`，編譯輸出為 `main.js`
- 必須包含 `manifest.json`、`main.js`（可選 `styles.css`）作為發佈產物

### II. 模組化架構與職責分離

程式碼組織必須遵循清晰的模組邊界，避免單一檔案過度龐大。

**強制規則**：
- `main.ts` 保持最小化：僅處理外掛生命週期（onload、onunload、註冊命令）
- 單一檔案不應超過 200-300 行，超過則必須拆分
- 功能實作委派至獨立模組
- 建議的檔案結構：
  ```
  src/
    main.ts           # 外掛入口點與生命週期管理
    settings.ts       # 設定介面與預設值
    commands/         # 命令實作
    ui/               # UI 元件、Modal、View
    utils/            # 工具函式與輔助程式
    types.ts          # TypeScript 型別定義
  ```

**設計原則**：每個檔案應有單一、明確的職責範圍。

### III. 遵循 Obsidian 開發規範

所有開發工作必須遵守 [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin) 與官方文件要求。

**API 與型別定義規範（NON-NEGOTIABLE）**：
- 必須使用 [obsidian.d.ts](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts) 作為 Obsidian API 的型別定義與風格規範參考
- 所有與 Obsidian 互動的程式碼必須遵循 `obsidian` package 提供的型別定義
- 使用 TypeScript 型別系統確保 API 呼叫的正確性
- 定期執行 `npm update` 以獲取最新的 Obsidian API 更新

**必要遵循**：
- 命令 ID 必須穩定，一旦發佈不得重新命名
- 使用 `this.register*` 輔助方法確保資源正確清理
- 避免使用 Node.js/Electron API（除非設定 `isDesktopOnly: true`）
- 實作 `onload()` 與 `onunload()` 確保外掛可安全載入/卸載

**外部依賴限制**：
- 不得提交建置產物至版本控制（`node_modules/`, `main.js`）
- 最小化依賴套件，優先選擇瀏覽器相容的輕量套件
- 所有外部依賴必須打包至 `main.js` 中

### IV. 安全性、隱私與合規性（NON-NEGOTIABLE）

外掛必須遵守 Obsidian 的開發者政策與使用者隱私原則。

**強制規範**：
- 預設為本地/離線運作，僅在功能必要時才進行網路請求
- 禁止隱藏的遙測數據收集
- 若使用第三方服務或收集分析數據，必須：
  - 明確的選擇加入機制（opt-in）
  - 在 `README.md` 和設定頁面清楚說明
- 禁止執行遠端程式碼、動態載入外部腳本、自動更新外掛程式碼
- 最小權限原則：僅讀寫 vault 內必要的檔案，不得存取 vault 外部
- 明確揭露使用的外部服務、傳送的資料及風險
- 尊重使用者隱私：除非絕對必要且經使用者明確同意，否則不得收集 vault 內容、檔案名稱或個人資訊

### V. 效能與使用者體驗優先

外掛必須輕量、快速，避免影響 Obsidian 核心體驗。

**效能要求**：
- 啟動時保持輕量，延遲載入非必要功能
- 避免在 `onload()` 執行耗時任務，使用延遲初始化
- 批次處理磁碟存取，避免過度掃描 vault
- 對檔案系統事件使用 debounce/throttle 處理昂貴操作
- 行動裝置優先考量：避免大型記憶體結構，注意記憶體與儲存限制

**使用者體驗規範**：
- 命令與設定文字使用句子大小寫（sentence case）
- UI 文字保持簡短、一致、無術語
- 步驟說明使用清晰、行動導向的指令
- 使用 **粗體** 標示 UI 標籤，導航使用箭頭符號（例：**設定 → 社群外掛**）

## 版本控制與發佈規範

### 語意化版本控制

外掛版本號必須遵循 Semantic Versioning（SemVer）：`MAJOR.MINOR.PATCH`

**版本更新規則**：
- `manifest.json` 中的 `version` 欄位必須與 GitHub Release tag 完全一致（不使用 `v` 前綴）
- `versions.json` 必須維護外掛版本與最低相容 Obsidian 版本的對應關係
- `minAppVersion` 必須準確反映使用的 API 最低需求版本

**發佈流程**：
1. 更新 `manifest.json` 的 `version` 與 `minAppVersion`
2. 更新 `versions.json` 對應關係
3. 建立 GitHub Release，tag 名稱與 `manifest.json` 的 `version` 完全一致
4. 附加 `manifest.json`、`main.js`、`styles.css`（如有）至 Release 資產
5. 首次發佈後，遵循社群外掛目錄的新增/更新流程

**自動化工具**：
- 可使用 `npm version patch|minor|major` 自動更新版本號
- 確保 `version-bump.mjs` 腳本正確執行

## 測試與品質保證

### 測試驅動開發原則（NON-NEGOTIABLE）

所有功能開發必須遵循測試驅動開發（TDD）流程，確保程式碼品質與功能正確性。

**強制測試要求**：
- **單元測試（Unit Tests）**：
  - 每個功能模組必須撰寫對應的單元測試
  - 測試應覆蓋主要功能邏輯與邊界條件
  - 測試必須在功能實作前後執行，確認功能正確性
  - 使用適當的測試框架（如 Jest、Vitest）
  
- **整合測試（Integration Tests）**：
  - 測試模組間的互動與整合
  - 驗證與 Obsidian API 的整合是否正確
  - 測試關鍵使用者流程的端對端功能
  - 確保跨平台相容性（若非 `isDesktopOnly`）

**測試執行時機**：
1. **功能實作前**：撰寫失敗的測試（Red）
2. **功能實作中**：實作最小可行程式碼使測試通過（Green）
3. **功能實作後**：重構並確保測試仍通過（Refactor）
4. **提交前**：執行完整測試套件，確保無退化問題

**測試覆蓋率目標**：
- 核心功能模組：最低 80% 覆蓋率
- 工具函式與輔助模組：最低 70% 覆蓋率
- UI 元件：基本互動測試必須涵蓋

### 程式碼品質標準（NON-NEGOTIABLE）

**強制要求**：
- **ESLint 程式碼檢查**：
  - 必須使用 ESLint 進行靜態程式碼分析
  - 遵循 `eslint-plugin-obsidianmd` 建議配置（Obsidian 專用規則）
  - 執行指令：`npm run lint`
  - 所有 ESLint 錯誤必須在提交前修正
- **TypeScript 嚴格模式**：`strict` 模式必須啟用
- **程式碼風格**：優先使用 `async/await` 而非 Promise 鏈，妥善處理錯誤
- **資源管理**：所有事件監聽器與定時器必須使用 `this.register*` 方法註冊，確保卸載時自動清理

**手動測試**：
- 複製 `main.js`、`manifest.json`、`styles.css` 至 `<Vault>/.obsidian/plugins/<plugin-id>/`
- 重新載入 Obsidian 並在設定中啟用外掛
- 驗證功能在實際環境中的運作狀況

### Linting 與格式化（強制執行）

- **開發階段**：執行 `npm run lint` 進行程式碼檢查
- **CI/CD 自動化**：GitHub Action 在每次 commit 自動執行 lint，確保程式碼品質
- **格式規範**：遵循專案既有的程式碼風格與格式規範
- **違規處理**：lint 錯誤視為阻擋性問題，必須修正後才可合併

## 文件與溝通規範

### Changelog 文件化流程（NON-NEGOTIABLE）

每次功能實作完成後，必須建立變更日誌文件，記錄變更的完整脈絡與技術細節。

**強制要求**：
- **觸發時機**：功能實作完成後、提交程式碼變更前
- **文件位置**：遵循 `.github/instructions/changelog.instructions.md` 規範
  - 依目標檔案位置組織：`docs/{目標資料夾}/{功能分類}/{描述}.md`
  - 功能分類：`reports/`（完成報告）、`guides/`（使用指南）、`specs/`（技術規格）
- **必要內容**：
  - **實作目的**：說明為何需要此變更
  - **實現方式**：詳細描述技術實作方法
  - **結果**：變更的成果與影響範圍
  - **建議事項**：後續改進方向或注意事項

**文件命名規範**：
- 使用繁體中文命名，清晰易讀
- 格式：`{變更類型}-{簡要描述}.md`
- 變更類型：功能、重構、修復、更新、整合、報告

**範例**：
```
docs/src/reports/功能-AI助手整合報告.md
docs/src/guides/使用指南-快速開始.md
docs/src/specs/技術規格-API設計.md
```

### 必要文件

**專案根目錄必須包含**：
- `README.md`：外掛說明、安裝步驟、使用方法、功能特色
- `manifest.json`：外掛元資料與版本資訊
- `LICENSE`：授權條款（建議使用與 sample plugin 相同的 ISC License）

**README.md 必要內容**：
- 外掛功能說明
- 安裝與使用指引
- 若使用外部服務，明確說明資料處理與隱私政策
- 可選：funding URL（於 `manifest.json` 設定）

### 程式碼註解與文件

- 使用 TSDoc 註解說明公開 API、介面與複雜邏輯
- 保持註解簡潔且與程式碼同步更新
- 避免過時或誤導性註解

## 行動裝置相容性

### 相容性考量

- 除非 `isDesktopOnly: true`，否則必須在 iOS 和 Android 上測試
- 避免假設桌面專屬行為或 API
- 注意行動裝置的記憶體與儲存限制
- 避免使用 Node.js/Electron API（除非明確設定為桌面專用）
## 版本控制與自動化工作流程

### 版本控制原則（NON-NEGOTIABLE）

**自動化提交流程**：
- 每次功能實作完成後，必須自動紀錄版本並提交至版本控制系統
- 使用 `git-auto-push -a` 指令自動保存更新
- 確保提交訊息清晰描述變更內容

**提交前檢查清單**：
1. ✅ 所有測試通過（單元測試與整合測試）
2. ✅ ESLint 檢查無錯誤
3. ✅ Changelog 文件已建立
4. ✅ 無敏感資訊（金鑰、密鑰、API Token）
5. ✅ 建置產物已排除（`node_modules/`, `main.js`）

### 安全性檢查（NON-NEGOTIABLE）

**金鑰與密鑰管理**：
- **絕對禁止**將任何金鑰、密鑰、API Token、密碼提交至版本控制
- Git 更新前必須執行安全性檢查，確認無敏感資訊
- 使用環境變數或安全的配置管理方式處理敏感資訊
- 若不慎提交敏感資訊，必須立即撤銷提交並重寫歷史記錄

**檢查項目**：
- 搜尋可能的 API 金鑰模式（如 `apiKey`, `secret`, `token`, `password`）
- 檢查 `.env` 檔案是否已加入 `.gitignore`
- 驗證敏感資料是否透過環境變數注入
- 確認無硬編碼的認證資訊

**自動化檢查**：
- 使用 pre-commit hooks 自動執行安全性掃描
- 可選：整合 git-secrets 或類似工具防止敏感資訊提交

### 提交訊息規範

使用語意化提交訊息（Conventional Commits）格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 類型**：
- `feat`: 新功能
- `fix`: 錯誤修復
- `docs`: 文件更新
- `refactor`: 程式碼重構
- `test`: 測試相關
- `chore`: 建置或工具變更

**範例**：
```
feat(commands): 新增 AI 助手整合命令

- 實作 AI 助手 API 整合
- 新增使用者介面互動元件
- 完成單元測試與整合測試

Closes #123
```
## 治理規範

### 憲章地位與修訂

本憲章為專案開發的最高指導原則，所有開發實踐必須遵守本憲章規定。

**修訂流程**：
- 憲章修訂需經過文件化、審核與核准
- 修訂需提供遷移計畫，說明對現有程式碼的影響
- 版本號遵循語意化版本控制：
  - MAJOR：向後不相容的治理規則或原則移除/重新定義
  - MINOR：新增原則/章節或實質擴展指引
  - PATCH：澄清、措辭、錯字修正、非語意性改進

### 合規性檢查

- 所有 Pull Request 與程式碼審查必須驗證是否符合憲章規範
- 任何複雜度增加必須提供合理性說明
- 使用本憲章作為開發過程中的執行時指引

### 參考資源

- [Obsidian 官方文件](https://docs.obsidian.md)
- [Obsidian 外掛指引](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian API 型別定義](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts)
- [開發者政策](https://docs.obsidian.md/Developer+policies)

**版本**: 1.1.0 | **批准日期**: 2025-12-22 | **最後修訂**: 2025-12-22
