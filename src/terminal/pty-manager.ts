/**
 * PTY Manager - PTY 連線管理器
 * 
 * @description 管理多個 PTY 連線實例
 * @module terminal/pty-manager
 */

import { App } from 'obsidian';
import { 
  TerminalSession, 
  TerminalStatus, 
  TerminalStats,
  CreateSessionOptions,
  Disposable,
} from '../types';
import { PtySession, PtySessionOptions } from './pty-session';
import { XtermEmulator, XtermEmulatorOptions } from './xterm-emulator';
import { PathHelper } from '../utils/path-helper';

/**
 * 產生 UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 終端會話實作
 */
class TerminalSessionImpl implements TerminalSession {
  readonly id: string;
  status: TerminalStatus = TerminalStatus.INITIALIZING;
  readonly createdAt: Date;
  readonly cwd: string;
  readonly shell: string;
  readonly env: Record<string, string>;
  stats: TerminalStats = {
    bytesWritten: 0,
    bytesRead: 0,
    commandCount: 0,
  };
  
  private _emulator: XtermEmulator;
  private _pty: PtySession;
  private _disposables: Disposable[] = [];
  
  constructor(
    options: {
      id: string;
      cwd: string;
      shell: string;
      env: Record<string, string>;
      emulator: XtermEmulator;
      pty: PtySession;
    }
  ) {
    this.id = options.id;
    this.createdAt = new Date();
    this.cwd = options.cwd;
    this.shell = options.shell;
    this.env = options.env;
    this._emulator = options.emulator;
    this._pty = options.pty;
    
    // 連接終端輸入到 PTY
    this._disposables.push(
      this._emulator.onData((data) => {
        this._pty.write(data);
        this.stats.bytesWritten += data.length;
        
        // 計算命令次數（Enter 鍵）
        if (data.includes('\r') || data.includes('\n')) {
          this.stats.commandCount++;
        }
      })
    );
    
    // 連接 PTY 輸出到終端
    this._disposables.push(
      this._pty.onData((data) => {
        this._emulator.write(data);
        this.stats.bytesRead += data.length;
      })
    );
    
    // 處理終端大小變化
    this._disposables.push(
      this._emulator.onResize(({ cols, rows }) => {
        this._pty.resize(cols, rows);
      })
    );
    
    // 處理 PTY 退出
    this._disposables.push(
      this._pty.onExit((code) => {
        this.status = TerminalStatus.EXITED;
      })
    );
    
    // 處理 PTY 錯誤
    this._disposables.push(
      this._pty.onError((error) => {
        this.status = TerminalStatus.ERROR;
      })
    );
  }
  
  /**
   * 取得 XtermEmulator 實例
   */
  get emulator(): XtermEmulator {
    return this._emulator;
  }
  
  /**
   * 取得 PtySession 實例
   */
  get pty(): PtySession {
    return this._pty;
  }
  
  /**
   * 銷毀會話
   */
  dispose(): void {
    // 清理事件監聽器
    this._disposables.forEach(d => d.dispose());
    this._disposables = [];
    
    // 銷毀 PTY
    this._pty.dispose();
    
    // 銷毀 Emulator
    this._emulator.dispose();
    
    this.status = TerminalStatus.EXITED;
  }
}

/**
 * PTY Manager API 介面
 */
export interface PtyManagerAPI {
  create(options: CreateSessionOptions): Promise<TerminalSession>;
  getAllSessions(): TerminalSession[];
  getSession(id: string): TerminalSession | null;
  destroy(id: string): Promise<void>;
  destroyAll(): Promise<void>;
}

/**
 * PTY Manager 類別
 */
export class PtyManager implements PtyManagerAPI {
  private sessions: Map<string, TerminalSessionImpl> = new Map();
  private pathHelper: PathHelper;
  
  constructor(
    private readonly app: App,
    private readonly scriptsPath: string,
    private readonly emulatorOptions?: XtermEmulatorOptions
  ) {
    this.pathHelper = new PathHelper(app);
  }
  
  /**
   * 建立新的終端連線
   */
  async create(options: CreateSessionOptions): Promise<TerminalSession> {
    const id = generateUUID();
    
    // 建立 XtermEmulator
    const emulator = new XtermEmulator({
      ...this.emulatorOptions,
    });
    
    // 開啟終端 UI
    emulator.open(options.container);
    
    // 取得 Shell
    const shell = options.shell || this.pathHelper.getDefaultShell();
    
    // 建立 PTY Session
    const ptyOptions: PtySessionOptions = {
      shell,
      cwd: options.cwd,
      env: options.env,
      pythonExecutable: options.pythonExecutable || 'python3',
      scriptsPath: this.scriptsPath,
    };
    
    const pty = new PtySession(ptyOptions);
    
    // 建立會話
    const session = new TerminalSessionImpl({
      id,
      cwd: options.cwd,
      shell,
      env: options.env || {},
      emulator,
      pty,
    });
    
    // 啟動 PTY
    await pty.start();
    session.status = TerminalStatus.RUNNING;
    
    // 儲存會話
    this.sessions.set(id, session);
    
    return session;
  }
  
  /**
   * 取得所有活躍的終端連線
   */
  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }
  
  /**
   * 根據 ID 取得終端連線
   */
  getSession(id: string): TerminalSession | null {
    return this.sessions.get(id) || null;
  }
  
  /**
   * 銷毀終端連線
   */
  async destroy(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.dispose();
      this.sessions.delete(id);
    }
  }
  
  /**
   * 銷毀所有終端連線
   */
  async destroyAll(): Promise<void> {
    for (const [id, session] of this.sessions) {
      session.dispose();
    }
    this.sessions.clear();
  }
}
