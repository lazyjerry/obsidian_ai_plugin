# PTY Manager API Contract

**File**: `src/terminal/pty-manager.ts`  
**Purpose**: PTY 連線管理器 API 定義

---

## Interface Definition

```typescript
import { App } from 'obsidian';
import { TerminalSession, PtyProcess } from '../types';
import { Terminal } from '@xterm/xterm';

/**
 * PTY 管理器介面
 * 
 * 負責建立、管理、銷毀 PTY 連線實例
 */
export interface PtyManagerAPI {
  /**
   * 建立新的終端連線
   * 
   * @param options - 建立選項
   * @returns Promise<TerminalSession>
   * @throws TerminalError 建立失敗時拋出
   */
  create(options: CreateSessionOptions): Promise<TerminalSession>;
  
  /**
   * 取得所有活躍的終端連線
   * 
   * @returns TerminalSession[]
   */
  getAllSessions(): TerminalSession[];
  
  /**
   * 根據 ID 取得終端連線
   * 
   * @param id - 連線 ID
   * @returns TerminalSession | null
   */
  getSession(id: string): TerminalSession | null;
  
  /**
   * 銷毀終端連線
   * 
   * @param id - 連線 ID
   * @returns Promise<void>
   */
  destroy(id: string): Promise<void>;
  
  /**
   * 銷毀所有終端連線
   * 
   * @returns Promise<void>
   */
  destroyAll(): Promise<void>;
}

/**
 * 建立終端連線選項
 */
export interface CreateSessionOptions {
  /** 工作目錄（絕對路徑） */
  cwd: string;
  
  /** xterm.js Terminal 實例 */
  terminal: Terminal;
  
  /** Shell 路徑（可選，預設：系統預設 shell） */
  shell?: string;
  
  /** 環境變數（可選，預設：繼承當前環境） */
  env?: Record<string, string>;
  
  /** Python 執行檔路徑（可選，預設：'python3'） */
  pythonExecutable?: string;
}

/**
 * PTY 進程選項
 */
export interface PtyProcessOptions {
  /** Shell 執行檔路徑 */
  shell: string;
  
  /** 工作目錄 */
  cwd: string;
  
  /** 環境變數 */
  env: Record<string, string>;
  
  /** Python 執行檔路徑 */
  pythonExecutable: string;
  
  /** PTY 腳本路徑 */
  ptyScript: string;
}
```

---

## Usage Examples

```typescript
// 範例 1：建立終端連線
const manager = new PtyManager(app);

const session = await manager.create({
  cwd: '/Users/user/vault',
  terminal: xtermInstance,
  shell: '/bin/zsh',
});

console.log(session.id);  // uuid-123

// 範例 2：取得所有連線
const sessions = manager.getAllSessions();
console.log(`Active sessions: ${sessions.length}`);

// 範例 3：銷毀連線
await manager.destroy(session.id);

// 範例 4：銷毀所有連線
await manager.destroyAll();
```

---

## Error Handling

```typescript
try {
  const session = await manager.create({ cwd: '/invalid/path', terminal });
} catch (error) {
  if (error instanceof TerminalError) {
    switch (error.code) {
      case TerminalErrorCode.PTY_SPAWN_FAILED:
        new Notice('終端啟動失敗：請確認 Python 已安裝');
        break;
      case TerminalErrorCode.INVALID_PATH:
        new Notice('工作目錄無效');
        break;
    }
  }
}
```

---

## Implementation Requirements

### PtyManager Class

```typescript
export class PtyManager implements PtyManagerAPI {
  private sessions: Map<string, TerminalSession> = new Map();
  private contextHandler: ContextCommandHandler;
  
  constructor(private app: App) {
    this.contextHandler = new ContextCommandHandler(app);
  }
  
  async create(options: CreateSessionOptions): Promise<TerminalSession> {
    // 1. 驗證 cwd 存在性
    const validation = validatePath(options.cwd);
    if (!validation.valid) {
      throw new TerminalError(
        TerminalErrorCode.INVALID_PATH,
        validation.error!
      );
    }
    
    // 2. 建立 PtyProcess
    const pty = await this.spawnPty({
      shell: options.shell || this.getDefaultShell(),
      cwd: options.cwd,
      env: options.env || process.env,
      pythonExecutable: options.pythonExecutable || 'python3',
      ptyScript: this.getPtyScriptPath(),
    });
    
    // 3. 建立 XtermEmulator
    const emulator = new XtermEmulator(
      options.terminal.getElement(),
      { /* options */ }
    );
    
    // 4. 建立 TerminalSession
    const session: TerminalSession = {
      id: generateUUID(),
      status: TerminalStatus.INITIALIZING,
      createdAt: new Date(),
      cwd: options.cwd,
      shell: pty.shell,
      env: options.env || {},
      emulator,
      pty,
      stats: { bytesWritten: 0, bytesRead: 0, commandCount: 0 },
    };
    
    // 5. 連接資料流
    this.connectDataFlow(session);
    
    // 6. 更新狀態
    session.status = TerminalStatus.RUNNING;
    
    // 7. 儲存 session
    this.sessions.set(session.id, session);
    
    return session;
  }
  
  private connectDataFlow(session: TerminalSession): void {
    const { terminal } = session.emulator;
    const { pty } = session;
    
    // 終端 → PTY（使用者輸入）
    terminal.onData(async (data) => {
      const { data: processedData, shouldExecute } = 
        await this.contextHandler.handleInput(data);
      
      if (shouldExecute && processedData) {
        await pty.write(processedData);
        session.stats.bytesWritten += processedData.length;
      }
    });
    
    // PTY → 終端（程式輸出）
    pty.onData((data) => {
      terminal.write(data);
      session.stats.bytesRead += data.length;
    });
    
    // PTY 退出處理
    pty.onExit((code) => {
      session.status = TerminalStatus.EXITED;
      terminal.write(`\r\n[Process exited with code ${code}]\r\n`);
    });
  }
  
  // ... 其他方法實作
}
```

---

## Contract Verification

**TypeScript 型別檢查**：
```bash
npx tsc --noEmit --strict
```

**單元測試**：
```typescript
describe('PtyManager', () => {
  it('應能建立終端連線', async () => {
    const manager = new PtyManager(mockApp);
    const session = await manager.create({ cwd: '/tmp', terminal: mockTerminal });
    
    expect(session.id).toBeDefined();
    expect(session.status).toBe(TerminalStatus.RUNNING);
  });
  
  it('當路徑無效時應拋出錯誤', async () => {
    await expect(manager.create({ cwd: '/invalid', terminal: mockTerminal }))
      .rejects.toThrow(TerminalError);
  });
});
```
