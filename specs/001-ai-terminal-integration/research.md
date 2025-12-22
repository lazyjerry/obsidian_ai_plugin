# Research Report: AI Terminal Integration

**Date**: 2025-12-22  
**Feature**: AI Terminal Integration for Obsidian Plugin  
**Objective**: 研究實作終端整合的技術方案，解決 native module 編譯與跨平台整合挑戰

---

## 研究概述

本研究針對 AI Terminal Integration 功能的技術實作進行深入調查，主要聚焦於：
1. Native module（node-pty）處理策略與替代方案
2. xterm.js 與 Obsidian UI 整合最佳實踐
3. 上下文指令（@cfile/@folder）替換機制
4. 底部面板整合與生命週期管理
5. 路徑處理與選取範圍參考實作

研究方法包括：分析 obsidian-terminal 參考專案、查閱 Obsidian API 文件、評估 xterm.js 整合模式、跨平台路徑處理策略。

---

## 1. Native Module 處理策略

### 問題描述

原計畫使用 node-pty 作為 pseudoterminal 實作，但 node-pty 為 native module，需要針對不同平台（Windows、macOS、Linux）進行 C++ 編譯，可能遇到：
- 複雜的 prebuild 或 electron-rebuild 流程
- 使用者安裝時的編譯環境要求
- 跨平台二進位檔案管理困難

### 研究發現：obsidian-terminal 的解決方案

**決策**：obsidian-terminal **不使用 node-pty**，而是採用 Python 腳本實作 pseudoterminal。

**技術實作**：
```typescript
// obsidian-terminal 架構
// src/terminal/pseudoterminal.ts

// Windows 平台
class WindowsPseudoterminal {
  private shell: ChildProcess;
  
  constructor(options: { executable: string, cwd: string, pythonExecutable: string }) {
    // 使用 Python 腳本包裝 Windows ConPTY API
    this.shell = childProcess.spawn(
      options.pythonExecutable,  // python3
      ['scripts/windows_pty.py', options.executable],
      { cwd: options.cwd }
    );
  }
}

// Unix/macOS/Linux 平台
class UnixPseudoterminal {
  private shell: ChildProcess;
  
  constructor(options: { executable: string, cwd: string, pythonExecutable: string }) {
    // 使用 Python 腳本包裝 Unix PTY API
    this.shell = childProcess.spawn(
      options.pythonExecutable,  // python3
      ['scripts/unix_pty.py', options.executable],
      { cwd: options.cwd }
    );
  }
}

// 動態平台選擇
const Pseudoterminal = Platform.isWin
  ? WindowsPseudoterminal
  : UnixPseudoterminal;
```

**動態 require 機制**（避免打包 Node.js 模組）：
```typescript
// src/import.ts
const BUNDLE = deepFreeze({
  "@xterm/xterm": (): unknown => require("@xterm/xterm"),
  "node:child_process": (): unknown => require("node:child_process"),
  // ... 其他模組
});

// esbuild 配置：標記為 external
// build/build.mjs
external: [
  "electron",
  "node:*",  // Node.js 內建模組不打包
  "obsidian",
  ...builtinModules,
]
```

**manifest.json 配置**：
```json
{
  "id": "terminal",
  "name": "Terminal",
  "minAppVersion": "0.15.0",
  "isDesktopOnly": true  // 僅支援桌面平台
}
```

### 替代方案評估

| 方案 | 優點 | 缺點 | 建議 |
|------|------|------|------|
| **node-pty** | 成熟穩定、官方支援、功能完整 | 需要 native 編譯、prebuild 複雜、使用者安裝困難 | ❌ 不推薦 |
| **Python PTY 腳本** | 無需編譯、跨平台統一、實作簡單 | 需要 Python 環境（v3.10+）、Windows 需額外套件 | ✅ **推薦**（參考 obsidian-terminal） |
| **electron-rebuild** | 標準 Electron 方案 | 編譯複雜度高、CI/CD 困難、使用者體驗差 | ❌ 不推薦 |
| **prebuild + prebuild-install** | 預編譯二進位檔案 | 需維護多平台建置、版本管理複雜 | ⚠️ 僅在必要時考慮 |

### 最終決策

**採用 Python PTY 腳本方案**（參考 obsidian-terminal）：

**實作計畫**：
1. 建立 `scripts/unix_pty.py`（macOS/Linux）使用 Python `pty` 模組
2. 建立 `scripts/windows_pty.py`（Windows）使用 `winpty` 或 `ConPTY` API
3. TypeScript 層使用 `child_process.spawn()` 啟動 Python 腳本
4. 動態偵測平台並選擇對應實作
5. README 明確說明 Python 環境要求（Node.js v18+ 與 Python v3.10+）

**優勢**：
- 無需使用者編譯 C++ 程式碼
- 跨平台實作一致性高
- 降低安裝門檻（Python 在多數開發環境已安裝）

**風險與緩解**：
- **風險**：Windows 使用者可能需安裝額外 Python 套件（psutil、pywinctl）
- **緩解**：提供一鍵安裝腳本 `setup.sh`/`setup.bat`
- **風險**：Python 版本相容性問題
- **緩解**：明確要求 Python 3.10+ 並在文件中說明

---

## 2. xterm.js 整合架構

### 決策：封裝 xterm.js 為 Emulator 類別

**架構設計**：
```typescript
// src/terminal/xterm-emulator.ts
import { Terminal, ITerminalOptions } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SerializeAddon } from '@xterm/addon-serialize';
import '@xterm/xterm/css/xterm.css';

export class XtermEmulator {
  public readonly terminal: Terminal;
  public readonly addons: {
    fit: FitAddon;
    webLinks: WebLinksAddon;
    serialize: SerializeAddon;
  };
  
  constructor(
    container: HTMLElement,
    options?: ITerminalOptions
  ) {
    // 建立終端實例
    this.terminal = new Terminal({
      allowProposedApi: true,
      fontFamily: '"Fira Code", "Menlo", "Consolas", monospace',
      fontSize: 14,
      theme: {
        background: 'var(--background-primary)',
        foreground: 'var(--text-normal)',
        cursor: 'var(--text-accent)',
        // 使用 Obsidian CSS 變數保持一致性
      },
      cursorBlink: true,
      scrollback: 1000,
      ...options,
    });
    
    // 載入必要 addons
    this.addons = {
      fit: new FitAddon(),
      webLinks: new WebLinksAddon(),
      serialize: new SerializeAddon(),
    };
    
    Object.values(this.addons).forEach(addon => {
      this.terminal.loadAddon(addon);
    });
    
    // 附加到 DOM
    this.terminal.open(container);
    this.addons.fit.fit();
    
    // 監聽容器大小變化
    this.setupResizeObserver(container);
  }
  
  private setupResizeObserver(container: HTMLElement): void {
    const resizeObserver = new ResizeObserver(() => {
      // 使用 debounce 避免頻繁調整
      this.debouncedFit();
    });
    
    resizeObserver.observe(container);
    
    // 清理邏輯
    this.terminal.onDispose(() => {
      resizeObserver.disconnect();
    });
  }
  
  private debouncedFit = debounce(() => {
    this.addons.fit.fit();
  }, 100);
  
  public dispose(): void {
    this.terminal.dispose();
  }
}
```

### 必要 Addons 選擇

**優先級分類**：

| Addon | 優先級 | 用途 | 實作階段 |
|-------|--------|------|----------|
| **FitAddon** | 🔴 必需 | 自動調整終端大小適應容器 | Phase 1 (MVP) |
| **WebLinksAddon** | 🟡 推薦 | URL 檢測與點擊功能 | Phase 2 |
| **SerializeAddon** | 🟡 推薦 | 序列化狀態（恢復終端歷史） | Phase 3 |
| **SearchAddon** | 🟢 可選 | 終端內容搜尋 | Phase 3+ |
| **WebglAddon** | 🟢 可選 | GPU 加速渲染（效能優化） | Phase 3+ |
| **CanvasAddon** | 🟢 可選 | Canvas 渲染（WebGL 備選） | Phase 3+ |

### 效能優化策略

**1. 渲染優化**：
```typescript
// 優先使用 WebGL 渲染（Phase 3）
try {
  const webglAddon = new WebglAddon();
  terminal.loadAddon(webglAddon);
  
  webglAddon.onChangeTextureAtlas(e => {
    console.debug('WebGL texture atlas changed:', e);
  });
} catch (error) {
  // 降級到 Canvas 渲染
  console.warn('WebGL not supported, using Canvas renderer');
  terminal.loadAddon(new CanvasAddon());
}
```

**2. 記憶體管理**：
```typescript
// 限制 scrollback 緩衝區大小
const terminal = new Terminal({
  scrollback: 1000,  // 推薦值（約 100-200KB）
  // 不要設置過大（如 100000 會佔用 10-20MB）
});

// 定期清理（如需要）
if (needsClear) {
  terminal.clear();  // 清除顯示但保留 scrollback
  terminal.reset();  // 完全重置終端狀態
}
```

**3. Resize 防抖**：
```typescript
// 避免頻繁調整大小造成效能問題
const debouncedFit = debounce(() => {
  fitAddon.fit();
}, 100);  // 100ms 防抖

resizeObserver.observe(container);
```

### 原理說明

- **FitAddon 必需性**：xterm.js 預設不會自動計算最佳行列數，FitAddon 根據容器尺寸、字體大小、padding 自動計算
- **WebGL vs Canvas**：WebGL 渲染速度快 3-5 倍但某些環境（舊 Safari、無 GPU）不支援，應提供降級方案
- **scrollback 限制**：每行約 100-200 字節，10000 行約 1-2MB，過大會導致記憶體問題與渲染延遲

---

## 3. Obsidian ItemView 與底部面板整合

### 決策：繼承 ItemView 並註冊為底部面板

**TerminalView 實作**：
```typescript
// src/views/TerminalView.ts
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { XtermEmulator } from '../terminal/xterm-emulator';
import type AITerminalPlugin from '../main';

export class TerminalView extends ItemView {
  private emulator: XtermEmulator | null = null;
  private pty: PseudoterminalSession | null = null;
  
  constructor(
    leaf: WorkspaceLeaf,
    private plugin: AITerminalPlugin
  ) {
    super(leaf);
  }
  
  // === 必要方法 ===
  
  getViewType(): string {
    return 'ai-terminal';
  }
  
  getDisplayText(): string {
    return 'AI Terminal';
  }
  
  getIcon(): string {
    return 'terminal';  // Obsidian 內建圖示
  }
  
  // === 生命週期 ===
  
  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('ai-terminal-container');
    
    // 建立終端容器
    const terminalEl = container.createDiv('terminal-wrapper');
    
    // 初始化 xterm.js
    this.emulator = new XtermEmulator(terminalEl, {
      // 使用 Obsidian CSS 變數
      theme: {
        background: getComputedStyle(document.body)
          .getPropertyValue('--background-primary'),
        foreground: getComputedStyle(document.body)
          .getPropertyValue('--text-normal'),
      },
    });
    
    // 建立 PTY 連線
    const cwd = await this.getWorkingDirectory();
    this.pty = await this.plugin.ptyManager.create({
      cwd,
      terminal: this.emulator.terminal,
    });
    
    // 連接資料流
    this.connectPtyToTerminal();
    
    // 註冊清理邏輯
    this.register(() => {
      this.emulator?.dispose();
      this.pty?.kill();
    });
  }
  
  async onClose(): Promise<void> {
    // 資源清理（透過 this.register() 自動執行）
  }
  
  // === 狀態持久化 ===
  
  async setState(state: any, result: ViewStateResult): Promise<void> {
    await super.setState(state, result);
    // 恢復終端狀態（如 cwd）
    if (state?.cwd) {
      // 重新啟動終端並設定 cwd
    }
  }
  
  getState(): any {
    return {
      cwd: this.pty?.cwd || null,
      // 可選：序列化終端內容
      // buffer: this.emulator?.addons.serialize.serialize()
    };
  }
  
  // === 輔助方法 ===
  
  private async getWorkingDirectory(): Promise<string> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      // 無開啟檔案，使用 vault 根目錄
      return this.plugin.pathHelper.getVaultPath();
    }
    
    // 使用當前檔案所在目錄
    return this.plugin.pathHelper.getFileDirectory(activeFile);
  }
  
  private connectPtyToTerminal(): void {
    if (!this.emulator || !this.pty) return;
    
    const { terminal } = this.emulator;
    
    // 終端 → PTY（使用者輸入）
    terminal.onData(async (data) => {
      await this.pty?.write(data);
    });
    
    // PTY → 終端（程式輸出）
    this.pty.onData((data) => {
      terminal.write(data);
    });
    
    // PTY 退出處理
    this.pty.onExit((code) => {
      terminal.write(`\r\n[Process exited with code ${code}]\r\n`);
    });
  }
}
```

### 底部面板註冊與開啟

**Plugin 主檔案**：
```typescript
// src/main.ts
export default class AITerminalPlugin extends Plugin {
  async onload() {
    // 註冊視圖類型
    this.registerView(
      'ai-terminal',
      (leaf) => new TerminalView(leaf, this)
    );
    
    // 添加開啟終端命令
    this.addCommand({
      id: 'open-terminal',
      name: 'Open AI Terminal',
      callback: () => {
        this.activateTerminalView();
      },
    });
    
    // 添加 Ribbon 圖示
    this.addRibbonIcon('terminal', 'Open AI Terminal', () => {
      this.activateTerminalView();
    });
  }
  
  async activateTerminalView() {
    const { workspace } = this.app;
    
    // 檢查是否已存在終端視圖
    let leaf = workspace.getLeavesOfType('ai-terminal')[0];
    
    if (!leaf) {
      // 建立新的底部面板
      // 策略：在當前活躍 leaf 下方分割
      const activeLeaf = workspace.getLeaf(false);
      leaf = workspace.createLeafBySplit(
        activeLeaf,
        'horizontal',  // 水平分割 = 上下排列
        false          // 不在上方（即在下方）
      );
    }
    
    // 設定視圖狀態
    await leaf.setViewState({
      type: 'ai-terminal',
      active: true,
    });
    
    // 顯示並聚焦
    workspace.revealLeaf(leaf);
  }
}
```

### WorkspaceLeaf 管理策略

**單例 vs 多實例決策**：

```typescript
// 策略 1：單例模式（推薦用於 MVP）
async activateTerminalView() {
  const existing = this.app.workspace.getLeavesOfType('ai-terminal')[0];
  if (existing) {
    this.app.workspace.revealLeaf(existing);
    return;  // 不建立新實例
  }
  // ... 建立邏輯
}

// 策略 2：多實例模式（進階功能）
async createNewTerminalInstance() {
  // 無論是否存在都建立新實例
  const leaf = this.app.workspace.getLeaf('tab');  // 新標籤
  // 或 workspace.getLeaf('split', 'horizontal')  // 新分割
  
  await leaf.setViewState({
    type: 'ai-terminal',
    active: true,
  });
}
```

**建議**：
- **Phase 1 (MVP)**：使用單例模式，簡化管理
- **Phase 3+**：支援多實例，提供「New Terminal」命令

### 注意事項

❌ **常見陷阱**：
1. **忘記在 onClose 清理資源** → 記憶體洩漏、PTY 進程殘留
2. **多次註冊同一視圖類型** → 拋出錯誤
3. **未檢查視圖已存在** → 建立重複視圖
4. **在 onOpen 中未等待異步操作** → DOM 未準備好

✅ **最佳實踐**：
```typescript
// 1. 使用 this.register() 自動清理
this.register(() => {
  this.emulator?.dispose();
  this.pty?.kill();
});

// 2. 檢查視圖存在性
let leaf = workspace.getLeavesOfType('ai-terminal')[0];
if (leaf) {
  workspace.revealLeaf(leaf);
  return;
}

// 3. 等待異步初始化
async onOpen() {
  await this.initializeTerminal();  // ✅
  // 不要：this.initializeTerminal(); ❌
}
```

---

## 4. 上下文指令替換機制

### 決策：在 PTY 輸入層級處理（Enter 執行時替換）

**原理**：使用者輸入時看到的是 `@cfile`，按下 Enter 執行時系統攔截並替換為實際路徑，然後再傳送給 shell。

**實作方案**：
```typescript
// src/terminal/context-commands.ts
import { App, FileSystemAdapter, Notice } from 'obsidian';

export class ContextCommandHandler {
  private inputBuffer: string = '';
  
  constructor(private app: App) {}
  
  /**
   * 處理終端輸入（攔截 Enter 鍵）
   */
  async handleInput(data: string): Promise<{ data: string, shouldExecute: boolean }> {
    // 累積輸入
    this.inputBuffer += data;
    
    // 檢測 Enter 鍵（\r 或 \n）
    if (data.includes('\r') || data.includes('\n')) {
      const command = this.inputBuffer.trimEnd();
      this.inputBuffer = '';  // 清空緩衝區
      
      // 檢查是否包含上下文指令
      if (command.includes('@cfile') || command.includes('@folder')) {
        try {
          const replaced = await this.replaceContextCommands(command);
          return {
            data: replaced + '\r',
            shouldExecute: true,
          };
        } catch (error) {
          // 顯示錯誤訊息
          new Notice(error.message);
          return {
            data: '',
            shouldExecute: false,  // 阻止執行
          };
        }
      }
      
      // 無需替換，正常執行
      return { data, shouldExecute: true };
    }
    
    // 非 Enter 鍵，正常傳遞
    return { data, shouldExecute: true };
  }
  
  /**
   * 替換上下文指令
   */
  private async replaceContextCommands(input: string): Promise<string> {
    const { workspace, vault } = this.app;
    let result = input;
    
    // 替換 @cfile（當前開啟檔案路徑）
    if (result.includes('@cfile')) {
      const activeFile = workspace.getActiveFile();
      if (!activeFile) {
        throw new Error('錯誤：目前沒有開啟的檔案，無法替換 @cfile');
      }
      
      const adapter = vault.adapter;
      if (!(adapter instanceof FileSystemAdapter)) {
        throw new Error('錯誤：檔案系統存取不可用');
      }
      
      const fullPath = adapter.getFullPath(activeFile.path);
      const escapedPath = this.escapePath(fullPath);
      result = result.replaceAll('@cfile', escapedPath);
    }
    
    // 替換 @folder（vault 根目錄）
    if (result.includes('@folder')) {
      const adapter = vault.adapter;
      if (!(adapter instanceof FileSystemAdapter)) {
        throw new Error('錯誤：檔案系統存取不可用');
      }
      
      const vaultPath = adapter.getBasePath();
      const escapedPath = this.escapePath(vaultPath);
      result = result.replaceAll('@folder', escapedPath);
    }
    
    return result;
  }
  
  /**
   * 跨平台路徑轉義
   */
  private escapePath(path: string): string {
    if (process.platform === 'win32') {
      // Windows：使用雙引號
      return `"${path.replace(/"/g, '""')}"`;
    } else {
      // Unix：使用單引號（最安全，避免 shell 特殊字元展開）
      return `'${path.replace(/'/g, "'\\''")}'`;
    }
  }
}
```

**整合到 PTY 管理器**：
```typescript
// src/terminal/pty-manager.ts
export class PtyManager {
  private contextHandler: ContextCommandHandler;
  
  constructor(app: App) {
    this.contextHandler = new ContextCommandHandler(app);
  }
  
  async create(options: { cwd: string, terminal: Terminal }): Promise<PtySession> {
    const pty = new PtySession(options);
    
    // 攔截終端輸入
    options.terminal.onData(async (data) => {
      const { data: processedData, shouldExecute } = 
        await this.contextHandler.handleInput(data);
      
      if (shouldExecute && processedData) {
        await pty.write(processedData);
      }
    });
    
    return pty;
  }
}
```

### 替代方案：xterm.js 層級處理（不推薦）

```typescript
// ❌ 不推薦：會導致使用者看到路徑替換的視覺跳動
terminal.onData(async (data) => {
  if (data === '\r') {
    const currentLine = getCurrentLine(terminal);
    if (currentLine.includes('@cfile')) {
      const replaced = await replaceContextCommands(currentLine);
      
      // 清除當前行並重寫（會閃爍）
      terminal.write('\x1b[2K\r');  
      terminal.write(replaced);
      pty.write('\r');
      return;
    }
  }
  
  pty.write(data);
});
```

### 路徑轉義策略

**跨平台處理**：
```typescript
function escapePath(path: string): string {
  const platform = process.platform;
  
  if (platform === 'win32') {
    // Windows CMD/PowerShell
    // 雙引號，內部雙引號需轉義
    return `"${path.replace(/"/g, '""')}"`;
  } else {
    // Unix/macOS (bash/zsh/fish)
    // 單引號（最安全，避免變數展開、glob 等）
    // 內部單引號轉換為 '\''
    return `'${path.replace(/'/g, "'\\''")}'`;
  }
}

// 測試範例
escapePath('/Users/user/My Documents/file.md');
// Unix: '/Users/user/My Documents/file.md'

escapePath('C:\\Users\\user\\My Documents\\file.md');
// Windows: "C:\Users\user\My Documents\file.md"

escapePath("/path/with'quote/file.md");
// Unix: '/path/with'\''quote/file.md'
```

### 注意事項

❌ **常見陷阱**：
1. **空格未轉義** → `/path/to/my file.md` 被解析為兩個參數
2. **特殊字元未處理** → `$HOME` 在雙引號中會展開
3. **未檢查檔案存在** → 替換不存在的檔案路徑
4. **跨平台路徑分隔符** → Windows `\` vs Unix `/`

✅ **最佳實踐**：
```typescript
// 1. 總是使用引號包裹路徑
const escaped = escapePath(path);  // ✅

// 2. Unix 優先使用單引號（避免變數展開）
return `'${path}'`;  // ✅
return `"${path}"`;  // ❌ 可能導致 $VAR 展開

// 3. 替換前檢查檔案存在性
const activeFile = workspace.getActiveFile();
if (!activeFile) {
  new Notice('錯誤：目前沒有開啟的檔案');
  throw new Error('No active file');
}

// 4. 完整錯誤處理
try {
  const replaced = await replaceContextCommands(input);
  pty.write(replaced + '\r');
} catch (error) {
  new Notice(error.message);
  // 不執行命令
}
```

---

## 5. 選取範圍參考實作

### 決策：使用 Editor API + Notice 通知 + Clipboard API

**實作方案**：
```typescript
// src/utils/selection-reference.ts
import { App, Editor, MarkdownView, Notice, FileSystemAdapter } from 'obsidian';

export class SelectionReferenceHandler {
  constructor(private app: App) {}
  
  /**
   * 取得當前選取範圍
   */
  getSelection(): {
    file: string;
    startLine: number;
    endLine: number;
  } | null {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      return null;
    }
    
    const editor = activeView.editor;
    const selection = editor.getSelection();
    
    if (!selection || selection.length === 0) {
      // 無選取時，返回游標所在行
      const cursor = editor.getCursor();
      return {
        file: activeView.file.path,
        startLine: cursor.line + 1,  // CodeMirror 是 0-indexed，轉為 1-indexed
        endLine: cursor.line + 1,
      };
    }
    
    // 有選取範圍
    const from = editor.getCursor('from');
    const to = editor.getCursor('to');
    
    return {
      file: activeView.file.path,
      startLine: from.line + 1,
      endLine: to.line + 1,
    };
  }
  
  /**
   * 格式化為 GitHub 風格引用（file.md#L10-L15）
   */
  formatReference(selection: ReturnType<typeof this.getSelection>): string | null {
    if (!selection) return null;
    
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      return null;
    }
    
    const fullPath = adapter.getFullPath(selection.file);
    
    if (selection.startLine === selection.endLine) {
      // 單行
      return `${fullPath}#L${selection.startLine}`;
    } else {
      // 多行範圍
      return `${fullPath}#L${selection.startLine}-L${selection.endLine}`;
    }
  }
  
  /**
   * 顯示可點擊通知並提供複製功能
   */
  async showReferenceNotice(): Promise<void> {
    const selection = this.getSelection();
    if (!selection) {
      new Notice('請在編輯器中執行此命令');
      return;
    }
    
    const reference = this.formatReference(selection);
    if (!reference) {
      new Notice('無法產生檔案參考');
      return;
    }
    
    // 建立持久通知（不自動消失）
    const notice = new Notice('', 0);
    const el = notice.noticeEl;
    
    el.empty();
    el.createDiv({
      text: '📋 檔案參考（點擊複製）',
      cls: 'notice-title'
    });
    
    const refDiv = el.createDiv({
      text: reference,
      cls: 'file-reference-clickable'
    });
    
    // 樣式設定
    refDiv.style.cursor = 'pointer';
    refDiv.style.padding = '8px';
    refDiv.style.background = 'var(--background-modifier-hover)';
    refDiv.style.borderRadius = '4px';
    refDiv.style.marginTop = '4px';
    refDiv.style.fontFamily = 'var(--font-monospace)';
    refDiv.style.fontSize = '0.9em';
    refDiv.style.wordBreak = 'break-all';
    
    // 點擊複製到剪貼簿
    refDiv.addEventListener('click', async () => {
      try {
        await this.copyToClipboard(reference);
        new Notice('✅ 已複製到剪貼簿！');
        notice.hide();
      } catch (error) {
        new Notice('❌ 複製失敗：請檢查瀏覽器權限');
        console.error(error);
      }
    });
    
    // 5 秒後自動關閉
    setTimeout(() => notice.hide(), 5000);
  }
  
  /**
   * 複製到剪貼簿（含降級方案）
   */
  private async copyToClipboard(text: string): Promise<void> {
    try {
      // 現代 Clipboard API
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // 降級方案：使用 execCommand
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
}
```

**整合到 Plugin**：
```typescript
// src/main.ts
export default class AITerminalPlugin extends Plugin {
  private selectionHandler: SelectionReferenceHandler;
  
  async onload() {
    this.selectionHandler = new SelectionReferenceHandler(this.app);
    
    // 添加命令
    this.addCommand({
      id: 'copy-selection-reference',
      name: 'Copy Selection Reference',
      editorCallback: () => {
        this.selectionHandler.showReferenceNotice();
      },
    });
    
    // 添加右鍵選單
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor, view) => {
        menu.addItem((item) => {
          item
            .setTitle('複製選取範圍參考')
            .setIcon('link')
            .onClick(() => {
              this.selectionHandler.showReferenceNotice();
            });
        });
      })
    );
  }
}
```

### 路徑取得與處理

**PathHelper 工具類別**：
```typescript
// src/utils/path-helper.ts
import { App, FileSystemAdapter, TFile } from 'obsidian';

export class PathHelper {
  constructor(private app: App) {}
  
  /**
   * 取得當前開啟檔案的完整路徑
   */
  getCurrentFilePath(): string | null {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return null;
    
    return this.toAbsolutePath(activeFile.path);
  }
  
  /**
   * 取得 vault 根目錄路徑
   */
  getVaultPath(): string | null {
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      return null;
    }
    
    return adapter.getBasePath();
  }
  
  /**
   * 取得檔案所在目錄路徑
   */
  getFileDirectory(file: TFile): string | null {
    const parent = file.parent;
    if (!parent) {
      return this.getVaultPath();
    }
    
    return this.toAbsolutePath(parent.path);
  }
  
  /**
   * Vault 相對路徑 → 系統絕對路徑
   */
  toAbsolutePath(vaultRelativePath: string): string | null {
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      return null;
    }
    
    return adapter.getFullPath(vaultRelativePath);
  }
  
  /**
   * 系統絕對路徑 → Vault 相對路徑
   */
  toRelativePath(absolutePath: string): string | null {
    const vaultPath = this.getVaultPath();
    if (!vaultPath) return null;
    
    if (!absolutePath.startsWith(vaultPath)) {
      return null;  // 不在 vault 內
    }
    
    return absolutePath.slice(vaultPath.length + 1);
  }
}
```

### 注意事項

❌ **常見陷阱**：
1. **行號索引混淆** → CodeMirror 0-indexed vs GitHub 1-indexed
2. **未檢查活躍視圖類型** → 可能不是 MarkdownView
3. **剪貼簿權限** → 某些瀏覽器需要使用者手勢觸發
4. **Notice 記憶體洩漏** → 長時間顯示的 Notice 應手動 hide()

✅ **最佳實踐**：
```typescript
// 1. 正確的視圖類型檢查
const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
if (!activeView) {
  new Notice('請在編輯器中執行此命令');
  return;
}

// 2. 行號正確轉換
const cmLine = editor.getCursor().line;  // 0-indexed
const displayLine = cmLine + 1;          // 1-indexed for GitHub style

// 3. 剪貼簿錯誤處理
try {
  await navigator.clipboard.writeText(text);
  new Notice('✅ 已複製！');
} catch (error) {
  // 降級方案
  this.fallbackCopy(text);
}

// 4. 清理長時間顯示的 Notice
const notice = new Notice('', 0);  // 永不消失
setTimeout(() => notice.hide(), 5000);  // 5 秒後清理
```

---

## 6. 專案結構建議

### 最終目錄架構

```
obsidian-ai-plugin/
├── src/
│   ├── main.ts                      # Plugin 入口點
│   ├── views/
│   │   └── TerminalView.ts          # ItemView 實作
│   ├── terminal/
│   │   ├── xterm-emulator.ts        # xterm.js 封裝
│   │   ├── pty-session.ts           # PTY 連線管理
│   │   ├── pty-manager.ts           # PTY 多實例管理
│   │   └── context-commands.ts      # @cfile/@folder 處理
│   ├── utils/
│   │   ├── path-helper.ts           # 路徑處理工具
│   │   ├── selection-reference.ts   # 選取範圍處理
│   │   ├── clipboard.ts             # 剪貼簿工具
│   │   └── debounce.ts              # 防抖工具
│   ├── settings.ts                  # 外掛設定介面
│   └── types.ts                     # TypeScript 型別定義
├── scripts/
│   ├── unix_pty.py                  # Unix PTY 實作（Python）
│   ├── windows_pty.py               # Windows PTY 實作（Python）
│   ├── setup.sh                     # Unix 環境設定腳本
│   └── setup.bat                    # Windows 環境設定腳本
├── styles/
│   └── terminal.css                 # 終端 UI 樣式
├── tests/
│   ├── unit/
│   │   ├── context-commands.test.ts
│   │   ├── path-helper.test.ts
│   │   └── selection-reference.test.ts
│   └── integration/
│       └── terminal-view.test.ts
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── .eslintrc.json
├── .gitignore
└── README.md
```

### 模組職責說明

| 模組 | 職責 | 預估行數 |
|------|------|----------|
| `main.ts` | 外掛生命週期、命令註冊、Ribbon 圖示 | 100-150 |
| `TerminalView.ts` | ItemView 實作、生命週期管理 | 200-250 |
| `xterm-emulator.ts` | xterm.js 封裝、addons 管理 | 150-200 |
| `pty-session.ts` | 單一 PTY 連線管理 | 200-250 |
| `pty-manager.ts` | 多實例 PTY 管理器 | 100-150 |
| `context-commands.ts` | @cfile/@folder 替換邏輯 | 150-200 |
| `path-helper.ts` | 路徑處理工具 | 100-150 |
| `selection-reference.ts` | 選取範圍處理 | 150-200 |
| `settings.ts` | 設定介面與預設值 | 100-150 |
| `unix_pty.py` | Unix PTY Python 腳本 | 100-150 |
| `windows_pty.py` | Windows PTY Python 腳本 | 150-200 |
| **總計** | **估計總行數** | **1500-2200** |

---

## 7. 實作階段規劃

### Phase 1 - MVP（1-2 週）

**目標**：驗證核心架構可行性

**功能範圍**：
- ✅ 基礎 ItemView + xterm.js 整合
- ✅ FitAddon 自動調整大小
- ✅ 底部面板顯示
- ✅ Python PTY 腳本（Unix/macOS 優先）
- ✅ 基本 pty 連接（輸入/輸出）

**成功標準**：
- 能在 Obsidian 底部面板開啟終端
- 能執行基本系統命令（`ls`, `pwd`, `echo`）
- 終端大小自動適應容器
- 無記憶體洩漏（關閉後資源正確釋放）

**優先實作**：
1. `TerminalView.ts` + `xterm-emulator.ts`
2. `unix_pty.py` + `pty-session.ts`
3. Plugin 註冊與命令

---

### Phase 2 - 核心功能（2-3 週）

**目標**：實作上下文整合功能

**功能範圍**：
- ✅ @cfile/@folder 替換機制
- ✅ 路徑取得與跨平台轉義
- ✅ 選取範圍參考 + 通知
- ✅ Windows PTY 支援（`windows_pty.py`）
- ✅ WebLinksAddon + SerializeAddon

**成功標準**：
- `echo @cfile` 正確顯示當前檔案路徑
- `echo @folder` 正確顯示 vault 路徑
- 路徑包含空格、中文能正確處理
- 選取文字後能產生 GitHub 風格引用
- 跨平台測試通過（macOS、Windows、Linux）

**優先實作**：
1. `context-commands.ts` + `path-helper.ts`
2. `selection-reference.ts`
3. `windows_pty.py`（Windows 支援）
4. 跨平台測試

---

### Phase 3 - 優化與進階功能（1-2 週）

**目標**：效能優化與使用者體驗提升

**功能範圍**：
- ✅ WebGL 渲染優化
- ✅ 狀態持久化（恢復終端歷史）
- ✅ 多實例管理（可選）
- ✅ 設定介面（字體、主題、預設 shell）
- ✅ 錯誤處理完善

**成功標準**：
- 終端渲染流暢（WebGL 加速）
- Obsidian 重啟後能恢復終端狀態
- 完整的錯誤訊息與使用者提示
- 設定介面完整且易用
- 測試覆蓋率達 80%+

**優先實作**：
1. WebGL/Canvas addon 整合
2. 狀態序列化與恢復
3. `settings.ts` 設定介面
4. 完整測試覆蓋

---

## 8. 技術風險與緩解

### 風險 1：Python 環境依賴

**風險等級**：🟡 中等

**描述**：使用者可能未安裝 Python 或版本不符（需 v3.10+）

**緩解措施**：
1. README 明確說明 Python 環境要求
2. 提供一鍵安裝腳本（`setup.sh`/`setup.bat`）
3. 首次開啟終端時檢查 Python 可用性
4. 提供友善的錯誤訊息與安裝指引連結

**備選方案**：
- 評估 WebAssembly PTY 實作（如 xterm-pty）
- 考慮使用 node-pty 並提供預編譯二進位檔案

---

### 風險 2：跨平台路徑處理

**風險等級**：🟡 中等

**描述**：Windows 反斜線、特殊字元、磁碟機代號處理複雜

**緩解措施**：
1. 使用 Obsidian 內建 `normalizePath()` 統一路徑格式
2. 路徑轉義使用引號包裹（Windows 雙引號、Unix 單引號）
3. 完整的跨平台測試（Windows、macOS、Linux）
4. 單元測試覆蓋各種路徑格式（空格、中文、特殊字元）

---

### 風險 3：終端連線穩定性

**風險等級**：🟢 低

**描述**：長時間運作可能出現記憶體洩漏或連線中斷

**緩解措施**：
1. 使用 `this.register()` 確保資源自動清理
2. 監控 PTY 進程狀態，異常時自動重啟
3. 限制 scrollback 緩衝區大小（1000 行）
4. 定期測試長時間運作穩定性（1+ 小時）

---

### 風險 4：上下文指令衝突

**風險等級**：🟢 低

**描述**：`@cfile`/@folder 可能與某些 shell 或工具衝突

**緩解措施**：
1. 允許使用者在設定中自訂指令前綴（預設 `@`）
2. 提供逃脫機制（如 `\@cfile` 不替換）
3. 文件中說明可能的衝突情境
4. 考慮使用更獨特的前綴（如 `__cfile__`）

---

## 9. 測試策略

### 單元測試（目標覆蓋率：80%+）

**測試範圍**：
```typescript
// tests/unit/context-commands.test.ts
describe('ContextCommandHandler', () => {
  it('應正確替換 @cfile 為當前檔案路徑', async () => {
    const handler = new ContextCommandHandler(mockApp);
    const input = 'cat @cfile';
    const result = await handler.replaceContextCommands(input);
    expect(result).toContain('/path/to/current/file.md');
  });
  
  it('應正確轉義包含空格的路徑', () => {
    const path = '/path/to/my file.md';
    const escaped = escapePath(path);
    expect(escaped).toBe("'/path/to/my file.md'");  // Unix
  });
  
  it('當無開啟檔案時應拋出錯誤', async () => {
    mockApp.workspace.getActiveFile = () => null;
    await expect(handler.replaceContextCommands('cat @cfile'))
      .rejects.toThrow('目前沒有開啟的檔案');
  });
});

// tests/unit/path-helper.test.ts
describe('PathHelper', () => {
  it('應正確取得 vault 路徑', () => {
    const helper = new PathHelper(mockApp);
    const path = helper.getVaultPath();
    expect(path).toBeTruthy();
    expect(path).toContain('obsidian');
  });
  
  it('應正確轉換相對路徑為絕對路徑', () => {
    const relative = 'notes/daily.md';
    const absolute = helper.toAbsolutePath(relative);
    expect(absolute).toContain('notes/daily.md');
  });
});

// tests/unit/selection-reference.test.ts
describe('SelectionReferenceHandler', () => {
  it('應正確格式化單行選取', () => {
    const selection = { file: 'note.md', startLine: 10, endLine: 10 };
    const ref = handler.formatReference(selection);
    expect(ref).toContain('#L10');
  });
  
  it('應正確格式化多行選取', () => {
    const selection = { file: 'note.md', startLine: 10, endLine: 15 };
    const ref = handler.formatReference(selection);
    expect(ref).toContain('#L10-L15');
  });
});
```

### 整合測試

```typescript
// tests/integration/terminal-view.test.ts
describe('TerminalView Integration', () => {
  it('應能開啟終端並執行命令', async () => {
    const view = new TerminalView(mockLeaf, mockPlugin);
    await view.onOpen();
    
    // 模擬輸入命令
    view.emulator.terminal.write('echo "test"\r');
    
    // 等待輸出
    await waitFor(() => {
      expect(view.emulator.terminal.buffer.active.getLine(0).translateToString())
        .toContain('test');
    });
  });
  
  it('應正確處理 @cfile 替換', async () => {
    mockApp.workspace.getActiveFile = () => ({
      path: 'notes/test.md'
    });
    
    view.emulator.terminal.write('echo @cfile\r');
    
    await waitFor(() => {
      expect(view.emulator.terminal.buffer.active.getLine(0).translateToString())
        .toContain('notes/test.md');
    });
  });
});
```

### 手動測試清單

**跨平台測試**：
- [ ] macOS：終端開啟、命令執行、@cfile/@folder 替換
- [ ] Windows：同上
- [ ] Linux：同上

**路徑處理測試**：
- [ ] 包含空格的路徑
- [ ] 包含中文的路徑
- [ ] 包含特殊字元（`$`, `` ` ``, `!`）的路徑
- [ ] 超長路徑（> 260 字元）

**邊界情況測試**：
- [ ] 無開啟檔案時使用 @cfile
- [ ] 快速連續輸入指令
- [ ] 長時間運作（1+ 小時）
- [ ] 大量輸出（> 10000 行）
- [ ] 終端視窗大小調整

---

## 10. 建議與後續行動

### 立即行動（Phase 0 完成後）

1. **建立專案骨架**：
   ```bash
   mkdir -p src/{views,terminal,utils} scripts tests/{unit,integration}
   touch src/main.ts src/types.ts
   ```

2. **安裝依賴**：
   ```bash
   npm install @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
   npm install -D @types/node obsidian
   ```

3. **建立 Python PTY 腳本雛型**（Unix 優先）：
   ```bash
   touch scripts/unix_pty.py scripts/windows_pty.py
   ```

4. **設定測試環境**：
   ```bash
   npm install -D jest @types/jest ts-jest
   ```

### Phase 1 實作順序

1. ✅ **TerminalView + xterm-emulator**（2-3 天）
2. ✅ **unix_pty.py + pty-session**（2-3 天）
3. ✅ **Plugin 註冊與命令**（1 天）
4. ✅ **基礎測試與驗證**（1-2 天）

### 技術債務追蹤

**Phase 1 技術債務**：
- ⚠️ 暫不支援 Windows（延後至 Phase 2）
- ⚠️ 暫不支援狀態持久化（延後至 Phase 3）
- ⚠️ 暫不支援 WebGL 渲染（延後至 Phase 3）

**需在 Phase 2+ 解決**。

---

## 11. 參考資源

### 官方文件

- [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian API 型別定義](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts)
- [xterm.js 文件](https://xtermjs.org/docs/)
- [xterm.js Addons](https://github.com/xtermjs/xterm.js/tree/master/addons)

### 參考專案

- [obsidian-terminal](https://github.com/polyipseity/obsidian-terminal) - 終端整合範例
- [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) - 官方範本

### 技術文章

- [Python PTY 教學](https://docs.python.org/3/library/pty.html)
- [Electron Process Communication](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Shell Path Escaping](https://www.gnu.org/software/bash/manual/html_node/Quoting.html)

---

## 12. 結論

**核心決策總結**：

1. ✅ **Native Module 策略**：採用 Python PTY 腳本，避免 node-pty 編譯複雜度
2. ✅ **終端整合架構**：XtermEmulator 封裝 xterm.js，PtySession 管理連線
3. ✅ **上下文指令替換**：在 PTY 輸入層級處理，Enter 執行時替換
4. ✅ **底部面板整合**：繼承 ItemView，使用 `createLeafBySplit('horizontal', false)`
5. ✅ **路徑處理**：跨平台轉義（Unix 單引號、Windows 雙引號）

**風險評估**：整體風險 🟢 低至 🟡 中等，主要風險為 Python 環境依賴與跨平台相容性，已規劃緩解措施。

**準備就緒**：Phase 0 研究完成，具備足夠技術細節進入 Phase 1 實作階段。

---

**研究完成日期**：2025-12-22  
**下一步**：Phase 1 - data-model.md、contracts/、quickstart.md 生成
