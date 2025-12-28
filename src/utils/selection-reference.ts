/**
 * SelectionReference - 選取範圍參考處理器
 * 
 * @description 處理文字選取，產生 GitHub 風格的檔案引用（如 file.md#L10-L15）
 * @module utils/selection-reference
 */

import { App, MarkdownView, Notice } from 'obsidian';
import { SelectionRange, SelectionReference } from '../types';

/**
 * 選取範圍參考處理器 API
 */
export interface SelectionReferenceHandlerAPI {
  /**
   * 取得當前選取範圍
   */
  getSelectionRange(): SelectionRange | null;
  
  /**
   * 格式化參考字串
   */
  formatReference(filePath: string, range: SelectionRange): string;
  
  /**
   * 建立完整的選取參考
   */
  createReference(): SelectionReference | null;
  
  /**
   * 複製參考到剪貼簿
   */
  copyToClipboard(reference: SelectionReference): Promise<void>;
  
  /**
   * 顯示參考通知
   */
  showReferenceNotice(reference: SelectionReference): void;
}

/**
 * 選取範圍參考處理器實作
 */
export class SelectionReferenceHandler implements SelectionReferenceHandlerAPI {
  constructor(private readonly app: App) {}
  
  /**
   * 取得當前選取範圍
   * 
   * @returns 選取範圍，若無選取則返回游標位置，無編輯器時返回 null
   */
  getSelectionRange(): SelectionRange | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      return null;
    }
    
    const editor = view.editor;
    const selection = editor.getSelection();
    
    if (selection) {
      // 有選取文字
      const from = editor.getCursor('from');
      const to = editor.getCursor('to');
      
      // 轉換為 1-based 行號
      const startLine = from.line + 1;
      const endLine = to.line + 1;
      
      return {
        startLine,
        endLine,
        isSingleLine: startLine === endLine,
      };
    } else {
      // 無選取，使用游標位置
      const cursor = editor.getCursor();
      const line = cursor.line + 1;
      
      return {
        startLine: line,
        endLine: line,
        isSingleLine: true,
      };
    }
  }
  
  /**
   * 格式化參考字串
   * 
   * @param filePath - 檔案路徑
   * @param range - 選取範圍
   * @returns GitHub 風格的引用字串
   */
  formatReference(filePath: string, range: SelectionRange): string {
    if (range.isSingleLine) {
      return `${filePath}#L${range.startLine}`;
    } else {
      return `${filePath}#L${range.startLine}-L${range.endLine}`;
    }
  }
  
  /**
   * 建立完整的選取參考
   * 
   * @returns SelectionReference 物件，若無法建立則返回 null
   */
  createReference(): SelectionReference | null {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return null;
    }
    
    const range = this.getSelectionRange();
    if (!range) {
      return null;
    }
    
    const filePath = activeFile.path;
    const formatted = this.formatReference(filePath, range);
    
    return {
      filePath,
      range,
      formatted,
    };
  }
  
  /**
   * 複製參考到剪貼簿
   * 
   * @param reference - 選取參考物件
   */
  async copyToClipboard(reference: SelectionReference): Promise<void> {
    await navigator.clipboard.writeText(reference.formatted);
  }
  
  /**
   * 顯示參考通知
   * 
   * 顯示一個可點擊的通知，點擊後複製到剪貼簿
   * 
   * @param reference - 選取參考物件
   */
  showReferenceNotice(reference: SelectionReference): void {
    // 建立通知訊息
    const message = `📋 ${reference.formatted}\n點擊複製到剪貼簿`;
    
    // 建立通知
    const notice = new Notice(message, 5000);
    
    // 為通知添加點擊事件
    // 注意：Obsidian 的 Notice API 不直接支援點擊事件
    // 我們需要存取 DOM 元素
    const noticeEl = (notice as any).noticeEl as HTMLElement | undefined;
    if (noticeEl) {
      noticeEl.style.cursor = 'pointer';
      noticeEl.addEventListener('click', async () => {
        await this.copyToClipboard(reference);
        new Notice('已複製到剪貼簿！', 2000);
        notice.hide();
      });
    }
  }
  
  /**
   * 執行完整的選取參考流程
   * 
   * 1. 取得當前選取範圍
   * 2. 建立參考
   * 3. 顯示通知
   * 
   * @returns 是否成功建立參考
   */
  executeSelectionReference(): boolean {
    const reference = this.createReference();
    
    if (!reference) {
      new Notice('無法建立參考：請先開啟一個 Markdown 檔案');
      return false;
    }
    
    this.showReferenceNotice(reference);
    return true;
  }
}
