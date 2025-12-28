/**
 * AI Terminal Plugin - 外掛入口點
 * 
 * @description Obsidian 外掛生命週期管理
 * @module main
 */

import { Plugin, WorkspaceLeaf } from 'obsidian';
import { AITerminalSettings, DEFAULT_SETTINGS } from './types';
import { AITerminalSettingTab, loadSettings, saveSettings } from './settings';
import { TerminalView, VIEW_TYPE_TERMINAL } from './views/TerminalView';
import { SelectionReferenceHandler } from './utils/selection-reference';

/**
 * AI Terminal Plugin 主類別
 */
export default class AITerminalPlugin extends Plugin {
  settings: AITerminalSettings = DEFAULT_SETTINGS;
  private selectionHandler: SelectionReferenceHandler | null = null;
  
  /**
   * 外掛載入時執行
   */
  async onload(): Promise<void> {
    // 載入設定
    this.settings = await loadSettings(this);
    
    // 初始化選取範圍處理器
    this.selectionHandler = new SelectionReferenceHandler(this.app);
    
    // 註冊終端視圖
    this.registerView(
      VIEW_TYPE_TERMINAL,
      (leaf) => new TerminalView(leaf, this)
    );
    
    // 新增 Ribbon 圖示
    this.addRibbonIcon('terminal', '開啟 AI Terminal', () => {
      this.activateTerminalView();
    });
    
    // 新增命令：開啟終端
    this.addCommand({
      id: 'open-terminal',
      name: '開啟 AI Terminal',
      callback: () => {
        this.activateTerminalView();
      },
    });
    
    // 新增命令：複製選取範圍參考（US3）
    this.addCommand({
      id: 'copy-selection-reference',
      name: '複製選取範圍參考',
      editorCallback: () => {
        this.selectionHandler?.executeSelectionReference();
      },
    });
    
    // 新增設定頁面
    this.addSettingTab(new AITerminalSettingTab(this.app, this));
    
    // eslint-disable-next-line no-console
    console.log('AI Terminal Plugin 已載入');
  }
  
  /**
   * 外掛卸載時執行
   */
  onunload(): void {
    // 關閉所有終端視圖
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_TERMINAL);
    
    // eslint-disable-next-line no-console
    console.log('AI Terminal Plugin 已卸載');
  }
  
  /**
   * 儲存設定
   */
  async saveSettings(): Promise<void> {
    await saveSettings(this);
  }
  
  /**
   * 啟用終端視圖
   */
  async activateTerminalView(): Promise<void> {
    const { workspace } = this.app;
    
    // 檢查是否已有終端視圖開啟
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_TERMINAL);
    
    if (leaves.length > 0) {
      // 使用現有的終端視圖
      leaf = leaves[0];
    } else {
      // 在底部建立新的視圖
      leaf = workspace.getLeaf('split', 'horizontal');
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_TERMINAL,
          active: true,
        });
      }
    }
    
    // 顯示並聚焦終端視圖
    if (leaf) {
      workspace.revealLeaf(leaf);
      
      // 聚焦終端
      const view = leaf.view;
      if (view instanceof TerminalView) {
        view.focus();
      }
    }
  }
}
