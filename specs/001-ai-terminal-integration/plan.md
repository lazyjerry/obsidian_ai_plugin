# Implementation Plan: AI Terminal Integration

**Branch**: `001-ai-terminal-integration` | **Date**: 2025-12-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-terminal-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

**功能目標**: 為 Obsidian 外掛整合嵌入式終端面板，提供 AI CLI 工具便捷執行環境與上下文指令功能。

**核心特性**:
- ✅ **嵌入式終端**: 基於 xterm.js 的 Web 終端模擬器，整合至 Obsidian 底部面板
- ✅ **Python PTY 後端**: 跨平台偽終端實作（unix_pty.py/windows_pty.py），無需 C++ 編譯
- ✅ **上下文指令**: `@cfile` 和 `@folder` 自動替換為當前檔案路徑與資料夾路徑
- ✅ **選取範圍參考**: 產生 GitHub 風格檔案連結（如 `file.md#L10-L15`）供終端使用
- ✅ **桌面平台支援**: Windows、macOS、Linux（`isDesktopOnly: true`）

**關鍵技術決策**:
1. **不使用 node-pty**（避免 native module 編譯複雜性）→ 改用 Python PTY 腳本
2. **執行時替換上下文指令**（使用者按下 Enter 時處理）→ 保持輸入視覺清晰
3. **無持久化儲存**（Phase 1）→ 終端狀態記憶體內管理，降低複雜度
4. **安全性優先**（Phase 2）→ README 警告 + 首次開啟確認對話框

**架構概覽**:
```
┌─────────────────────────────────────────────┐
│ Obsidian Plugin (TypeScript)                │
│  ┌───────────────────────────────────────┐  │
│  │ TerminalView (ItemView)               │  │
│  │  ├─ XtermEmulator (xterm.js wrapper)  │  │
│  │  └─ ContextCommandHandler             │  │
│  └───────────────────────────────────────┘  │
│              ↕ (stdin/stdout)               │
│  ┌───────────────────────────────────────┐  │
│  │ PtyProcess (Python PTY wrapper)       │  │
│  │  └─ unix_pty.py / windows_pty.py      │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**實作階段**:
- ✅ **Phase 0 (Research)**: 完成技術研究（Python PTY 方案、xterm.js 整合模式）
- ✅ **Phase 1 (Design)**: 完成資料模型、API 合約、開發指南（data-model.md, contracts/, quickstart.md）
- ⏳ **Phase 2 (Implementation)**: 待執行（使用 `/speckit.tasks` 產生任務清單）
- ⏳ **Phase 3 (Optimization)**: 待執行（效能優化、無障礙功能、序列化支援）

**成功標準** (基於 spec.md SC-001 至 SC-008):
- ✅ SC-001: 終端可整合至 Obsidian 底部面板（TerminalView extends ItemView）
- ✅ SC-002: 終端可執行基本系統命令（Python PTY 提供完整 shell 環境）
- ✅ SC-003: `@cfile` 替換為當前檔案絕對路徑（ContextCommandHandler 實作）
- ✅ SC-004: `@folder` 替換為當前資料夾路徑（PathHelper.getVaultPath()）
- ✅ SC-005: 選取範圍轉換為 GitHub 風格連結（SelectionReferenceHandler 實作）
- ✅ SC-006: 點擊連結複製至剪貼簿（Notice API 提供 click-to-copy）
- ⏳ SC-007: 效能與穩定性（Phase 2 測試驗證）
- ⏳ SC-008: 跨平台相容性（Phase 2 測試驗證）

**下一步行動**:
```bash
# 執行此指令產生實作任務清單
/speckit.tasks
```

## Technical Context

**Language/Version**: TypeScript 5.x，Node.js v18+ LTS（最新穩定版）  
**Primary Dependencies**: 
  - obsidian API (核心外掛框架)
  - xterm.js (Web 終端模擬器，參考 obsidian-terminal)
  - Python 3.10+ (PTY 腳本執行環境，取代 node-pty 避免 native module 編譯)
  - esbuild (打包工具)
  
**Storage**: N/A（無需持久化資料庫，終端狀態為記憶體內管理）  

**Testing**: 
  - Jest 或 Vitest（單元測試與整合測試）
  - eslint-plugin-obsidianmd（Obsidian 專用 linting）
  - 手動測試：複製至 `.obsidian/plugins/` 並在 Obsidian 中驗證
  
**Target Platform**: 
  - Obsidian 桌面版（Desktop only: Windows、macOS、Linux）
  - manifest.json 設定 `"isDesktopOnly": true`
  - 最低 Obsidian 版本待測試後確認（估計 v1.0.0+）
  
**Project Type**: Single Obsidian Plugin（外掛專案結構）  

**Performance Goals**: 
  - 終端啟動時間 < 3 秒（從點擊到可輸入，與 spec.md SC-001 一致）
  - 上下文指令替換延遲 < 100ms（@cfile/@folder 即時替換）
  - 終端輸出延遲 < 50ms（使用者輸入到畫面顯示）
  - 記憶體使用 < 50MB（終端連線運作狀態）
  
**Constraints**: 
  - 必須符合 Obsidian Plugin Guidelines（NON-NEGOTIABLE）
  - 禁止執行遠端程式碼或自動更新外掛
  - 僅讀寫 vault 內檔案，不得存取 vault 外部（除終端命令本身）
  - 必須在 onunload() 正確釋放所有資源（連線、事件監聽器）
  - 外部 AI CLI 工具由使用者自行安裝（不打包至外掛）
  
**Scale/Scope**: 
  - 單一使用者本機環境
  - 支援單一終端實例（不支援多終端分頁）
  - 預期程式碼規模：約 1500-2500 行（含測試）
  - 預期模組數量：5-8 個主要模組（main、terminal-view、context-command、selection-ref、settings 等）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 基於官方範本開發（NON-NEGOTIABLE）

- ✅ **PASS**: 使用 obsidian-sample-plugin 為基礎架構
- ✅ **PASS**: Node.js v18+ LTS、TypeScript 5.x、esbuild 打包
- ✅ **PASS**: 入口點 `src/main.ts`，輸出 `main.js`
- ✅ **PASS**: 包含 `manifest.json`（設定 `"isDesktopOnly": true`）

### 模組化架構與職責分離

- ✅ **PASS**: `main.ts` 僅處理外掛生命週期
- ✅ **PASS**: 預計模組結構：
  ```
  src/
    main.ts              # 外掛生命週期（onload/onunload）
    terminal-view.ts     # 終端 UI 元件與面板管理
    context-commands.ts  # @cfile/@folder 指令解析與替換
    selection-ref.ts     # 選取範圍參考產生與通知
    settings.ts          # 外掛設定介面
    utils/
      path-resolver.ts   # 路徑解析與轉義工具
      terminal-session.ts # 終端連線管理
    types.ts             # TypeScript 型別定義
  ```
- ✅ **PASS**: 單一檔案預計不超過 200-300 行

### 遵循 Obsidian 開發規範

- ✅ **PASS**: 使用 obsidian.d.ts 作為型別定義參考
- ✅ **PASS**: 命令 ID 穩定（如 `ai-terminal:open-terminal`）
- ✅ **PASS**: 使用 `this.register*` 確保資源清理
- ✅ **PASS**: `isDesktopOnly: true`（使用 Node.js/Electron API）
- ✅ **PASS**: 實作 `onload()` 與 `onunload()`

**外部依賴限制**：
- ✅ **PASS**: node-pty、xterm.js 打包至 `main.js`
- ✅ **PASS**: 不提交 `node_modules/`、`main.js` 至版本控制
- ⚠️ **REVIEW**: node-pty 為 native module，需確認跨平台編譯策略

### 安全性、隱私與合規性（NON-NEGOTIABLE）

- ✅ **PASS**: 預設本地/離線運作（終端連線本機環境）
- ✅ **PASS**: 無遙測數據收集
- ✅ **PASS**: 外部 AI CLI 工具由使用者自行安裝與配置
- ✅ **PASS**: 不執行遠端程式碼或自動更新
- ⚠️ **CAUTION**: 終端可執行系統命令，需明確告知使用者風險
  - **緩解措施**: README 中明確說明安全性風險與權限要求
  - **緩解措施**: 首次開啟終端時顯示警告對話框，使用者確認後才啟用
- ✅ **PASS**: 僅讀寫 vault 內檔案（@cfile/@folder 提供路徑資訊）

### 效能與使用者體驗優先

- ✅ **PASS**: 延遲載入終端（僅在使用者開啟時初始化）
- ✅ **PASS**: 效能目標明確（啟動 < 2s、指令替換 < 100ms）
- ✅ **PASS**: 使用 debounce 處理檔案系統事件（如檔案切換）
- ✅ **PASS**: UI 文字使用句子大小寫，保持簡潔
- ✅ **PASS**: 桌面裝置優先（`isDesktopOnly: true`）

### 測試驅動開發原則（NON-NEGOTIABLE）

- ✅ **PASS**: 規劃單元測試（Jest/Vitest）
- ✅ **PASS**: 規劃整合測試（Obsidian API 互動）
- ✅ **PASS**: 測試執行時機：實作前（Red）、實作中（Green）、實作後（Refactor）
- ✅ **PASS**: 覆蓋率目標：核心模組 80%+、工具函式 70%+
- ✅ **PASS**: ESLint 檢查（eslint-plugin-obsidianmd）

### Changelog 文件化流程（NON-NEGOTIABLE）

- ✅ **PASS**: 功能完成後建立 changelog 文件
- ✅ **PASS**: 文件位置：`docs/{目標資料夾}/{功能分類}/{描述}.md`
- ✅ **PASS**: 包含實作目的、實現方式、結果、建議事項

### 版本控制與自動化工作流程（NON-NEGOTIABLE）

- ✅ **PASS**: 使用 Semantic Versioning（SemVer）
- ✅ **PASS**: 提交前檢查：測試通過、ESLint 無錯誤、Changelog 建立
- ✅ **PASS**: 安全性檢查：無敏感資訊（金鑰、密鑰、Token）
- ✅ **PASS**: 使用 `git-auto-push -a` 自動提交
- ✅ **PASS**: Conventional Commits 格式

### 🚨 Phase 1 設計後重新評估

**✅ 已解決的項目**:

1. **node-pty 跨平台編譯策略（已解決）**
   - **原議題**: node-pty 為 native module，需 C++ 編譯，跨平台部署複雜
   - **解決方案**: 採用 **Python PTY 腳本方案**（參考 obsidian-terminal 專案）
   - **技術決策**: 
     - Unix-like 系統（macOS/Linux）使用 `unix_pty.py`（基於 `pty.spawn()`）
     - Windows 系統使用 `windows_pty.py`（基於 `winpty` 或 `ConPTY` API）
   - **實作細節**: 
     - Node.js 使用 `child_process.spawn('python3', ['unix_pty.py', ...])` 啟動 PTY 程序
     - 透過 stdin/stdout/stderr 與 PTY 通訊（UTF-8 編碼）
     - 無需 C++ 編譯，降低使用者安裝門檻
   - **風險緩解**: 
     - README 明確要求 Python 3.10+ 安裝
     - 提供 `scripts/setup.sh` 和 `scripts/setup.bat` 自動檢查 Python 環境
   - **參考文件**: `research.md` Section 1（Native Module Handling Strategy）
   - **狀態**: ✅ **RESOLVED** - 已於 Phase 0 研究中確認可行性，Phase 1 已定義 API 合約（contracts/pty-api.md）

2. **終端執行系統命令的安全性風險告知（已規劃緩解措施）**
   - **風險評估**: 終端可執行任意系統命令，具有潛在系統安全風險
   - **緩解措施已規劃**（Phase 2 實作）:
     1. **README 明確說明**: 
        - 在安裝教學中獨立「安全性注意事項」章節
        - 說明終端可存取完整系統權限（讀寫檔案、網路連線、程序管理）
        - 建議僅在受信任環境使用（如個人開發機器）
     2. **首次開啟警告對話框**: 
        - 使用 Obsidian `Modal` API 實作安全警告
        - 顯示內容：「此終端可執行系統命令，請勿執行不受信任的指令」
        - 需使用者勾選「我了解風險」並點擊「繼續」才能啟用終端
        - 設定項儲存於 `data.json`（首次確認後不再顯示）
     3. **平台限制**: 
        - `manifest.json` 設定 `"isDesktopOnly": true"` 禁用行動裝置
        - 僅支援桌面平台（Windows/macOS/Linux）
   - **實作計畫**: Phase 2 tasks 包含「SecurityWarningModal」與「README 安全性章節」
   - **狀態**: ⚠️ **PLANNED** - 緩解措施已定義，待 Phase 2 實作

**Overall Status**: ✅ **PASS (with documented mitigations)** - 所有憲章要求已滿足或規劃緩解措施

- **Critical Issues**: 0（無阻斷性問題）
- **Review Items**: 2 → **已全數解決或規劃緩解措施**
  - ✅ node-pty 跨平台編譯 → Python PTY 腳本方案取代
  - ⚠️ 終端安全性風險 → README 警告 + 首次開啟對話框（Phase 2 實作）
- **Recommendations**: 
  - Phase 3 加強無障礙功能（鍵盤導航、螢幕閱讀器支援）
  - Phase 2 實作詳細的系統資源監控（memory/CPU tracking）

**Ready for Implementation**: ✅ Yes（Phase 0 研究完成、Phase 1 設計完成，可進入 /speckit.tasks 階段）

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-terminal-integration/
├── plan.md              # ✅ This file (/speckit.plan command output)
├── research.md          # ✅ Phase 0 output (Native module strategy, xterm.js integration)
├── data-model.md        # ✅ Phase 1 output (Core entities & relationships)
├── quickstart.md        # ✅ Phase 1 output (Developer setup guide)
└── contracts/           # ✅ Phase 1 output (API contracts)
    ├── README.md
    ├── types.ts.md
    ├── pty-api.md
    ├── context-commands-api.md
    ├── path-api.md
    └── selection-api.md
```

### Source Code (repository root)

```text
src/
├── main.ts                      # Plugin 入口點（生命週期管理）
├── types.ts                     # 核心型別定義
├── settings.ts                  # 外掛設定介面
├── views/
│   └── TerminalView.ts          # ItemView 實作（底部面板）
├── terminal/
│   ├── xterm-emulator.ts        # xterm.js 封裝
│   ├── pty-session.ts           # 單一 PTY 連線管理
│   ├── pty-manager.ts           # PTY 多實例管理器
│   └── context-commands.ts      # @cfile/@folder 處理
└── utils/
    ├── path-helper.ts           # 路徑處理工具
    ├── selection-reference.ts   # 選取範圍參考
    └── debounce.ts              # 防抖工具

scripts/
├── unix_pty.py                  # Unix PTY Python 腳本
├── windows_pty.py               # Windows PTY Python 腳本
├── setup.sh                     # Unix 環境設定
└── setup.bat                    # Windows 環境設定

tests/
├── unit/
│   ├── context-commands.test.ts
│   ├── path-helper.test.ts
│   └── selection-reference.test.ts
└── integration/
    └── terminal-view.test.ts
```

**Structure Decision**: 
- **Single Obsidian Plugin** 架構（非 web/mobile 專案）
- 模組化分層：views（UI）、terminal（核心邏輯）、utils（工具函式）
- Python 腳本獨立於 `scripts/` 目錄，避免與 TypeScript 編譯混淆
- 測試分離為 unit 與 integration，符合 TDD 要求

## Complexity Tracking

**Phase 1 設計後重新評估**：

### ✅ 已解決的項目

**REVIEW: node-pty 跨平台編譯策略**
- **解決方案**：採用 Python PTY 腳本方案（參考 obsidian-terminal）
- **技術決策**：使用 `unix_pty.py`（macOS/Linux）與 `windows_pty.py`（Windows）
- **優勢**：無需 C++ 編譯、跨平台一致性高、降低使用者安裝門檻
- **風險緩解**：README 明確要求 Python 3.10+、提供 setup.sh/setup.bat 安裝腳本
- **狀態**：✅ **RESOLVED** - research.md 已詳細記錄實作方案

**CAUTION: 終端執行系統命令的安全性風險告知**
- **緩解措施已規劃**：
  1. README.md 明確說明安全性風險與權限要求
  2. 首次開啟終端時顯示警告對話框（使用 Obsidian Modal API）
  3. manifest.json 設定 `"isDesktopOnly": true` 限制平台
  4. 不預設啟用外掛，需使用者手動啟用
- **實作計畫**：Phase 2 實作警告對話框與 README 安全性章節
- **狀態**：⚠️ **PLANNED** - 緩解措施已定義，待 Phase 2 實作

### 📊 複雜度評估（Phase 1 後）

| 項目 | 複雜度等級 | 說明 |
|------|-----------|------|
| **模組數量** | 🟢 低（8 個核心模組） | 符合憲章要求（單檔 200-300 行） |
| **依賴管理** | 🟡 中（xterm.js + Python PTY） | 外部依賴明確且穩定 |
| **跨平台相容性** | 🟡 中（需支援 macOS/Windows/Linux） | Python 腳本統一處理 PTY，降低複雜度 |
| **狀態管理** | 🟢 低（記憶體內狀態） | Phase 1 無持久化需求 |
| **錯誤處理** | 🟡 中（6 種錯誤類型） | 已定義完整錯誤處理策略 |
| **測試覆蓋** | 🟡 中（目標 80%+） | TDD 流程確保品質 |

**整體複雜度**：🟡 **中等** - 符合預期，無需額外簡化

### 🎯 下一階段（Phase 2）行動

1. **立即執行** `/speckit.tasks` 產生實作任務清單
2. **優先實作**：Phase 1 MVP（TerminalView + XtermEmulator + Python PTY）
3. **驗證點**：終端開啟並能執行基本系統命令
4. **測試策略**：Red-Green-Refactor TDD 循環

**Overall Status**: ✅ **APPROVED FOR IMPLEMENTATION** - 所有必要研究完成，設計符合憲章要求，可進入實作階段

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
