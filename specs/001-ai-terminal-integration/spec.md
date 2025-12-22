# Feature Specification: AI Terminal Integration

**Feature Branch**: `001-ai-terminal-integration`  
**Created**: 2025-12-22  
**Status**: Draft  
**Input**: User description: "請開發一個 obsidian 的外掛，我需要能夠實現在外掛中開啟 web-terminal 的介面，連結本機環境。透過 AI Agent 與 obsidian 當前開啟的頁面，或是儲存庫互動。提供基礎的指令，例如 @cfile 即是取得目前開啟的 md 檔案路徑；@folder 是目前開啟的儲存庫路徑，也可以選取文字取得當前檔案路徑＋行數範圍 作為給 Agent 的快速參考"

## Clarifications

### Session 2025-12-22

- Q: AI Agent 整合方式是什麼？ → A: 外部 AI CLI 工具整合，使用已安裝的 CLI 工具（參考 https://github.com/polyipseity/obsidian-terminal 專案設計）
- Q: 終端啟動時的預設工作目錄應該是哪裡？ → A: 當前開啟檔案所在的目錄
- Q: 選取範圍參考應該放到哪裡？ → A: 顯示通知訊息，讓使用者點擊複製到剪貼簿
- Q: 上下文指令（@cfile, @folder）的替換時機是什麼時候？ → A: 按下 Enter 執行時即時替換（使用者輸入時看到的仍是 `@cfile`，執行時已替換為實際路徑）
- Q: 終端介面應該顯示在哪個位置？ → A: 底部面板（類似 VS Code 的整合終端）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 開啟內嵌終端介面 (Priority: P1)

使用者在 Obsidian 中透過命令面板或工具列按鈕，在底部面板開啟一個內嵌的終端介面，該介面連接到本機環境，預設工作目錄為當前開啟檔案所在的目錄，允許使用者執行系統命令。

**Why this priority**: 這是整個功能的基礎，沒有終端介面就無法進行任何 AI 互動或指令操作。這是最核心的 MVP 功能。

**Independent Test**: 可透過開啟外掛、點擊按鈕，確認終端介面出現在底部面板、工作目錄正確，並能執行基本系統命令（如 `ls`、`pwd`）來獨立測試此功能。

**Acceptance Scenarios**:

1. **Given** 使用者已安裝並啟用外掛且正在編輯某個檔案，**When** 使用者點擊工具列的終端圖示或執行「開啟 AI Terminal」命令，**Then** 應在 Obsidian 視窗底部開啟一個可互動的終端介面，且工作目錄為當前檔案所在目錄
2. **Given** 終端介面已開啟，**When** 使用者輸入系統命令（如 `pwd`），**Then** 系統應執行命令並在終端中顯示當前檔案所在目錄的路徑
3. **Given** 終端介面已開啟，**When** 使用者關閉終端面板，**Then** 終端連線應正確中斷，資源應被釋放

---

### User Story 2 - 使用上下文快速指令 (@cfile, @folder) (Priority: P2)

使用者在終端中輸入特殊指令（如 `@cfile`、`@folder`），按下 Enter 執行時系統自動將這些佔位符替換為當前開啟的檔案路徑或 vault 路徑，方便 AI Agent 快速獲取上下文資訊。替換發生在執行時，使用者輸入時仍看到原始的 `@cfile` 等佔位符。

**Why this priority**: 這是提升使用者體驗的關鍵功能，讓 AI Agent 能夠快速獲取 Obsidian 的上下文資訊，是 AI 整合的核心價值。

**Independent Test**: 可透過在終端中輸入 `echo @cfile` 或 `echo @folder` 並按 Enter，驗證輸出是否為實際路徑（而非 `@cfile` 字串本身）來獨立測試。

**Acceptance Scenarios**:

1. **Given** 使用者在 Obsidian 中開啟了一個 markdown 檔案且終端已啟動，**When** 使用者在終端輸入 `echo @cfile` 並按下 Enter，**Then** 終端應顯示當前開啟檔案的完整路徑（而非字串 "@cfile"）
2. **Given** 使用者在某個 vault 中且終端已啟動，**When** 使用者在終端輸入 `echo @folder` 並按下 Enter，**Then** 終端應顯示當前 vault 的根目錄路徑
3. **Given** 使用者未開啟任何檔案，**When** 使用者嘗試執行包含 `@cfile` 的指令，**Then** 系統應在終端顯示錯誤訊息「錯誤：目前沒有開啟的檔案，無法替換 @cfile」

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

### User Story 3 - 選取文字取得檔案路徑與行數範圍 (Priority: P3)

使用者在 Obsidian 編輯器中選取一段文字後，透過上下文選單或快捷鍵觸發功能，系統顯示通知訊息展示選取範圍的檔案路徑與行號資訊（格式如 `file.md#L10-L15`），使用者點擊通知即可複製到剪貼簿，供 AI Agent 精確定位。

**Why this priority**: 這是進階功能，提供更精確的上下文定位能力，適合需要精細程式碼審查或文件分析的場景，但不是 MVP 必需。

**Independent Test**: 可透過選取文字、執行「複製選取範圍參考」命令，驗證是否顯示通知訊息且點擊後剪貼簿包含正確的路徑+行號格式來獨立測試。

**Acceptance Scenarios**:

1. **Given** 使用者在編輯器中選取了第 10-15 行的文字，**When** 使用者執行「複製選取範圍參考」命令，**Then** 系統應顯示通知訊息「檔案路徑#L10-L15」，使用者點擊通知後該文字應複製到剪貼簿
2. **Given** 使用者選取了單行文字（第 8 行），**When** 使用者執行「複製選取範圍參考」命令，**Then** 系統應顯示通知訊息「檔案路徑#L8」
3. **Given** 使用者未選取任何文字，**When** 使用者執行此命令，**Then** 系統應顯示當前游標所在行號的參考通知（如「檔案路徑#L25」）

---

### User Story 4 - AI Agent 與 Obsidian 上下文整合 (Priority: P2)

終端支援與外部 AI CLI 工具（如已安裝的 `aichat`、`claude-cli` 等）整合，使用者透過上下文指令（`@cfile`、`@folder`）讓 AI 自動取得當前 Obsidian 的檔案內容、vault 結構等資訊，提供智能化的互動體驗。整合方式參考 obsidian-terminal 專案的設計。

**Why this priority**: 這是功能的最終價值所在，讓 AI 能夠理解 Obsidian 的上下文並提供有意義的協助，屬於核心功能但依賴前面的基礎建設。

**Independent Test**: 可透過在終端執行 AI CLI 工具並包含 `@cfile` 指令（如 `aichat "分析 @cfile 的內容"`），驗證 AI 是否能正確讀取並分析當前檔案內容來獨立測試。

**Acceptance Scenarios**:

1. **Given** 使用者已安裝 AI CLI 工具且開啟了某個 markdown 檔案，**When** 使用者在終端執行「aichat 分析 @cfile 的內容」並按 Enter，**Then** `@cfile` 應被替換為實際檔案路徑，AI 工具應能讀取該檔案內容並進行分析
2. **Given** 使用者已複製選取範圍參考到剪貼簿（如「note.md#L10-L15」），**When** 使用者在終端執行 AI 指令並貼上該參考，**Then** AI 應能精確定位到該段內容並提供相關建議
3. **Given** AI 互動過程中，**When** 使用者切換到不同檔案後再次使用 `@cfile`，**Then** 後續的 `@cfile` 指令應自動反映新檔案的路徑

---

### Edge Cases

- **當使用者在沒有開啟任何檔案的情況下使用 `@cfile`**：系統應顯示錯誤訊息「目前沒有開啟的檔案」，而非返回空值或崩潰
- **當使用者在非 markdown 檔案（如圖片、PDF）中使用上下文指令**：系統應正確返回檔案路徑，但可能需要提示「此檔案類型可能不支援行號參考」
- **當終端連線中斷或本機環境無法存取時**：系統應提供明確的錯誤訊息並允許使用者重新連線，避免外掛卡死
- **當 vault 路徑包含特殊字元（空格、中文、符號）**：系統應正確轉義路徑，確保終端指令能正常執行
- **當使用者在多個 vault 之間切換**：`@folder` 應自動反映當前活躍的 vault 路徑
- **當終端執行長時間運作的指令（如編譯、下載）**：介面應保持回應，並提供中斷指令的能力（Ctrl+C）
- **當使用者選取跨多個檔案的文字（理論上不應發生）**：系統應僅記錄當前檔案的選取範圍

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統必須提供一個可嵌入 Obsidian 底部面板的終端介面（參考 VS Code 的整合終端設計），支援基本的終端互動（輸入、輸出、歷史記錄）
- **FR-002**: 系統必須建立與本機環境的安全連接，允許執行系統命令，預設工作目錄為當前開啟檔案所在的目錄
- **FR-003**: 系統必須支援 `@cfile` 指令，在使用者按下 Enter 執行時自動替換為當前開啟檔案的完整路徑（替換發生在執行時，使用者輸入時看到的仍是 `@cfile`）
- **FR-004**: 系統必須支援 `@folder` 指令，在使用者按下 Enter 執行時自動替換為當前 Obsidian vault 的根目錄路徑
- **FR-005**: 系統必須提供將編輯器選取範圍轉換為「檔案路徑#L起始行-L結束行」格式的功能，並透過通知訊息展示，使用者點擊通知後複製到剪貼簿
- **FR-006**: 系統必須在使用者未開啟任何檔案時執行包含 `@cfile` 的指令時，在終端中顯示錯誤訊息「錯誤：目前沒有開啟的檔案，無法替換 @cfile」
- **FR-007**: 系統必須正確處理包含特殊字元（空格、中文、符號）的檔案路徑與 vault 路徑，確保路徑正確轉義後傳遞給系統指令
- **FR-008**: 系統必須支援終端連線的建立、中斷與重新連線功能
- **FR-009**: 系統必須提供命令面板指令與工具列按鈕（ribbon icon），方便使用者開啟底部終端面板
- **FR-010**: 系統必須支援常見的終端快捷鍵（如 Ctrl+C 中斷指令、上下鍵瀏覽歷史）
- **FR-011**: 系統必須確保終端關閉時正確釋放資源（連線、事件監聽器等）
- **FR-012**: 系統必須支援與外部 AI CLI 工具（如 aichat、claude-cli）整合，透過上下文指令替換讓 AI 工具能取得 Obsidian 的檔案內容與結構資訊
- **FR-013**: 系統設計應參考 https://github.com/polyipseity/obsidian-terminal 專案的終端整合模式

### Key Entities

- **Terminal Session（終端連線）**: 代表一個與本機環境的連線實例，包含連線狀態、工作目錄（預設為當前檔案所在目錄）、執行歷史等屬性
- **Context Command（上下文指令）**: 特殊的指令關鍵字（如 `@cfile`、`@folder`），會在使用者按下 Enter 執行時被系統解析並替換為實際的 Obsidian 上下文資訊
- **Selection Reference（選取參考）**: 編輯器中選取範圍的結構化表示，包含檔案路徑、起始行號、結束行號等資訊，透過通知訊息呈現並提供複製功能
- **External AI CLI Integration（外部 AI CLI 整合）**: 與已安裝的 AI 命令列工具的整合點，透過上下文指令替換機制讓 AI 工具能存取 Obsidian 上下文

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 使用者能在 3 秒內從 Obsidian 開啟終端介面並執行第一個系統命令
- **SC-002**: `@cfile` 和 `@folder` 指令的路徑替換準確率達 100%（在正常使用情境下）
- **SC-003**: 終端介面能穩定運作 1 小時以上，不出現記憶體洩漏或連線中斷問題
- **SC-004**: 使用者能在 10 秒內透過選取文字並執行命令，將檔案參考（含行號）傳遞給 AI
- **SC-005**: 系統能正確處理至少 95% 的常見路徑格式（包含空格、中文、特殊符號）
- **SC-006**: AI Agent 能在 90% 的情況下正確解析並利用透過上下文指令獲得的 Obsidian 資訊
- **SC-007**: 外掛啟動與終端開啟的總時間不超過 5 秒（在標準硬體配置下）
- **SC-008**: 使用者在遇到錯誤時，能在 100% 的情況下看到清晰的錯誤訊息而非系統崩潰

## Assumptions *(optional)*

- 假設使用者已安裝 Node.js 環境（Node.js v18+ LTS），因為本機終端執行需要系統環境支援
- 假設使用者授予 Obsidian 外掛執行本機命令的權限（可能需要額外的安全性確認）
- 假設 AI 整合透過使用者已安裝的外部 CLI 工具進行（如 aichat、claude-cli 等），使用者需自行安裝並配置這些工具
- 假設終端介面基於 web 技術（如 xterm.js），參考 obsidian-terminal 專案的實作方式
- 假設使用者主要在桌面環境使用此功能（設定 `isDesktopOnly: true`）
- 假設 vault 路徑為本機檔案系統路徑，不支援雲端同步的虛擬路徑
- 假設終端顯示在 Obsidian 底部面板，類似 VS Code 的整合終端位置
- 假設終端預設工作目錄為當前開啟檔案所在的目錄（如無開啟檔案則為 vault 根目錄）

## Out of Scope *(optional)*

以下功能不在此階段的開發範圍內：

- **完整的 SSH 遠端連線功能**：僅支援本機環境，不支援連線至遠端伺服器
- **終端分頁/分割視窗**：僅提供單一終端實例，不支援多終端管理
- **自訂終端主題與樣式**：使用預設終端外觀，不提供進階客製化選項
- **終端腳本自動化（如 cron job）**：僅支援互動式命令執行
- **跨 vault 的全域命令**：上下文指令僅作用於當前 vault
- **終端輸出的持久化儲存**：終端歷史僅存在於當前連線期間
- **完整的檔案系統瀏覽器整合**：不提供圖形化的檔案瀏覽介面
- **AI Agent 的訓練或客製化**：僅整合現有的 AI API，不提供模型訓練功能
