/**
 * AI Terminal Integration - 核心型別定義
 * 
 * @description 定義終端整合功能的核心資料型別，被所有模組共用
 * @module types
 */

import type { ChildProcess } from 'node:child_process';

// ============================================================================
// 終端狀態
// ============================================================================

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

// ============================================================================
// 終端統計
// ============================================================================

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

// ============================================================================
// 終端連線會話
// ============================================================================

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
  
  /** 統計資訊 */
  stats: TerminalStats;
  
  /** 銷毀會話並釋放資源 */
  dispose(): void;
}

// ============================================================================
// PTY 進程
// ============================================================================

/**
 * PTY 進程介面
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
  
  /** 調整終端大小 */
  resize(cols: number, rows: number): void;
  
  /** 終止進程 */
  kill(signal?: NodeJS.Signals): void;
  
  /** 監聽資料輸出 */
  onData(callback: (data: string) => void): Disposable;
  
  /** 監聽進程退出 */
  onExit(callback: (code: number) => void): Disposable;
  
  /** 監聯錯誤 */
  onError(callback: (error: Error) => void): Disposable;
}

// ============================================================================
// 上下文指令
// ============================================================================

/**
 * 上下文指令解析器函數型別
 */
export type ContextResolver = () => string | Promise<string>;

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
}

// ============================================================================
// 選取範圍參考
// ============================================================================

/**
 * 選取範圍資訊
 */
export interface SelectionRange {
  /** 起始行號（1-based） */
  startLine: number;
  
  /** 結束行號（1-based） */
  endLine: number;
  
  /** 是否為單行選取 */
  isSingleLine: boolean;
}

/**
 * 選取範圍參考
 */
export interface SelectionReference {
  /** 檔案路徑 */
  filePath: string;
  
  /** 選取範圍 */
  range: SelectionRange;
  
  /** 格式化後的參考字串（如 file.md#L10-L15） */
  formatted: string;
}

// ============================================================================
// 外掛設定
// ============================================================================

/**
 * 外掛設定介面
 */
export interface AITerminalSettings {
  /** Shell 路徑（空字串 = 使用系統預設） */
  shell: string;
  
  /** Python 執行檔路徑 */
  pythonExecutable: string;
  
  /** 終端字體大小 */
  fontSize: number;
  
  /** 終端字體家族 */
  fontFamily: string;
  
  /** 是否啟用游標閃爍 */
  cursorBlink: boolean;
  
  /** 是否已確認安全警告 */
  securityWarningConfirmed: boolean;
  
  /** 啟用的上下文指令 */
  enabledContextCommands: string[];
}

/**
 * 預設設定值
 */
export const DEFAULT_SETTINGS: AITerminalSettings = {
  shell: '',
  pythonExecutable: 'python3',
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  cursorBlink: true,
  securityWarningConfirmed: false,
  enabledContextCommands: ['@cfile', '@folder'],
};

// ============================================================================
// 錯誤處理
// ============================================================================

/**
 * 終端錯誤碼
 */
export enum TerminalErrorCode {
  /** PTY 進程啟動失敗 */
  PTY_SPAWN_FAILED = 'PTY_SPAWN_FAILED',
  
  /** 無效的工作目錄 */
  INVALID_PATH = 'INVALID_PATH',
  
  /** Python 環境錯誤 */
  PYTHON_ERROR = 'PYTHON_ERROR',
  
  /** 連線已斷開 */
  CONNECTION_CLOSED = 'CONNECTION_CLOSED',
  
  /** 未知錯誤 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  
  /** 無開啟的檔案 */
  NO_ACTIVE_FILE = 'NO_ACTIVE_FILE',
}

/**
 * 終端錯誤類別
 */
export class TerminalError extends Error {
  constructor(
    public readonly code: TerminalErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'TerminalError';
  }
}

// ============================================================================
// 工具型別
// ============================================================================

/**
 * 可銷毀介面
 */
export interface Disposable {
  dispose(): void;
}

/**
 * 事件處理器
 */
export type EventHandler<T> = (event: T) => void;

/**
 * 建立終端選項
 */
export interface CreateSessionOptions {
  /** 工作目錄（絕對路徑） */
  cwd: string;
  
  /** DOM 容器元素 */
  container: HTMLElement;
  
  /** Shell 路徑（可選，預設：系統預設 shell） */
  shell?: string;
  
  /** 環境變數（可選，預設：繼承當前環境） */
  env?: Record<string, string>;
  
  /** Python 執行檔路徑（可選，預設：'python3'） */
  pythonExecutable?: string;
}
