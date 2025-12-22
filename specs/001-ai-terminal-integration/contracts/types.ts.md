# Core Types Contract

**File**: `src/types.ts`  
**Purpose**: 核心資料型別定義，被所有模組共用

---

## Type Definitions

```typescript
/**
 * 終端連線狀態
 */
export enum TerminalStatus {
  /** 初始化中（建立 PTY、載入 xterm.js） */
  INITIALIZING = 'initializing',
  
  /** 運作中（可接受輸入與輸出） */
  RUNNING = 'running',
  
  /** 已退出（PTY 進程結束） */
  EXITED = 'exited',
  
  /** 錯誤狀態（啟動失敗或執行時錯誤） */
  ERROR = 'error',
}

/**
 * 終端連線會話
 * 
 * 代表一個完整的終端實例，包含 xterm.js、PTY 進程、配置與狀態。
 */
export interface TerminalSession {
  /** 唯一識別碼（UUID v4） */
  readonly id: string;
  
  /** 當前連線狀態 */
  status: TerminalStatus;
  
  /** 建立時間 */
  readonly createdAt: Date;
  
  /** 工作目錄（絕對路徑） */
  readonly cwd: string;
  
  /** Shell 執行檔路徑（如 /bin/zsh） */
  readonly shell: string;
  
  /** 環境變數 */
  readonly env: Record<string, string>;
  
  /** xterm.js 封裝實例 */
  readonly emulator: XtermEmulator;
  
  /** PTY 進程參考 */
  readonly pty: PtyProcess;
  
  /** 統計資訊 */
  stats: TerminalStats;
}

/**
 * 終端統計資訊
 */
export interface TerminalStats {
  /** 已寫入字節數 */
  bytesWritten: number;
  
  /** 已讀取字節數 */
  bytesRead: number;
  
  /** 執行命令次數（Enter 鍵計數） */
  commandCount: number;
}

/**
 * xterm.js 封裝實例
 */
export interface XtermEmulator {
  /** xterm.js Terminal 實例 */
  readonly terminal: Terminal;
  
  /** 已載入的 addons */
  readonly addons: {
    fit: FitAddon;
    webLinks?: WebLinksAddon;
    serialize?: SerializeAddon;
  };
  
  /** 終端容器 DOM 元素 */
  readonly container: HTMLElement;
  
  /** 配置選項 */
  readonly options: ITerminalOptions;
  
  /** 釋放資源 */
  dispose(): void;
}

/**
 * PTY 進程
 */
export interface PtyProcess {
  /** 進程 ID */
  readonly pid: number;
  
  /** Shell 路徑 */
  readonly shell: string;
  
  /** 工作目錄 */
  readonly cwd: string;
  
  /** Python 進程參考 */
  readonly pythonProcess: ChildProcess;
  
  /** 退出碼（null = 運作中） */
  exitCode: number | null;
  
  /** 寫入標準輸入 */
  write(data: string): Promise<void>;
  
  /** 終止進程 */
  kill(signal?: NodeJS.Signals): void;
  
  /** 監聽資料輸出 */
  onData(callback: (data: string) => void): Disposable;
  
  /** 監聽進程退出 */
  onExit(callback: (code: number) => void): Disposable;
  
  /** 監聽錯誤 */
  onError(callback: (error: Error) => void): Disposable;
}

/**
 * 上下文指令定義
 */
export interface ContextCommand {
  /** 指令關鍵字（如 '@cfile'） */
  readonly keyword: string;
  
  /** 解析器函數（返回實際值） */
  readonly resolver: ContextResolver;
  
  /** 說明文字 */
  readonly description: string;
  
  /** 是否啟用 */
  enabled: boolean;
  
  /** 大小寫敏感 */
  caseSensitive: boolean;
}

/**
 * 上下文解析器函數
 * 
 * @param app - Obsidian App 實例
 * @returns 解析後的值（如檔案路徑）
 * @throws TerminalError 解析失敗時拋出錯誤
 */
export type ContextResolver = (app: App) => Promise<string>;

/**
 * 選取範圍參考
 */
export interface SelectionReference {
  /** 檔案 vault 相對路徑 */
  readonly file: string;
  
  /** 檔案系統絕對路徑 */
  readonly filePath: string;
  
  /** 起始行號（1-indexed） */
  readonly startLine: number;
  
  /** 結束行號（1-indexed） */
  readonly endLine: number;
  
  /** 起始列號（0-indexed） */
  readonly startCol: number;
  
  /** 結束列號（0-indexed） */
  readonly endCol: number;
  
  /** 選取的文字內容 */
  readonly text: string;
  
  /** GitHub 風格引用字串（file.md#L10-L15） */
  readonly formatted: string;
}

/**
 * 終端錯誤碼
 */
export enum TerminalErrorCode {
  // PTY 相關
  PTY_SPAWN_FAILED = 'PTY_SPAWN_FAILED',
  PTY_WRITE_FAILED = 'PTY_WRITE_FAILED',
  PTY_UNEXPECTED_EXIT = 'PTY_UNEXPECTED_EXIT',
  
  // 上下文指令相關
  NO_ACTIVE_FILE = 'NO_ACTIVE_FILE',
  INVALID_PATH = 'INVALID_PATH',
  CONTEXT_RESOLVE_FAILED = 'CONTEXT_RESOLVE_FAILED',
  
  // 系統相關
  PYTHON_NOT_FOUND = 'PYTHON_NOT_FOUND',
  FILESYSTEM_ERROR = 'FILESYSTEM_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

/**
 * 終端錯誤
 */
export class TerminalError extends Error {
  constructor(
    public readonly code: TerminalErrorCode,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'TerminalError';
  }
}

/**
 * 事件取消訂閱介面
 */
export interface Disposable {
  dispose(): void;
}
```

---

## Usage Examples

```typescript
// 使用範例 1：建立 TerminalSession
const session: TerminalSession = {
  id: 'uuid-123',
  status: TerminalStatus.RUNNING,
  createdAt: new Date(),
  cwd: '/Users/user/vault',
  shell: '/bin/zsh',
  env: {},
  emulator: terminalEmulator,
  pty: ptyProcess,
  stats: {
    bytesWritten: 0,
    bytesRead: 0,
    commandCount: 0,
  },
};

// 使用範例 2：拋出 TerminalError
if (!activeFile) {
  throw new TerminalError(
    TerminalErrorCode.NO_ACTIVE_FILE,
    '目前沒有開啟的檔案，無法替換 @cfile'
  );
}

// 使用範例 3：監聽 PTY 事件
const disposable = pty.onData((data) => {
  terminal.write(data);
});

// 清理
disposable.dispose();
```

---

## Validation Rules

### TerminalSession

- `id` 必須唯一（使用 UUID v4）
- `cwd` 必須為有效的絕對路徑
- `shell` 必須為可執行檔案
- `status` 轉換必須遵循狀態機規則

### ContextCommand

- `keyword` 不得為空字串
- `keyword` 不得包含空白字元
- `keyword` 在已註冊指令中必須唯一
- `resolver` 必須返回字串或拋出 TerminalError

### SelectionReference

- `startLine` ≤ `endLine`
- `startLine`, `endLine` ≥ 1
- `file` 必須為有效的 vault 路徑

---

## Breaking Changes Policy

**Semantic Versioning**：
- **MAJOR**：不相容的型別變更（如刪除屬性、更改簽名）
- **MINOR**：新增可選屬性、新增型別
- **PATCH**：型別註解修正、說明文字更新

**Deprecation Process**：
1. 標記為 `@deprecated` 並提供替代方案
2. 保留至少一個 MINOR 版本
3. 在下一個 MAJOR 版本中移除
