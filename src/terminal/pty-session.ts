/**
 * PTY Session - 單一 PTY 連線管理（骨架）
 * 
 * @description 管理與 Python PTY 腳本的通訊
 * @module terminal/pty-session
 */

import { spawn, ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import { Platform } from 'obsidian';
import { 
  PtyProcess, 
  Disposable, 
  TerminalError, 
  TerminalErrorCode 
} from '../types';

/**
 * PTY Session 配置選項
 */
export interface PtySessionOptions {
  /** Shell 執行檔路徑 */
  shell: string;
  
  /** 工作目錄 */
  cwd: string;
  
  /** 環境變數 */
  env?: Record<string, string>;
  
  /** Python 執行檔路徑 */
  pythonExecutable?: string;
  
  /** PTY 腳本目錄路徑 */
  scriptsPath: string;
}

/**
 * PTY Session 類別
 * 
 * 封裝與 Python PTY 腳本的通訊，提供統一的 PTY 介面
 */
export class PtySession implements PtyProcess {
  private _pythonProcess: ChildProcess | null = null;
  private _pid: number = -1;
  private _exitCode: number | null = null;
  private _dataListeners: Array<(data: string) => void> = [];
  private _exitListeners: Array<(code: number) => void> = [];
  private _errorListeners: Array<(error: Error) => void> = [];
  private _disposed: boolean = false;
  
  constructor(
    private readonly options: PtySessionOptions
  ) {}
  
  /**
   * 進程 ID
   */
  get pid(): number {
    return this._pid;
  }
  
  /**
   * Shell 路徑
   */
  get shell(): string {
    return this.options.shell;
  }
  
  /**
   * 工作目錄
   */
  get cwd(): string {
    return this.options.cwd;
  }
  
  /**
   * Python 進程參考
   */
  get pythonProcess(): ChildProcess {
    if (!this._pythonProcess) {
      throw new TerminalError(
        TerminalErrorCode.CONNECTION_CLOSED,
        'PTY 進程尚未啟動'
      );
    }
    return this._pythonProcess;
  }
  
  /**
   * 退出碼
   */
  get exitCode(): number | null {
    return this._exitCode;
  }
  
  set exitCode(value: number | null) {
    this._exitCode = value;
  }
  
  /**
   * 啟動 PTY 進程
   */
  async start(): Promise<void> {
    if (this._disposed) {
      throw new TerminalError(
        TerminalErrorCode.CONNECTION_CLOSED,
        'PTY Session 已被銷毀'
      );
    }
    
    const pythonExecutable = this.options.pythonExecutable || 'python3';
    const ptyScript = Platform.isWin 
      ? path.join(this.options.scriptsPath, 'windows_pty.py')
      : path.join(this.options.scriptsPath, 'unix_pty.py');
    
    try {
      this._pythonProcess = spawn(
        pythonExecutable,
        [ptyScript, this.options.shell, this.options.cwd],
        {
          env: {
            ...process.env,
            ...this.options.env,
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
      
      // 處理 stdout（終端輸出）
      this._pythonProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        
        // 嘗試解析啟動訊息
        try {
          const msg = JSON.parse(text);
          if (msg.pid && msg.status === 'running') {
            this._pid = msg.pid;
            return;
          }
        } catch {
          // 不是 JSON，正常終端輸出
        }
        
        this._dataListeners.forEach(listener => listener(text));
      });
      
      // 處理 stderr（錯誤與狀態訊息）
      this._pythonProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        
        // 嘗試解析退出訊息
        try {
          const msg = JSON.parse(text);
          if (msg.status === 'exited') {
            this._exitCode = msg.exitCode ?? 0;
            this._exitListeners.forEach(listener => listener(this._exitCode!));
            return;
          }
          if (msg.error) {
            this._errorListeners.forEach(listener => 
              listener(new TerminalError(TerminalErrorCode.PTY_SPAWN_FAILED, msg.error))
            );
            return;
          }
        } catch {
          // 不是 JSON，可能是 shell 的 stderr 輸出
          this._dataListeners.forEach(listener => listener(text));
        }
      });
      
      // 處理進程退出
      this._pythonProcess.on('close', (code) => {
        this._exitCode = code ?? 0;
        this._exitListeners.forEach(listener => listener(this._exitCode!));
      });
      
      // 處理錯誤
      this._pythonProcess.on('error', (error) => {
        this._errorListeners.forEach(listener => 
          listener(new TerminalError(TerminalErrorCode.PTY_SPAWN_FAILED, error.message, error))
        );
      });
      
    } catch (error) {
      throw new TerminalError(
        TerminalErrorCode.PTY_SPAWN_FAILED,
        `無法啟動 PTY: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * 寫入資料到 PTY stdin
   */
  async write(data: string): Promise<void> {
    if (!this._pythonProcess?.stdin) {
      throw new TerminalError(
        TerminalErrorCode.CONNECTION_CLOSED,
        'PTY stdin 不可用'
      );
    }
    
    return new Promise((resolve, reject) => {
      this._pythonProcess!.stdin!.write(data, 'utf-8', (error) => {
        if (error) {
          reject(new TerminalError(
            TerminalErrorCode.CONNECTION_CLOSED,
            `寫入失敗: ${error.message}`,
            error
          ));
        } else {
          resolve();
        }
      });
    });
  }
  
  /**
   * 調整終端大小
   */
  resize(cols: number, rows: number): void {
    if (!this._pythonProcess?.stdin) {
      return;
    }
    
    // 發送特殊控制序列給 Python 腳本
    const resizeCommand = `\x1b[RESIZE:${rows},${cols}]`;
    this._pythonProcess.stdin.write(resizeCommand, 'utf-8');
  }
  
  /**
   * 終止進程
   */
  kill(signal: NodeJS.Signals = 'SIGTERM'): void {
    if (this._pythonProcess && !this._disposed) {
      this._pythonProcess.kill(signal);
    }
  }
  
  /**
   * 監聽資料輸出
   */
  onData(callback: (data: string) => void): Disposable {
    this._dataListeners.push(callback);
    return {
      dispose: () => {
        const index = this._dataListeners.indexOf(callback);
        if (index !== -1) {
          this._dataListeners.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * 監聽進程退出
   */
  onExit(callback: (code: number) => void): Disposable {
    this._exitListeners.push(callback);
    return {
      dispose: () => {
        const index = this._exitListeners.indexOf(callback);
        if (index !== -1) {
          this._exitListeners.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * 監聽錯誤
   */
  onError(callback: (error: Error) => void): Disposable {
    this._errorListeners.push(callback);
    return {
      dispose: () => {
        const index = this._errorListeners.indexOf(callback);
        if (index !== -1) {
          this._errorListeners.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * 銷毀 Session
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }
    
    // 先終止進程（在設定 _disposed 之前）
    if (this._pythonProcess) {
      this._pythonProcess.kill('SIGTERM');
    }
    
    this._disposed = true;
    this._dataListeners = [];
    this._exitListeners = [];
    this._errorListeners = [];
    this._pythonProcess = null;
  }
}
