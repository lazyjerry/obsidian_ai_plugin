# AI Terminal Integration for Obsidian

在 Obsidian 筆記軟體中直接使用終端機，整合上下文指令與 AI CLI 工具。

## ✨ 功能特色

- **內嵌終端介面**：在 Obsidian 底部面板開啟功能完整的終端機
- **上下文指令**：使用 `@cfile` 和 `@folder` 快速引用當前檔案或目錄
- **選取範圍參考**：選取文字後產生 GitHub 風格的檔案引用（如 `file.md#L10-L15`）
- **AI CLI 整合**：與外部 AI CLI 工具（如 aichat、claude-cli）無縫整合

## 📋 系統需求

- **Obsidian**：v1.5.0 或更高版本
- **Node.js**：v18.0 LTS 或更高版本
- **Python**：3.10 或更高版本（PTY 腳本需要）
- **作業系統**：macOS、Linux 或 Windows（僅桌面版）

## 🚀 安裝方式

### 手動安裝

1. 從 [Releases](https://github.com/your-repo/releases) 下載最新版本
2. 解壓縮到 `.obsidian/plugins/obsidian-ai-terminal/` 目錄
3. 確保目錄結構如下：
   ```
   .obsidian/plugins/obsidian-ai-terminal/
   ├── main.js
   ├── manifest.json
   ├── styles.css
   └── scripts/
       ├── unix_pty.py
       └── windows_pty.py
   ```
4. 重新啟動 Obsidian
5. 前往「設定 > 社群外掛程式」啟用 AI Terminal

### 開發者安裝

```bash
# 複製專案
git clone https://github.com/your-repo/obsidian-ai-terminal.git
cd obsidian-ai-terminal

# 安裝相依套件
npm install

# 建置
npm run build

# 複製到外掛目錄
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/obsidian-ai-terminal/
cp -r scripts /path/to/vault/.obsidian/plugins/obsidian-ai-terminal/
```

## 📖 使用說明

### 開啟終端

有三種方式可以開啟終端：

1. **Ribbon 圖示**：點擊左側工具列的終端機圖示
2. **命令面板**：按 `Ctrl/Cmd + P`，輸入「開啟 AI Terminal」
3. **快捷鍵**：可在設定中自訂快捷鍵

### 上下文指令

在終端輸入命令時，可使用以下上下文指令：

| 指令 | 說明 | 範例 |
|------|------|------|
| `@cfile` | 當前開啟檔案的完整路徑 | `cat @cfile` |
| `@folder` | 當前檔案所在目錄 | `ls @folder` |

**使用範例**：

```bash
# 檢視當前檔案內容
cat @cfile

# 列出當前目錄檔案
ls -la @folder

# 搜尋當前目錄
grep "keyword" @folder/*.md

# 使用 AI CLI 分析檔案
aichat "分析這個檔案的內容" < @cfile
```

### 選取範圍參考

1. 在編輯器中選取文字（或將游標放在目標行）
2. 執行命令「複製選取範圍參考」（`Ctrl/Cmd + P` > 「複製選取範圍參考」）
3. 點擊通知複製到剪貼簿

產生的格式為 GitHub 風格：
- 單行：`path/to/file.md#L10`
- 多行：`path/to/file.md#L10-L15`

### AI CLI 整合

本外掛可與各種 AI CLI 工具整合使用：

**aichat**
```bash
# 安裝 aichat
brew install aichat

# 使用範例
aichat "總結這個文件" < @cfile
```

**claude-cli**
```bash
# 安裝 claude-cli
pip install claude-cli

# 使用範例
claude "分析 @cfile 的程式碼結構"
```

## ⚙️ 設定選項

在「設定 > AI Terminal」中可調整：

| 設定 | 說明 | 預設值 |
|------|------|--------|
| Shell 路徑 | 終端使用的 Shell | 系統預設 |
| Python 執行檔 | Python 路徑 | `python3` |
| 字體大小 | 終端字體大小 | 14 |
| 字體家族 | 終端字體 | Menlo, Monaco... |
| 游標閃爍 | 是否啟用游標閃爍 | 是 |

## ⚠️ 安全性注意事項

此終端具有完整的系統存取權限，可以：

- ✅ 讀取與寫入系統檔案
- ✅ 執行程式與腳本
- ✅ 存取網路
- ✅ 管理系統進程

**建議**：
- 僅在個人開發環境使用
- 不要執行不受信任的指令
- 小心處理敏感資料

## 🔧 疑難排解

### 終端無法啟動

1. 確認 Python 3.10+ 已安裝：
   ```bash
   python3 --version
   ```

2. 確認 scripts 目錄存在且包含 PTY 腳本

3. 檢查 Obsidian 開發者控制台（`Ctrl/Cmd + Shift + I`）的錯誤訊息

### @cfile/@folder 不工作

- 確認有檔案已開啟
- 確認檔案路徑不包含特殊字元
- 嘗試重新開啟終端

### Windows 相容性問題

Windows 版本使用簡化的 subprocess 實作，某些進階功能可能受限。建議使用 Windows Terminal 或 WSL 取得更好的體驗。

## 🛠️ 開發

### 環境設定

```bash
# 安裝相依套件
npm install

# 開發模式（監聽檔案變更）
npm run dev

# 執行測試
npm test

# 執行 Lint
npm run lint

# 建置生產版本
npm run build
```

### 專案結構

```
src/
├── main.ts              # 外掛入口點
├── types.ts             # 型別定義
├── settings.ts          # 設定管理
├── views/
│   └── TerminalView.ts  # 終端視圖
├── terminal/
│   ├── xterm-emulator.ts    # xterm.js 封裝
│   ├── pty-session.ts       # PTY 會話管理
│   ├── pty-manager.ts       # PTY 管理器
│   └── context-commands.ts  # 上下文指令
└── utils/
    ├── path-helper.ts       # 路徑工具
    ├── selection-reference.ts # 選取參考
    └── debounce.ts          # 防抖工具
```

## 📄 授權條款

MIT License - 詳見 [LICENSE](LICENSE) 檔案

## 🙏 致謝

- [xterm.js](https://xtermjs.org/) - 終端模擬器
- [Obsidian](https://obsidian.md/) - 筆記軟體
- 所有貢獻者與使用者的回饋
