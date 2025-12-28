/**
 * 外掛設定
 * 
 * @description 外掛設定介面與預設值
 * @module settings
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import type AITerminalPlugin from './main';
import { AITerminalSettings, DEFAULT_SETTINGS } from './types';

/**
 * 設定頁面
 */
export class AITerminalSettingTab extends PluginSettingTab {
  plugin: AITerminalPlugin;
  
  constructor(app: App, plugin: AITerminalPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    containerEl.createEl('h2', { text: 'AI Terminal 設定' });
    
    // === 終端設定 ===
    containerEl.createEl('h3', { text: '終端設定' });
    
    // Shell 路徑
    new Setting(containerEl)
      .setName('Shell 路徑')
      .setDesc('指定終端使用的 Shell 執行檔路徑（留空使用系統預設）')
      .addText(text => text
        .setPlaceholder('/bin/zsh 或 cmd.exe')
        .setValue(this.plugin.settings.shell)
        .onChange(async (value) => {
          this.plugin.settings.shell = value;
          await this.plugin.saveSettings();
        })
      );
    
    // Python 路徑
    new Setting(containerEl)
      .setName('Python 執行檔路徑')
      .setDesc('指定 Python 執行檔路徑（用於 PTY 腳本）')
      .addText(text => text
        .setPlaceholder('python3')
        .setValue(this.plugin.settings.pythonExecutable)
        .onChange(async (value) => {
          this.plugin.settings.pythonExecutable = value || 'python3';
          await this.plugin.saveSettings();
        })
      );
    
    // === 外觀設定 ===
    containerEl.createEl('h3', { text: '外觀設定' });
    
    // 字體大小
    new Setting(containerEl)
      .setName('字體大小')
      .setDesc('終端字體大小（像素）')
      .addText(text => text
        .setPlaceholder('14')
        .setValue(String(this.plugin.settings.fontSize))
        .onChange(async (value) => {
          const size = parseInt(value, 10);
          if (!isNaN(size) && size > 0) {
            this.plugin.settings.fontSize = size;
            await this.plugin.saveSettings();
          }
        })
      );
    
    // 字體家族
    new Setting(containerEl)
      .setName('字體家族')
      .setDesc('終端字體家族')
      .addText(text => text
        .setPlaceholder('Menlo, Monaco, "Courier New", monospace')
        .setValue(this.plugin.settings.fontFamily)
        .onChange(async (value) => {
          this.plugin.settings.fontFamily = value || DEFAULT_SETTINGS.fontFamily;
          await this.plugin.saveSettings();
        })
      );
    
    // 游標閃爍
    new Setting(containerEl)
      .setName('游標閃爍')
      .setDesc('啟用終端游標閃爍')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.cursorBlink)
        .onChange(async (value) => {
          this.plugin.settings.cursorBlink = value;
          await this.plugin.saveSettings();
        })
      );
    
    // === 上下文指令設定 ===
    containerEl.createEl('h3', { text: '上下文指令' });
    
    // @cfile 指令
    new Setting(containerEl)
      .setName('啟用 @cfile 指令')
      .setDesc('在終端中輸入 @cfile 時自動替換為當前檔案路徑')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enabledContextCommands.includes('@cfile'))
        .onChange(async (value) => {
          const commands = new Set(this.plugin.settings.enabledContextCommands);
          if (value) {
            commands.add('@cfile');
          } else {
            commands.delete('@cfile');
          }
          this.plugin.settings.enabledContextCommands = Array.from(commands);
          await this.plugin.saveSettings();
        })
      );
    
    // @folder 指令
    new Setting(containerEl)
      .setName('啟用 @folder 指令')
      .setDesc('在終端中輸入 @folder 時自動替換為當前 Vault 路徑')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enabledContextCommands.includes('@folder'))
        .onChange(async (value) => {
          const commands = new Set(this.plugin.settings.enabledContextCommands);
          if (value) {
            commands.add('@folder');
          } else {
            commands.delete('@folder');
          }
          this.plugin.settings.enabledContextCommands = Array.from(commands);
          await this.plugin.saveSettings();
        })
      );
    
    // === 安全性設定 ===
    containerEl.createEl('h3', { text: '安全性' });
    
    // 重置安全警告
    new Setting(containerEl)
      .setName('重置安全警告')
      .setDesc('重置首次開啟終端時的安全警告確認狀態')
      .addButton(button => button
        .setButtonText('重置')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.securityWarningConfirmed = false;
          await this.plugin.saveSettings();
        })
      );
  }
}

/**
 * 載入設定
 */
export async function loadSettings(plugin: AITerminalPlugin): Promise<AITerminalSettings> {
  const data = await plugin.loadData();
  return Object.assign({}, DEFAULT_SETTINGS, data);
}

/**
 * 儲存設定
 */
export async function saveSettings(plugin: AITerminalPlugin): Promise<void> {
  await plugin.saveData(plugin.settings);
}
