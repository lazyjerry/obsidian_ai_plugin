# Quickstart Guide: AI Terminal Integration

**Date**: 2025-12-22  
**Feature**: AI Terminal Integration  
**Target Audience**: 開發者（實作此功能）

---

## 目標

本指南幫助開發者快速啟動 AI Terminal Integration 功能的實作，涵蓋環境設定、專案結構建立、核心模組實作順序與驗證步驟。

**預計時間**：Phase 1 (MVP) 約 1-2 週

---

## 前置需求

### 必要環境

- ✅ Node.js v18+ LTS（建議 v20.x）
- ✅ Python 3.10+（用於 PTY 腳本）
- ✅ TypeScript 5.x
- ✅ Obsidian v1.0.0+（測試環境）

### 驗證環境

```bash
# 檢查 Node.js 版本
node --version  # 應為 v18.0.0 或更高

# 檢查 Python 版本
python3 --version  # 應為 3.10.0 或更高

# 檢查 TypeScript
npx tsc --version  # 應為 5.0.0 或更高
```

---

## 步驟 1：建立專案骨架

### 1.1 初始化專案

```bash
# 假設已有 obsidian-ai-plugin 專案
cd obsidian-ai-plugin

# 建立目錄結構
mkdir -p src/{views,terminal,utils} scripts tests/{unit,integration}

# 建立核心檔案
touch src/main.ts
touch src/types.ts
touch src/settings.ts

# 建立 views
touch src/views/TerminalView.ts

# 建立 terminal 模組
touch src/terminal/xterm-emulator.ts
touch src/terminal/pty-session.ts
touch src/terminal/pty-manager.ts
touch src/terminal/context-commands.ts

# 建立 utils
touch src/utils/path-helper.ts
touch src/utils/selection-reference.ts
touch src/utils/debounce.ts

# 建立 Python PTY 腳本
touch scripts/unix_pty.py
touch scripts/windows_pty.py
touch scripts/setup.sh
touch scripts/setup.bat
```

### 1.2 安裝依賴

```bash
# xterm.js 與 addons
npm install @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
npm install @xterm/addon-serialize  # Phase 3 用

# 開發依賴
npm install -D @types/node obsidian esbuild typescript

# 測試工具
npm install -D jest @types/jest ts-jest

# Linting
npm install -D eslint @typescript-eslint/eslint-plugin eslint-plugin-obsidianmd
```

### 1.3 配置 TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 1.4 配置 esbuild

```javascript
// esbuild.config.mjs
import esbuild from 'esbuild';
import process from 'process';

const prod = process.argv[2] === 'production';

esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    'node:*',
    '@codemirror/*',
  ],
  format: 'cjs',
  target: 'es2020',
  outfile: 'main.js',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  minify: prod,
}).catch(() => process.exit(1));
```

---

## 步驟 2：實作核心型別（src/types.ts）

```typescript
// src/types.ts
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { App, TFile } from 'obsidian';
import { ChildProcess } from 'child_process';

export enum TerminalStatus {
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  EXITED = 'exited',
  ERROR = 'error',
}

export interface TerminalSession {
  readonly id: string;
  status: TerminalStatus;
  readonly createdAt: Date;
  readonly cwd: string;
  readonly shell: string;
  readonly env: Record<string, string>;
  readonly emulator: XtermEmulator;
  readonly pty: PtyProcess;
  stats: TerminalStats;
}

export interface TerminalStats {
  bytesWritten: number;
  bytesRead: number;
  commandCount: number;
}

export interface XtermEmulator {
  readonly terminal: Terminal;
  readonly addons: {
    fit: FitAddon;
  };
  readonly container: HTMLElement;
  dispose(): void;
}

export interface PtyProcess {
  readonly pid: number;
  readonly shell: string;
  readonly cwd: string;
  readonly pythonProcess: ChildProcess;
  exitCode: number | null;
  write(data: string): Promise<void>;
  kill(signal?: NodeJS.Signals): void;
}

// ... 其他型別定義
```

---

## 步驟 3：實作 XtermEmulator（Phase 1 重點）

```typescript
// src/terminal/xterm-emulator.ts
import { Terminal, ITerminalOptions } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import type { XtermEmulator as IXtermEmulator } from '../types';

export class XtermEmulator implements IXtermEmulator {
  public readonly terminal: Terminal;
  public readonly addons: { fit: FitAddon };
  public readonly container: HTMLElement;
  
  constructor(container: HTMLElement, options?: Partial<ITerminalOptions>) {
    this.container = container;
    
    // 建立終端
    this.terminal = new Terminal({
      fontFamily: '"Fira Code", "Menlo", "Consolas", monospace',
      fontSize: 14,
      theme: {
        background: getComputedStyle(document.body).getPropertyValue('--background-primary'),
        foreground: getComputedStyle(document.body).getPropertyValue('--text-normal'),
        cursor: getComputedStyle(document.body).getPropertyValue('--text-accent'),
      },
      cursorBlink: true,
      scrollback: 1000,
      allowProposedApi: true,
      ...options,
    });
    
    // 載入 FitAddon
    this.addons = {
      fit: new FitAddon(),
    };
    this.terminal.loadAddon(this.addons.fit);
    
    // 附加到 DOM
    this.terminal.open(container);
    this.addons.fit.fit();
    
    // 監聽容器大小變化
    this.setupResizeObserver();
  }
  
  private setupResizeObserver(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.addons.fit.fit();
    });
    
    resizeObserver.observe(this.container);
    
    this.terminal.onDispose(() => {
      resizeObserver.disconnect();
    });
  }
  
  public dispose(): void {
    this.terminal.dispose();
  }
}
```

---

## 步驟 4：實作 Python PTY 腳本（Unix 優先）

```python
# scripts/unix_pty.py
import sys
import os
import pty
import select
import termios
import tty
import struct
import fcntl

def set_terminal_size(fd, rows, cols):
    """設定終端大小"""
    winsize = struct.pack("HHHH", rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 unix_pty.py <shell>", file=sys.stderr)
        sys.exit(1)
    
    shell = sys.argv[1]
    
    # 建立 pseudoterminal
    master, slave = pty.openpty()
    
    # 設定終端大小（預設 24x80）
    set_terminal_size(master, 24, 80)
    
    # Fork 子進程
    pid = os.fork()
    
    if pid == 0:
        # 子進程：執行 shell
        os.close(master)
        os.setsid()
        os.dup2(slave, 0)  # stdin
        os.dup2(slave, 1)  # stdout
        os.dup2(slave, 2)  # stderr
        os.close(slave)
        
        os.execvp(shell, [shell])
    else:
        # 父進程：資料轉發
        os.close(slave)
        
        # 設定 master 為 non-blocking
        flag = fcntl.fcntl(master, fcntl.F_GETFL)
        fcntl.fcntl(master, fcntl.F_SETFL, flag | os.O_NONBLOCK)
        
        # 設定 stdin 為 raw 模式
        old_settings = termios.tcgetattr(sys.stdin)
        tty.setraw(sys.stdin.fileno())
        
        try:
            while True:
                # 使用 select 多路複用
                r, w, e = select.select([master, sys.stdin], [], [])
                
                if master in r:
                    # shell → stdout
                    try:
                        data = os.read(master, 1024)
                        if not data:
                            break
                        sys.stdout.buffer.write(data)
                        sys.stdout.buffer.flush()
                    except OSError:
                        break
                
                if sys.stdin in r:
                    # stdin → shell
                    data = os.read(sys.stdin.fileno(), 1024)
                    if not data:
                        break
                    os.write(master, data)
        finally:
            # 恢復終端設定
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
            os.close(master)
            
            # 等待子進程
            pid, status = os.waitpid(pid, 0)
            sys.exit(os.WEXITSTATUS(status))

if __name__ == '__main__':
    main()
```

---

## 步驟 5：實作 PtySession（連接 Python 腳本）

```typescript
// src/terminal/pty-session.ts
import { spawn, ChildProcess } from 'child_process';
import { PtyProcess } from '../types';

export interface PtySessionOptions {
  shell: string;
  cwd: string;
  env?: Record<string, string>;
  pythonExecutable?: string;
}

export class PtySession implements PtyProcess {
  public readonly pid: number;
  public readonly shell: string;
  public readonly cwd: string;
  public readonly pythonProcess: ChildProcess;
  public exitCode: number | null = null;
  
  private dataListeners: ((data: string) => void)[] = [];
  private exitListeners: ((code: number) => void)[] = [];
  
  constructor(options: PtySessionOptions) {
    this.shell = options.shell;
    this.cwd = options.cwd;
    
    const pythonExecutable = options.pythonExecutable || 'python3';
    const ptyScript = this.getPtyScriptPath();
    
    // 啟動 Python PTY 腳本
    this.pythonProcess = spawn(
      pythonExecutable,
      [ptyScript, this.shell],
      {
        cwd: this.cwd,
        env: options.env || process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    
    this.pid = this.pythonProcess.pid!;
    
    // 監聽輸出
    this.pythonProcess.stdout?.on('data', (chunk: Buffer) => {
      const data = chunk.toString();
      this.dataListeners.forEach(listener => listener(data));
    });
    
    // 監聽退出
    this.pythonProcess.on('exit', (code) => {
      this.exitCode = code || 0;
      this.exitListeners.forEach(listener => listener(this.exitCode!));
    });
  }
  
  async write(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pythonProcess.stdin?.write(data, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  
  kill(signal?: NodeJS.Signals): void {
    this.pythonProcess.kill(signal || 'SIGTERM');
  }
  
  onData(callback: (data: string) => void): { dispose: () => void } {
    this.dataListeners.push(callback);
    return {
      dispose: () => {
        const index = this.dataListeners.indexOf(callback);
        if (index !== -1) this.dataListeners.splice(index, 1);
      },
    };
  }
  
  onExit(callback: (code: number) => void): { dispose: () => void } {
    this.exitListeners.push(callback);
    return {
      dispose: () => {
        const index = this.exitListeners.indexOf(callback);
        if (index !== -1) this.exitListeners.splice(index, 1);
      },
    };
  }
  
  private getPtyScriptPath(): string {
    const platform = process.platform;
    const scriptName = platform === 'win32' ? 'windows_pty.py' : 'unix_pty.py';
    return `${__dirname}/../../scripts/${scriptName}`;
  }
}
```

---

## 步驟 6：實作 TerminalView

```typescript
// src/views/TerminalView.ts
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { XtermEmulator } from '../terminal/xterm-emulator';
import { PtySession } from '../terminal/pty-session';
import type AITerminalPlugin from '../main';

export class TerminalView extends ItemView {
  private emulator: XtermEmulator | null = null;
  private pty: PtySession | null = null;
  
  constructor(leaf: WorkspaceLeaf, private plugin: AITerminalPlugin) {
    super(leaf);
  }
  
  getViewType(): string {
    return 'ai-terminal';
  }
  
  getDisplayText(): string {
    return 'AI Terminal';
  }
  
  getIcon(): string {
    return 'terminal';
  }
  
  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('ai-terminal-container');
    
    // 建立終端容器
    const terminalEl = container.createDiv('terminal-wrapper');
    
    // 初始化 xterm.js
    this.emulator = new XtermEmulator(terminalEl);
    
    // 建立 PTY
    const cwd = this.plugin.pathHelper.getVaultPath() || '/tmp';
    this.pty = new PtySession({
      shell: '/bin/zsh',  // 暫時硬編碼
      cwd,
    });
    
    // 連接資料流
    this.connectDataFlow();
    
    // 註冊清理
    this.register(() => {
      this.emulator?.dispose();
      this.pty?.kill();
    });
  }
  
  async onClose(): Promise<void> {
    // 資源清理透過 this.register() 自動執行
  }
  
  private connectDataFlow(): void {
    if (!this.emulator || !this.pty) return;
    
    const { terminal } = this.emulator;
    
    // 終端 → PTY
    terminal.onData(async (data) => {
      await this.pty?.write(data);
    });
    
    // PTY → 終端
    this.pty.onData((data) => {
      terminal.write(data);
    });
    
    // PTY 退出
    this.pty.onExit((code) => {
      terminal.write(`\r\n[Process exited with code ${code}]\r\n`);
    });
  }
}
```

---

## 步驟 7：整合到 main.ts

```typescript
// src/main.ts
import { Plugin } from 'obsidian';
import { TerminalView } from './views/TerminalView';
import { PathHelper } from './utils/path-helper';

export default class AITerminalPlugin extends Plugin {
  public pathHelper: PathHelper;
  
  async onload() {
    console.log('Loading AI Terminal Plugin');
    
    this.pathHelper = new PathHelper(this.app);
    
    // 註冊視圖
    this.registerView(
      'ai-terminal',
      (leaf) => new TerminalView(leaf, this)
    );
    
    // 添加命令
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
    
    let leaf = workspace.getLeavesOfType('ai-terminal')[0];
    
    if (!leaf) {
      const activeLeaf = workspace.getLeaf(false);
      leaf = workspace.createLeafBySplit(activeLeaf, 'horizontal', false);
    }
    
    await leaf.setViewState({
      type: 'ai-terminal',
      active: true,
    });
    
    workspace.revealLeaf(leaf);
  }
}
```

---

## 步驟 8：測試與驗證

### 8.1 編譯

```bash
npm run dev  # 或 npx esbuild --watch
```

### 8.2 安裝到 Obsidian

```bash
# 複製到測試 vault
cp main.js manifest.json /path/to/test-vault/.obsidian/plugins/ai-terminal/

# 重新載入 Obsidian
# 在 Obsidian 中啟用外掛
```

### 8.3 功能驗證

- [ ] ✅ 能開啟終端視圖（底部面板）
- [ ] ✅ 能執行基本命令（`ls`, `pwd`, `echo "test"`）
- [ ] ✅ 終端大小自動適應容器
- [ ] ✅ 關閉視圖後資源正確釋放

---

## 下一步（Phase 2）

1. 實作 ContextCommandHandler（@cfile/@folder）
2. 實作 PathHelper（路徑處理與轉義）
3. 實作 SelectionReferenceHandler
4. Windows PTY 支援（windows_pty.py）
5. 完整的錯誤處理與使用者提示

---

## 疑難排解

### Python 未安裝

```bash
# macOS
brew install python@3.10

# Ubuntu/Debian
sudo apt install python3.10

# Windows
# 從 python.org 下載安裝程式
```

### PTY 腳本無法執行

```bash
# 檢查 Python 路徑
which python3

# 檢查腳本權限
chmod +x scripts/unix_pty.py

# 手動測試腳本
python3 scripts/unix_pty.py /bin/bash
```

### 終端無法顯示中文

```typescript
// 在 XtermEmulator 中啟用 Unicode 支援
import { Unicode11Addon } from '@xterm/addon-unicode11';

const unicode11Addon = new Unicode11Addon();
terminal.loadAddon(unicode11Addon);
terminal.unicode.activeVersion = '11';
```

---

**Phase 1 MVP 完成標準**：
✅ 終端開啟並能執行基本系統命令  
✅ 無記憶體洩漏  
✅ 跨平台測試通過（macOS 優先）
