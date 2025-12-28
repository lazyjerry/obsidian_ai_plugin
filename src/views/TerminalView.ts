/**
 * TerminalView - 終端視圖
 * 
 * @description 在 Obsidian 底部面板顯示終端介面
 * @module views/TerminalView
 */

import { ItemView, WorkspaceLeaf, Notice, Modal, App } from 'obsidian';
import type AITerminalPlugin from '../main';
import { XtermEmulator } from '../terminal/xterm-emulator';
import { PtySession } from '../terminal/pty-session';
import { PathHelper } from '../utils/path-helper';
import { ContextCommandHandler } from '../terminal/context-commands';
import { TerminalStatus, TerminalError, TerminalErrorCode } from '../types';
import * as path from 'node:path';

// 引入 xterm.js CSS
import '@xterm/xterm/css/xterm.css';

/**
 * 視圖類型常數
 */
export const VIEW_TYPE_TERMINAL = 'ai-terminal-view';

/**
 * 安全警告 Modal
 */
class SecurityWarningModal extends Modal {
  private confirmed: boolean = false;
  private onConfirm: () => void;
  
  constructor(app: App, onConfirm: () => void) {
    super(app);
    this.onConfirm = onConfirm;
  }
  
  onOpen(): void {
    const { contentEl } = this;
    
    contentEl.createEl('h2', { text: '⚠️ 安全性警告' });
    
    contentEl.createEl('p', {
      text: '此終端可執行系統命令，具有以下權限：'
    });
    
    const list = contentEl.createEl('ul');
    list.createEl('li', { text: '讀取與寫入系統檔案' });
    list.createEl('li', { text: '執行程式與腳本' });
    list.createEl('li', { text: '存取網路' });
    list.createEl('li', { text: '管理系統進程' });
    
    contentEl.createEl('p', {
      text: '請勿執行不受信任的指令。建議僅在個人開發環境使用。',
      cls: 'ai-terminal-warning-text'
    });
    
    // 確認按鈕
    const buttonContainer = contentEl.createDiv({ cls: 'ai-terminal-modal-buttons' });
    
    const cancelButton = buttonContainer.createEl('button', { text: '取消' });
    cancelButton.addEventListener('click', () => {
      this.close();
    });
    
    const confirmButton = buttonContainer.createEl('button', { 
      text: '我了解風險，繼續使用',
      cls: 'mod-warning'
    });
    confirmButton.addEventListener('click', () => {
      this.confirmed = true;
      this.close();
      this.onConfirm();
    });
  }
  
  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/**
 * TerminalView 類別
 * 
 * 繼承 ItemView，在 Obsidian 底部面板顯示終端介面
 */
export class TerminalView extends ItemView {
  private plugin: AITerminalPlugin;
  private emulator: XtermEmulator | null = null;
  private ptySession: PtySession | null = null;
  private pathHelper: PathHelper;
  private contextHandler: ContextCommandHandler;
  private status: TerminalStatus = TerminalStatus.INITIALIZING;
  private terminalContainer: HTMLElement | null = null;
  private statusBar: HTMLElement | null = null;
  private reconnectDisposable: { dispose: () => void } | null = null;
  
  /** 輸入緩衝區（用於累積完整命令） */
  private inputBuffer: string = '';
  
  constructor(leaf: WorkspaceLeaf, plugin: AITerminalPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.pathHelper = new PathHelper(this.app);
    this.contextHandler = new ContextCommandHandler(this.pathHelper);
  }
  
  /**
   * 視圖類型
   */
  getViewType(): string {
    return VIEW_TYPE_TERMINAL;
  }
  
  /**
   * 顯示名稱
   */
  getDisplayText(): string {
    return 'AI Terminal';
  }
  
  /**
   * 圖示
   */
  getIcon(): string {
    return 'terminal';
  }
  
  /**
   * 視圖開啟時執行
   */
  async onOpen(): Promise<void> {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('ai-terminal-container');
    
    // 建立終端容器
    this.terminalContainer = containerEl.createDiv({ cls: 'ai-terminal-wrapper' });
    
    // 建立狀態列
    this.statusBar = containerEl.createDiv({ cls: 'ai-terminal-statusbar' });
    this.updateStatusBar('初始化中...');
    
    // 檢查安全警告確認
    if (!this.plugin.settings.securityWarningConfirmed) {
      new SecurityWarningModal(this.app, async () => {
        this.plugin.settings.securityWarningConfirmed = true;
        await this.plugin.saveSettings();
        await this.initializeTerminal();
      }).open();
    } else {
      await this.initializeTerminal();
    }
  }
  
  /**
   * 初始化終端
   */
  private async initializeTerminal(): Promise<void> {
    if (!this.terminalContainer) {
      return;
    }
    
    try {
      // 建立 XtermEmulator
      this.emulator = new XtermEmulator({
        fontSize: this.plugin.settings.fontSize,
        fontFamily: this.plugin.settings.fontFamily,
        cursorBlink: this.plugin.settings.cursorBlink,
      });
      
      // 開啟終端 UI
      this.emulator.open(this.terminalContainer);
      
      // 取得工作目錄
      const cwd = this.getWorkingDirectory();
      
      // 取得 Shell
      const shell = this.plugin.settings.shell || this.pathHelper.getDefaultShell();
      
      // 取得腳本路徑（相對於外掛目錄）
      const pluginDir = this.getPluginDirectory();
      const scriptsPath = path.join(pluginDir, 'scripts');
      
      // 建立 PTY Session
      this.ptySession = new PtySession({
        shell,
        cwd,
        pythonExecutable: this.plugin.settings.pythonExecutable,
        scriptsPath,
      });
      
      // 連接終端輸入到 PTY（含上下文指令處理）
      this.emulator.onData((data) => {
        this.handleTerminalInput(data);
      });
      
      // 連接 PTY 輸出到終端
      this.ptySession.onData((data) => {
        this.emulator?.write(data);
      });
      
      // 處理終端大小變化
      this.emulator.onResize(({ cols, rows }) => {
        this.ptySession?.resize(cols, rows);
      });
      
      // 處理 PTY 退出
      this.ptySession.onExit((code) => {
        this.status = TerminalStatus.EXITED;
        this.updateStatusBar(`已退出 (code: ${code})`);
        this.emulator?.writeln(`\r\n\x1b[33m[終端已退出，退出碼: ${code}]\x1b[0m`);
        this.emulator?.writeln(`\x1b[33m按任意鍵重新連線...\x1b[0m`);
        
        // 設定重新連線監聽
        this.setupReconnectListener();
      });
      
      // 處理 PTY 錯誤
      this.ptySession.onError((error) => {
        this.status = TerminalStatus.ERROR;
        this.handleError(error);
      });
      
      // 啟動 PTY
      await this.ptySession.start();
      
      this.status = TerminalStatus.RUNNING;
      this.updateStatusBar(`運作中 - ${cwd}`);
      
    } catch (error) {
      this.status = TerminalStatus.ERROR;
      this.handleError(error);
    }
  }
  
  /**
   * 取得工作目錄
   */
  private getWorkingDirectory(): string {
    // 優先使用當前檔案所在目錄
    const fileDir = this.pathHelper.getCurrentFileDirectory();
    if (fileDir) {
      return fileDir;
    }
    
    // 備用：使用 Vault 根目錄
    return this.pathHelper.getVaultPath();
  }
  
  /**
   * 取得外掛目錄路徑
   */
  private getPluginDirectory(): string {
    const vaultPath = this.pathHelper.getVaultPath();
    return path.join(vaultPath, '.obsidian', 'plugins', this.plugin.manifest.id);
  }
  
  /**
   * 更新狀態列
   */
  private updateStatusBar(text: string): void {
    if (this.statusBar) {
      this.statusBar.textContent = text;
    }
  }
  
  /**
   * 處理終端輸入（含上下文指令處理）
   */
  private handleTerminalInput(data: string): void {
    // 累積輸入到緩衝區
    this.inputBuffer += data;
    
    // 檢查是否為 Enter 鍵（\r 或 \n）
    const isEnter = data === '\r' || data === '\n';
    
    if (isEnter && this.contextHandler.hasContextCommands(this.inputBuffer)) {
      try {
        // 替換上下文指令
        const processedInput = this.contextHandler.replaceContextCommands(this.inputBuffer);
        
        // 清空終端當前行並顯示替換後的指令
        // 先退格清除已輸入的內容
        const backspaces = '\b'.repeat(this.inputBuffer.length - 1);
        const clearLine = ' '.repeat(this.inputBuffer.length - 1);
        this.emulator?.write(backspaces + clearLine + backspaces);
        
        // 顯示替換後的指令（去除最後的換行）
        const displayInput = processedInput.replace(/[\r\n]+$/, '');
        this.emulator?.write(displayInput + '\r\n');
        
        // 發送替換後的指令到 PTY
        this.ptySession?.write(processedInput);
        
        // 清空緩衝區
        this.inputBuffer = '';
        
      } catch (error) {
        // 替換失敗（例如無開啟檔案），顯示錯誤訊息
        if (error instanceof TerminalError) {
          if (error.code === TerminalErrorCode.NO_ACTIVE_FILE) {
            new Notice('錯誤：目前沒有開啟的檔案，無法替換 @cfile');
          } else {
            new Notice(`錯誤：${error.message}`);
          }
        }
        // 仍然發送原始輸入
        this.ptySession?.write(this.inputBuffer);
        this.inputBuffer = '';
      }
    } else if (isEnter) {
      // 無上下文指令，直接發送
      this.ptySession?.write(this.inputBuffer);
      this.inputBuffer = '';
    } else {
      // 非 Enter 鍵，直接傳遞到 PTY
      this.ptySession?.write(data);
      
      // 如果是 Backspace，需要從緩衝區移除最後一個字元
      if (data === '\x7f' || data === '\b') {
        this.inputBuffer = this.inputBuffer.slice(0, -2); // 移除 backspace 和前一個字元
      }
    }
  }
  
  /**
   * 處理錯誤
   */
  private handleError(error: unknown): void {
    let message = '未知錯誤';
    
    if (error instanceof TerminalError) {
      switch (error.code) {
        case TerminalErrorCode.PTY_SPAWN_FAILED:
          message = `終端啟動失敗：${error.message}\n請確認 Python 3.10+ 已安裝`;
          break;
        case TerminalErrorCode.INVALID_PATH:
          message = `無效的路徑：${error.message}`;
          break;
        case TerminalErrorCode.PYTHON_ERROR:
          message = `Python 錯誤：${error.message}`;
          break;
        case TerminalErrorCode.CONNECTION_CLOSED:
          message = `連線已斷開：${error.message}`;
          break;
        default:
          message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }
    
    this.updateStatusBar(`錯誤: ${message}`);
    new Notice(`AI Terminal 錯誤: ${message}`);
    
    // 在終端顯示錯誤
    this.emulator?.writeln(`\r\n\x1b[31m[錯誤] ${message}\x1b[0m`);
  }
  
  /**
   * 聚焦終端
   */
  focus(): void {
    this.emulator?.focus();
  }
  
  /**
   * 設定重新連線監聽器
   */
  private setupReconnectListener(): void {
    // 清除之前的監聽器
    if (this.reconnectDisposable) {
      this.reconnectDisposable.dispose();
      this.reconnectDisposable = null;
    }
    
    // 監聽任意按鍵以重新連線
    if (this.emulator) {
      this.reconnectDisposable = this.emulator.onData(() => {
        // 移除監聽器
        if (this.reconnectDisposable) {
          this.reconnectDisposable.dispose();
          this.reconnectDisposable = null;
        }
        
        // 重新連線
        this.reconnect();
      });
    }
  }
  
  /**
   * 重新連線終端
   */
  private async reconnect(): Promise<void> {
    this.updateStatusBar('重新連線中...');
    this.emulator?.writeln(`\r\n\x1b[36m[正在重新連線...]\x1b[0m`);
    
    // 清理舊的 PTY Session
    if (this.ptySession) {
      this.ptySession.dispose();
      this.ptySession = null;
    }
    
    // 清空終端畫面
    this.emulator?.clear();
    
    // 重新初始化終端
    await this.initializeTerminal();
  }
  
  /**
   * 視圖關閉時執行
   */
  async onClose(): Promise<void> {
    // 清理重新連線監聽器
    if (this.reconnectDisposable) {
      this.reconnectDisposable.dispose();
      this.reconnectDisposable = null;
    }
    
    // 清理 PTY Session
    if (this.ptySession) {
      this.ptySession.dispose();
      this.ptySession = null;
    }
    
    // 清理 XtermEmulator
    if (this.emulator) {
      this.emulator.dispose();
      this.emulator = null;
    }
    
    this.terminalContainer = null;
    this.statusBar = null;
  }
}
