/**
 * 路徑處理工具
 * 
 * @description 提供路徑解析、轉義與處理功能
 * @module utils/path-helper
 */

import { App, TFile, Platform } from 'obsidian';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * 路徑處理 API 介面
 */
export interface PathHelperAPI {
  /** 取得當前檔案的絕對路徑 */
  getCurrentFilePath(): string | null;
  
  /** 取得當前檔案所在目錄 */
  getCurrentFileDirectory(): string | null;
  
  /** 取得 Vault 根目錄路徑 */
  getVaultPath(): string;
  
  /** 轉義路徑（處理空格、特殊字元） */
  escapePath(filePath: string): string;
  
  /** 取得系統預設 Shell */
  getDefaultShell(): string;
  
  /** 取得 Python 執行檔路徑 */
  getPythonExecutable(): string;
}

/**
 * 路徑處理工具類別
 */
export class PathHelper implements PathHelperAPI {
  constructor(private readonly app: App) {}
  
  /**
   * 取得當前開啟檔案的絕對路徑
   * 
   * @returns 檔案絕對路徑，若無開啟檔案則返回 null
   */
  getCurrentFilePath(): string | null {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return null;
    }
    
    return this.getAbsolutePath(activeFile.path);
  }
  
  /**
   * 取得當前開啟檔案所在的目錄
   * 
   * @returns 目錄絕對路徑，若無開啟檔案則返回 null
   */
  getCurrentFileDirectory(): string | null {
    const filePath = this.getCurrentFilePath();
    if (!filePath) {
      return null;
    }
    
    return path.dirname(filePath);
  }
  
  /**
   * 取得 Vault 根目錄的絕對路徑
   * 
   * @returns Vault 根目錄絕對路徑
   */
  getVaultPath(): string {
    const adapter = this.app.vault.adapter as unknown as { getBasePath?: () => string };
    if (adapter && typeof adapter.getBasePath === 'function') {
      return adapter.getBasePath();
    }
    
    // 備用方案：使用 vault 名稱作為相對路徑
    return this.app.vault.getName();
  }
  
  /**
   * 將相對路徑轉換為絕對路徑
   * 
   * @param relativePath - 相對於 Vault 的檔案路徑
   * @returns 絕對路徑
   */
  getAbsolutePath(relativePath: string): string {
    const vaultPath = this.getVaultPath();
    return path.join(vaultPath, relativePath);
  }
  
  /**
   * 轉義路徑以安全地用於 Shell 命令
   * 
   * @param filePath - 原始路徑
   * @returns 轉義後的路徑
   */
  escapePath(filePath: string): string {
    if (Platform.isWin) {
      // Windows：使用雙引號包裹，並轉義內部雙引號
      const escaped = filePath.replace(/"/g, '""');
      return `"${escaped}"`;
    } else {
      // Unix (macOS/Linux)：使用單引號包裹，並處理內部單引號
      // 'path with spaces' → 正常
      // 路徑含 ' → 使用 '\'' 轉義
      const escaped = filePath.replace(/'/g, "'\\''");
      return `'${escaped}'`;
    }
  }
  
  /**
   * 取得系統預設 Shell
   * 
   * @returns Shell 執行檔路徑
   */
  getDefaultShell(): string {
    if (Platform.isWin) {
      // Windows：優先使用 PowerShell，其次 cmd
      return process.env.COMSPEC || 'cmd.exe';
    } else {
      // Unix：使用環境變數 SHELL，預設 /bin/bash
      return process.env.SHELL || '/bin/bash';
    }
  }
  
  /**
   * 取得 Python 執行檔路徑
   * 
   * @returns Python 執行檔路徑
   */
  getPythonExecutable(): string {
    if (Platform.isWin) {
      return 'python';
    } else {
      return 'python3';
    }
  }
  
  /**
   * 取得當前使用者的 Home 目錄
   * 
   * @returns Home 目錄路徑
   */
  getHomeDirectory(): string {
    return os.homedir();
  }
  
  /**
   * 檢查檔案是否為 Markdown 檔案
   * 
   * @param file - TFile 實例
   * @returns 是否為 Markdown 檔案
   */
  isMarkdownFile(file: TFile): boolean {
    return file.extension === 'md';
  }
  
  /**
   * 標準化路徑分隔符
   * 
   * @param filePath - 原始路徑
   * @returns 標準化後的路徑
   */
  normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }
}

/**
 * 建立 PathHelper 實例
 * 
 * @param app - Obsidian App 實例
 * @returns PathHelper 實例
 */
export function createPathHelper(app: App): PathHelper {
  return new PathHelper(app);
}
