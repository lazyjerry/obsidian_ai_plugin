/**
 * ContextCommands - 上下文指令處理器
 * 
 * @description 處理 @cfile、@folder 等上下文指令，在命令執行前替換為實際路徑
 * @module terminal/context-commands
 */

import { PathHelper } from '../utils/path-helper';
import { TerminalError, TerminalErrorCode } from '../types';

/**
 * 上下文指令類型
 */
export enum ContextCommandType {
  /** 當前檔案路徑 */
  CFILE = '@cfile',
  /** 當前檔案所在目錄 */
  FOLDER = '@folder',
}

/**
 * 上下文指令處理器介面
 */
export interface ContextCommandHandlerAPI {
  /**
   * 檢查輸入是否包含上下文指令
   */
  hasContextCommands(input: string): boolean;
  
  /**
   * 替換輸入中的上下文指令
   */
  replaceContextCommands(input: string): string;
  
  /**
   * 處理使用者輸入（攔截 Enter 鍵）
   */
  handleInput(input: string, callback: (processedInput: string) => void): void;
  
  /**
   * 取得支援的上下文指令列表
   */
  getSupportedCommands(): ContextCommandType[];
}

/**
 * 上下文指令處理器實作
 */
export class ContextCommandHandler implements ContextCommandHandlerAPI {
  private pathHelper: PathHelper;
  
  /** 上下文指令正規表達式 */
  private static readonly COMMAND_PATTERNS: Map<ContextCommandType, RegExp> = new Map([
    [ContextCommandType.CFILE, /@cfile\b/g],
    [ContextCommandType.FOLDER, /@folder\b/g],
  ]);
  
  constructor(pathHelper: PathHelper) {
    this.pathHelper = pathHelper;
  }
  
  /**
   * 檢查輸入是否包含上下文指令
   */
  hasContextCommands(input: string): boolean {
    for (const pattern of ContextCommandHandler.COMMAND_PATTERNS.values()) {
      // 重設 lastIndex（因為 g flag）
      pattern.lastIndex = 0;
      if (pattern.test(input)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * 替換輸入中的上下文指令
   * 
   * @throws {TerminalError} 當需要的上下文資訊不可用時
   */
  replaceContextCommands(input: string): string {
    let result = input;
    
    // 處理 @cfile
    if (this.containsCommand(input, ContextCommandType.CFILE)) {
      const filePath = this.pathHelper.getCurrentFilePath();
      if (!filePath) {
        throw new TerminalError(
          TerminalErrorCode.NO_ACTIVE_FILE,
          '目前沒有開啟的檔案，無法替換 @cfile'
        );
      }
      const escapedPath = this.pathHelper.escapePath(filePath);
      result = this.replaceCommand(result, ContextCommandType.CFILE, escapedPath);
    }
    
    // 處理 @folder
    if (this.containsCommand(input, ContextCommandType.FOLDER)) {
      // @folder 優先使用當前檔案目錄，若無則使用 vault 根目錄
      let folderPath = this.pathHelper.getCurrentFileDirectory();
      if (!folderPath) {
        folderPath = this.pathHelper.getVaultPath();
      }
      const escapedPath = this.pathHelper.escapePath(folderPath);
      result = this.replaceCommand(result, ContextCommandType.FOLDER, escapedPath);
    }
    
    return result;
  }
  
  /**
   * 處理使用者輸入
   * 
   * 攔截包含 Enter 鍵的輸入，進行上下文指令替換後再傳遞
   */
  handleInput(input: string, callback: (processedInput: string) => void): void {
    // 檢查是否為 Enter 鍵（\r 或 \n）
    const isEnter = input.endsWith('\r') || input.endsWith('\n');
    
    if (isEnter && this.hasContextCommands(input)) {
      try {
        const processed = this.replaceContextCommands(input);
        callback(processed);
      } catch (error) {
        // 替換失敗時傳遞原始輸入，錯誤由呼叫端處理
        callback(input);
        throw error;
      }
    } else {
      callback(input);
    }
  }
  
  /**
   * 取得支援的上下文指令列表
   */
  getSupportedCommands(): ContextCommandType[] {
    return [
      ContextCommandType.CFILE,
      ContextCommandType.FOLDER,
    ];
  }
  
  /**
   * 檢查輸入是否包含指定的上下文指令
   */
  private containsCommand(input: string, command: ContextCommandType): boolean {
    const pattern = ContextCommandHandler.COMMAND_PATTERNS.get(command);
    if (!pattern) {
      return false;
    }
    pattern.lastIndex = 0;
    return pattern.test(input);
  }
  
  /**
   * 替換指定的上下文指令
   */
  private replaceCommand(input: string, command: ContextCommandType, replacement: string): string {
    const pattern = ContextCommandHandler.COMMAND_PATTERNS.get(command);
    if (!pattern) {
      return input;
    }
    // 建立新的 RegExp 避免 lastIndex 問題
    const newPattern = new RegExp(pattern.source, pattern.flags);
    return input.replace(newPattern, replacement);
  }
}
