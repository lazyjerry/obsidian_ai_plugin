# Tasks: AI Terminal Integration

**Input**: Design documents from `/specs/001-ai-terminal-integration/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: 測試任務已納入（TDD 流程：Red-Green-Refactor）  
**Organization**: 任務依 User Story 分組，每個 Story 可獨立實作與測試

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案、無相依性）
- **[Story]**: 所屬 User Story（US1, US2, US3, US4）
- 所有路徑皆為相對於專案根目錄

---

## Phase 1: Setup (專案初始化)

**Purpose**: 建立專案結構與基礎配置

- [ ] T001 建立專案目錄結構（src/views/, src/terminal/, src/utils/, scripts/, tests/）
- [ ] T002 初始化 package.json（含 obsidian、@xterm/xterm、typescript、jest 依賴）
- [ ] T003 [P] 建立 tsconfig.json（TypeScript 5.x strict mode 配置）
- [ ] T004 [P] 建立 esbuild.config.mjs（打包配置，external: ['obsidian', 'electron']）
- [ ] T005 [P] 建立 manifest.json（isDesktopOnly: true）
- [ ] T006 [P] 建立 .gitignore（排除 node_modules/, main.js, .obsidian/）
- [ ] T007 [P] 配置 ESLint 與 Prettier（含 eslint-plugin-obsidianmd）

---

## Phase 2: Foundational (基礎建設)

**Purpose**: 所有 User Story 共用的核心基礎設施

**⚠️ 關鍵**: 此階段必須完成後，User Story 實作才能開始

- [ ] T008 建立 src/types.ts 定義核心型別（TerminalStatus, TerminalSession, TerminalStats）
- [ ] T009 [P] 建立 src/utils/path-helper.ts 實作 PathHelperAPI 介面
- [ ] T010 [P] 建立 scripts/unix_pty.py（macOS/Linux PTY 腳本）
- [ ] T011 [P] 建立 scripts/windows_pty.py（Windows PTY 腳本）
- [ ] T012 建立 src/terminal/pty-session.ts **骨架**（類別結構與介面定義，完整實作見 T020）
- [ ] T013 建立 src/terminal/xterm-emulator.ts **骨架**（類別結構與介面定義，完整實作見 T019）
- [ ] T014 建立 src/settings.ts 定義外掛設定介面（PluginSettings interface）
- [ ] T015 建立 src/main.ts 外掛入口點骨架（onload/onunload）
- [ ] T015.1 [P] 建立 src/utils/debounce.ts 實作防抖工具函式

**Checkpoint**: 基礎建設完成 - User Story 實作可並行開始

---

## Phase 3: User Story 1 - 開啟內嵌終端介面 (Priority: P1) 🎯 MVP

**Goal**: 使用者能在 Obsidian 底部面板開啟終端，連接本機環境並執行基本系統命令

**Independent Test**: 開啟外掛 → 點擊 ribbon icon → 終端出現在底部 → 執行 `pwd` 顯示當前目錄

### Tests for User Story 1

- [ ] T016 [P] [US1] 單元測試：XtermEmulator 初始化與銷毀 in tests/unit/xterm-emulator.test.ts
- [ ] T017 [P] [US1] 單元測試：PtySession 建立與通訊 in tests/unit/pty-session.test.ts
- [ ] T018 [P] [US1] 整合測試：TerminalView 開啟與關閉 in tests/integration/terminal-view.test.ts

### Implementation for User Story 1

- [ ] T019 [US1] **完整實作** src/terminal/xterm-emulator.ts（基於 T013 骨架）
  - 初始化 Terminal 與 FitAddon
  - 監聽 ResizeObserver 自動調整大小
  - 實作 dispose() 釋放資源
- [ ] T020 [US1] **完整實作** src/terminal/pty-session.ts（基於 T012 骨架）
  - 啟動 Python PTY 腳本（unix_pty.py / windows_pty.py）
  - 建立 stdin/stdout/stderr 資料流
  - 處理 PTY 進程退出事件
- [ ] T021 [US1] 實作 src/terminal/pty-manager.ts（PtyManagerAPI 介面）
  - create() 建立新終端連線
  - destroy() 銷毀連線並釋放資源
  - getAllSessions() 取得所有活躍連線
- [ ] T022 [US1] 實作 src/views/TerminalView.ts（extends ItemView）
  - 建立底部面板 UI 容器
  - 整合 XtermEmulator 與 PtySession
  - 實作 getViewType(), getDisplayText(), onClose()
- [ ] T023 [US1] 更新 src/main.ts 註冊終端視圖與命令
  - registerView() 註冊 TerminalView
  - addRibbonIcon() 新增工具列圖示
  - addCommand() 新增命令面板指令 "ai-terminal:open-terminal"
- [ ] T024 [US1] 實作終端預設工作目錄為當前檔案所在目錄
  - 使用 app.workspace.getActiveFile() 取得當前檔案
  - 使用 PathHelper.getFileDirectory() 取得目錄路徑
  - 若無檔案開啟則使用 vault 根目錄
- [ ] T025 [US1] 實作終端快捷鍵支援（FR-010）
  - Ctrl+C 中斷當前執行指令（傳送 SIGINT）
  - 上下鍵瀏覽命令歷史（xterm.js onKey 事件處理）
  - 支援 Tab 補全（可選，Phase 3 優化）
- [ ] T026 [US1] 實作終端重新連線功能（FR-008）
  - 偵測 PTY 進程意外退出
  - 提供「重新連線」按鈕或自動重連選項
  - 顯示連線狀態指示器

**Checkpoint**: User Story 1 完成 - 終端可開啟並執行基本命令

---

## Phase 4: User Story 2 - 使用上下文快速指令 (@cfile, @folder) (Priority: P2)

**Goal**: 使用者在終端輸入 `@cfile` 或 `@folder`，按 Enter 時自動替換為實際路徑

**Independent Test**: 輸入 `echo @cfile` → 按 Enter → 顯示當前檔案的完整路徑

### Tests for User Story 2

- [ ] T027 [P] [US2] 單元測試：@cfile 替換邏輯 in tests/unit/context-commands.test.ts
- [ ] T028 [P] [US2] 單元測試：@folder 替換邏輯 in tests/unit/context-commands.test.ts
- [ ] T029 [P] [US2] 單元測試：路徑轉義（含空格、中文、特殊字元） in tests/unit/path-helper.test.ts

### Implementation for User Story 2

- [ ] T030 [US2] 實作 src/terminal/context-commands.ts（ContextCommandHandlerAPI 介面）
  - 定義 ContextCommand 介面與內建指令（@cfile, @folder）
  - 實作 handleInput() 攔截 Enter 鍵
  - 實作 replaceContextCommands() 替換邏輯
- [ ] T031 [US2] 實作 @cfile resolver
  - 使用 app.workspace.getActiveFile() 取得當前檔案
  - 使用 FileSystemAdapter.getFullPath() 取得絕對路徑
  - 無檔案開啟時拋出 TerminalError
- [ ] T032 [US2] 實作 @folder resolver
  - 使用 FileSystemAdapter.getBasePath() 取得 vault 路徑
- [ ] T033 [US2] 更新 src/utils/path-helper.ts 實作 escapePath()
  - Unix：使用單引號包裹路徑
  - Windows：使用雙引號包裹路徑
  - 處理路徑內的引號字元
- [ ] T034 [US2] 整合 ContextCommandHandler 至 TerminalView
  - 在 xterm.js onData 事件中調用 handleInput()
  - 替換後的指令傳送給 PTY 執行
- [ ] T035 [US2] 實作錯誤處理：無檔案開啟時顯示錯誤訊息
  - 使用 Obsidian Notice API 顯示「錯誤：目前沒有開啟的檔案，無法替換 @cfile」

**Checkpoint**: User Story 2 完成 - @cfile/@folder 指令可正確替換

---

## Phase 5: User Story 3 - 選取文字取得檔案路徑與行數範圍 (Priority: P3)

**Goal**: 使用者選取文字後執行命令，系統顯示通知訊息展示 GitHub 風格引用，點擊可複製

**Independent Test**: 選取第 10-15 行 → 執行命令 → 顯示通知 `file.md#L10-L15` → 點擊複製到剪貼簿

### Tests for User Story 3

- [ ] T036 [P] [US3] 單元測試：SelectionReference 格式化 in tests/unit/selection-reference.test.ts
- [ ] T037 [P] [US3] 單元測試：單行/多行/游標位置處理 in tests/unit/selection-reference.test.ts

### Implementation for User Story 3

- [ ] T038 [US3] 實作 src/utils/selection-reference.ts（SelectionReferenceHandlerAPI 介面）
  - getSelection()：取得當前選取範圍（MarkdownView.editor.getCursor()）
  - formatReference()：產生 GitHub 風格引用字串
  - showReferenceNotice()：顯示可點擊的通知訊息
- [ ] T039 [US3] 實作單行選取格式（file.md#L10）
- [ ] T040 [US3] 實作多行選取格式（file.md#L10-L15）
- [ ] T041 [US3] 實作無選取時使用游標所在行號
- [ ] T042 [US3] 實作 copyToClipboard()（使用 navigator.clipboard.writeText()）
- [ ] T043 [US3] 更新 src/main.ts 新增命令 "ai-terminal:copy-selection-reference"

**Checkpoint**: User Story 3 完成 - 選取範圍參考可產生並複製

---

## Phase 6: User Story 4 - AI Agent 與 Obsidian 上下文整合 (Priority: P2)

**Goal**: 終端支援與外部 AI CLI 工具整合，透過上下文指令讓 AI 取得 Obsidian 資訊

**Independent Test**: 執行 `aichat "分析 @cfile 的內容"` → @cfile 替換為實際路徑 → AI 正確讀取檔案

### Tests for User Story 4

- [ ] T044 [P] [US4] 整合測試：AI CLI 工具指令執行 in tests/integration/ai-cli-integration.test.ts

### Implementation for User Story 4

- [ ] T045 [US4] 驗證 @cfile/@folder 替換與 AI CLI 工具整合
  - 測試 aichat、claude-cli 等常見 AI CLI 工具
  - 確認路徑轉義正確，AI 可讀取檔案內容
- [ ] T046 [US4] 建立 README.md 使用者指南
  - 說明如何安裝外部 AI CLI 工具
  - 提供 @cfile/@folder 使用範例
  - 說明選取範圍參考功能
- [ ] T047 [US4] 更新 quickstart.md 開發者指南
  - 新增 AI CLI 整合測試步驟
  - 新增常見問題排解

**Checkpoint**: User Story 4 完成 - AI CLI 整合驗證通過

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 跨 Story 改善、文件、安全性強化

- [ ] T048 [P] 建立 README.md 安裝教學與功能說明
- [ ] T049 [P] 建立 CHANGELOG.md 記錄版本變更
- [ ] T050 [P] 建立 scripts/setup.sh（Unix 環境檢查腳本）
- [ ] T051 [P] 建立 scripts/setup.bat（Windows 環境檢查腳本）
- [ ] T052 實作首次開啟安全警告對話框（使用 Obsidian Modal API）
- [ ] T053 [P] 新增 README.md 安全性注意事項章節
- [ ] T054 程式碼清理與重構（確保單檔不超過 300 行）
- [ ] T055 [P] 效能優化：終端啟動時間 < 2 秒驗證
- [ ] T056 [P] 記憶體洩漏檢查：確認 dispose() 正確釋放資源
- [ ] T057 執行 quickstart.md 驗證流程確認功能完整

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← 所有 User Story 共用基礎
    ↓
┌───────────────────────────────────────────────────┐
│  Phase 3 (US1)  ←  Phase 4 (US2)  ←  Phase 5 (US3) │
│      ↑                                             │
│      └──────── Phase 6 (US4) ───────────────────┘  │
└───────────────────────────────────────────────────┘
    ↓
Phase 7 (Polish)
```

### User Story Dependencies

- **User Story 1 (P1)**: 依賴 Phase 2 完成 → **MVP 核心功能**
- **User Story 2 (P2)**: 依賴 US1 完成（需要終端環境） → **上下文指令**
- **User Story 3 (P3)**: 可獨立於 US1/US2 實作 → **選取範圍參考**
- **User Story 4 (P2)**: 依賴 US1 + US2 完成 → **AI CLI 整合驗證**

### Within Each User Story

1. 測試任務（FAIL first - Red phase）
2. 資料模型/型別定義
3. 核心服務實作
4. UI 整合
5. 錯誤處理與驗證

### Parallel Opportunities

**Setup Phase (Phase 1)**:
```bash
# 可平行執行：
T003 tsconfig.json
T004 esbuild.config.mjs
T005 manifest.json
T006 .gitignore
T007 ESLint/Prettier
```

**Foundational Phase (Phase 2)**:
```bash
# 可平行執行：
T009 path-helper.ts
T010 unix_pty.py
T011 windows_pty.py
```

**User Story Tests (各 Story)**:
```bash
# 各 Story 的測試任務皆可平行執行
```

---

## Parallel Example: User Story 1

```bash
# 1. 先執行所有測試（應 FAIL）：
T016 tests/unit/xterm-emulator.test.ts
T017 tests/unit/pty-session.test.ts
T018 tests/integration/terminal-view.test.ts

# 2. 平行建立核心模組：
T019 src/terminal/xterm-emulator.ts
T020 src/terminal/pty-session.ts

# 3. 依序完成整合：
T021 src/terminal/pty-manager.ts（依賴 T020）
T022 src/views/TerminalView.ts（依賴 T019, T021）
T023 src/main.ts（依賴 T022）
T024 工作目錄邏輯（依賴 T022）
```

---

## Implementation Strategy

### MVP First (僅 User Story 1)

1. ✅ 完成 Phase 1: Setup
2. ✅ 完成 Phase 2: Foundational
3. 🎯 完成 Phase 3: User Story 1
4. **STOP 並驗證**: 終端可開啟、執行命令、正確關閉
5. 部署/展示 MVP 版本

### Incremental Delivery

| 交付版本 | 包含功能 | 驗收標準 |
|---------|---------|---------|
| **MVP v0.1** | US1 - 基礎終端 | 開啟終端、執行命令、工作目錄正確 |
| **v0.2** | US1 + US2 - 上下文指令 | @cfile/@folder 替換正確 |
| **v0.3** | US1 + US2 + US3 - 選取參考 | 選取範圍產生引用並複製 |
| **v0.4** | 全部功能 + US4 驗證 | AI CLI 整合驗證通過 |
| **v1.0** | 完整發布 | 安全警告、README、測試覆蓋 80%+ |

### Task Count Summary

| Phase | 任務數 | 可平行任務 |
|-------|--------|-----------|
| Phase 1 (Setup) | 7 | 5 |
| Phase 2 (Foundational) | 9 | 4 |
| Phase 3 (US1 - MVP) | 11 | 3 |
| Phase 4 (US2) | 9 | 3 |
| Phase 5 (US3) | 8 | 2 |
| Phase 6 (US4) | 4 | 1 |
| Phase 7 (Polish) | 10 | 6 |
| **Total** | **58** | **24 (41%)** | |

---

## Notes

- [P] 任務 = 不同檔案、無相依性，可平行執行
- [Story] 標籤對應 spec.md 中的 User Story
- 每個 User Story 應可獨立完成與測試
- 提交時機：每完成一個任務或邏輯群組
- TDD 流程：測試先行（Red）→ 實作（Green）→ 重構（Refactor）
- 避免：模糊任務、同檔案衝突、破壞 Story 獨立性的跨 Story 依賴
