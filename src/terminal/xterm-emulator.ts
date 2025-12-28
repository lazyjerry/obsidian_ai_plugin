/**
 * XtermEmulator - xterm.js 終端封裝（骨架）
 * 
 * @description 封裝 xterm.js Terminal 實例與必要 addons
 * @module terminal/xterm-emulator
 */

import { Terminal, ITerminalOptions, IDisposable } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Disposable } from '../types';

/**
 * XtermEmulator 配置選項
 */
export interface XtermEmulatorOptions {
  /** 字體大小 */
  fontSize?: number;
  
  /** 字體家族 */
  fontFamily?: string;
  
  /** 是否啟用游標閃爍 */
  cursorBlink?: boolean;
  
  /** 終端行數 */
  rows?: number;
  
  /** 終端列數 */
  cols?: number;
  
  /** 是否啟用連結偵測 */
  enableWebLinks?: boolean;
}

/**
 * 預設配置
 */
const DEFAULT_OPTIONS: XtermEmulatorOptions = {
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  cursorBlink: true,
  rows: 24,
  cols: 80,
  enableWebLinks: true,
};

/**
 * XtermEmulator 類別
 * 
 * 封裝 xterm.js 與 addons，提供統一的終端 UI 介面
 */
export class XtermEmulator {
  private _terminal: Terminal;
  private _fitAddon: FitAddon;
  private _webLinksAddon: WebLinksAddon | null = null;
  private _container: HTMLElement | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _disposed: boolean = false;
  private _disposables: IDisposable[] = [];
  
  constructor(private readonly options: XtermEmulatorOptions = {}) {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    
    // 建立 xterm.js Terminal 實例
    // 注意：xterm.js 5.x 中 rows/cols 需要透過 resize() 設定
    const terminalOptions: ITerminalOptions = {
      fontSize: mergedOptions.fontSize,
      fontFamily: mergedOptions.fontFamily,
      cursorBlink: mergedOptions.cursorBlink,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        cursorAccent: '#1e1e1e',
        // selectionBackground 在 xterm.js 5.x 中使用
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
      convertEol: true,
      scrollback: 1000,
      allowProposedApi: true,
      // 啟用選取功能
      allowTransparency: true,
      rightClickSelectsWord: true,
      // 啟用滑鼠支援（選取文字）
      windowsMode: false,
    };
    
    this._terminal = new Terminal(terminalOptions);
    
    // 載入 FitAddon
    this._fitAddon = new FitAddon();
    this._terminal.loadAddon(this._fitAddon);
    
    // 載入 WebLinksAddon（可選）
    if (mergedOptions.enableWebLinks) {
      this._webLinksAddon = new WebLinksAddon();
      this._terminal.loadAddon(this._webLinksAddon);
    }
  }
  
  /**
   * xterm.js Terminal 實例
   */
  get terminal(): Terminal {
    return this._terminal;
  }
  
  /**
   * FitAddon 實例
   */
  get fitAddon(): FitAddon {
    return this._fitAddon;
  }
  
  /**
   * 終端容器元素
   */
  get container(): HTMLElement | null {
    return this._container;
  }
  
  /**
   * 當前終端尺寸
   */
  get dimensions(): { cols: number; rows: number } {
    return {
      cols: this._terminal.cols,
      rows: this._terminal.rows,
    };
  }
  
  /**
   * 開啟終端並綁定到 DOM 容器
   */
  open(container: HTMLElement): void {
    if (this._disposed) {
      throw new Error('XtermEmulator 已被銷毀');
    }
    
    this._container = container;
    this._terminal.open(container);
    
    // 初始調整大小
    this.fit();
    
    // 設定 ResizeObserver 監聯容器大小變化
    this._resizeObserver = new ResizeObserver(() => {
      this.fit();
    });
    this._resizeObserver.observe(container);
    
    // 設定選取複製功能
    this.setupCopyOnSelect();
    
    // 聚焦終端
    this._terminal.focus();
  }
  
  /**
   * 複製文字到剪貼簿（相容 Electron/Obsidian 環境）
   */
  private async copyToClipboard(text: string): Promise<boolean> {
    try {
      // 優先使用 Electron 的 clipboard 模組
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { clipboard } = require('electron');
      clipboard.writeText(text);
      return true;
    } catch {
      // Electron clipboard 不可用，嘗試 navigator.clipboard
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // 所有方法都失敗，使用 document.execCommand 作為備用
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          textArea.style.top = '-9999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const result = document.execCommand('copy');
          document.body.removeChild(textArea);
          return result;
        } catch {
          return false;
        }
      }
    }
  }
  
  /**
   * 從剪貼簿讀取文字（相容 Electron/Obsidian 環境）
   */
  private async readFromClipboard(): Promise<string> {
    try {
      // 優先使用 Electron 的 clipboard 模組
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { clipboard } = require('electron');
      return clipboard.readText() || '';
    } catch {
      // Electron clipboard 不可用，嘗試 navigator.clipboard
      try {
        return await navigator.clipboard.readText();
      } catch {
        return '';
      }
    }
  }
  
  /**
   * 設定選取時自動複製到剪貼簿
   */
  private setupCopyOnSelect(): void {
    // 監聽選取變化事件
    const selectionDisposable = this._terminal.onSelectionChange(() => {
      const selection = this._terminal.getSelection();
      if (selection) {
        // 選取後自動複製到剪貼簿
        this.copyToClipboard(selection);
      }
    });
    this._disposables.push(selectionDisposable);
    
    // 支援 Ctrl+C 複製（當有選取時）和 Ctrl+V 貼上
    this._terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      // Ctrl+Shift+C 或 Cmd+C（Mac）複製
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && this._terminal.hasSelection()) {
        const selection = this._terminal.getSelection();
        if (selection) {
          this.copyToClipboard(selection);
        }
        return false; // 阻止預設行為（不發送 SIGINT）
      }
      
      // Ctrl+Shift+V 或 Cmd+V（Mac）貼上
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        this.readFromClipboard().then((text) => {
          if (text) {
            // 發送貼上的文字到終端
            this._terminal.paste(text);
          }
        });
        return false;
      }
      
      return true; // 允許其他按鍵正常處理
    });
  }
  
  /**
   * 調整終端大小以適應容器
   */
  fit(): void {
    if (!this._container || this._disposed) {
      return;
    }
    
    try {
      this._fitAddon.fit();
    } catch {
      // 忽略 fit 錯誤（容器可能尚未準備好）
    }
  }
  
  /**
   * 寫入資料到終端
   */
  write(data: string): void {
    if (!this._disposed) {
      this._terminal.write(data);
    }
  }
  
  /**
   * 寫入一行資料
   */
  writeln(data: string): void {
    if (!this._disposed) {
      this._terminal.writeln(data);
    }
  }
  
  /**
   * 清空終端
   */
  clear(): void {
    if (!this._disposed) {
      this._terminal.clear();
    }
  }
  
  /**
   * 聚焦終端
   */
  focus(): void {
    if (!this._disposed) {
      this._terminal.focus();
    }
  }
  
  /**
   * 監聽使用者輸入
   */
  onData(callback: (data: string) => void): Disposable {
    const disposable = this._terminal.onData(callback);
    this._disposables.push(disposable);
    return {
      dispose: () => disposable.dispose()
    };
  }
  
  /**
   * 監聽按鍵事件
   */
  onKey(callback: (e: { key: string; domEvent: KeyboardEvent }) => void): Disposable {
    const disposable = this._terminal.onKey(callback);
    this._disposables.push(disposable);
    return {
      dispose: () => disposable.dispose()
    };
  }
  
  /**
   * 監聯終端大小變化
   */
  onResize(callback: (e: { cols: number; rows: number }) => void): Disposable {
    const disposable = this._terminal.onResize(callback);
    this._disposables.push(disposable);
    return {
      dispose: () => disposable.dispose()
    };
  }
  
  /**
   * 銷毀終端並釋放資源
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }
    
    this._disposed = true;
    
    // 清理 ResizeObserver
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    
    // 清理所有事件監聽器
    this._disposables.forEach(d => d.dispose());
    this._disposables = [];
    
    // 銷毀 addons
    this._fitAddon.dispose();
    if (this._webLinksAddon) {
      this._webLinksAddon.dispose();
    }
    
    // 銷毀 Terminal
    this._terminal.dispose();
    
    this._container = null;
  }
}
