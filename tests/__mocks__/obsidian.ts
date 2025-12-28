// Obsidian API Mock
// 用於測試環境模擬 Obsidian API

export class Notice {
  constructor(public message: string, public timeout?: number) {}
}

export class Modal {
  app: App;
  constructor(app: App) {
    this.app = app;
  }
  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class Plugin {
  app: App;
  manifest: PluginManifest;
  
  constructor(app: App, manifest: PluginManifest) {
    this.app = app;
    this.manifest = manifest;
  }
  
  loadData(): Promise<unknown> {
    return Promise.resolve({});
  }
  
  saveData(data: unknown): Promise<void> {
    return Promise.resolve();
  }
  
  addCommand(command: Command): Command {
    return command;
  }
  
  addRibbonIcon(icon: string, title: string, callback: () => void): HTMLElement {
    return document.createElement('div');
  }
  
  registerView(type: string, viewCreator: ViewCreator): void {}
  
  registerEvent(eventRef: EventRef): void {}
}

export class ItemView {
  app: App;
  leaf: WorkspaceLeaf;
  containerEl: HTMLElement;
  
  constructor(leaf: WorkspaceLeaf) {
    this.leaf = leaf;
    this.app = leaf.view?.app ?? ({} as App);
    this.containerEl = document.createElement('div');
  }
  
  getViewType(): string {
    return '';
  }
  
  getDisplayText(): string {
    return '';
  }
  
  async onOpen(): Promise<void> {}
  async onClose(): Promise<void> {}
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;
  
  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }
  
  display(): void {}
  hide(): void {}
}

export class Setting {
  settingEl: HTMLElement;
  
  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement('div');
  }
  
  setName(name: string): this { return this; }
  setDesc(desc: string): this { return this; }
  addText(cb: (text: TextComponent) => void): this { return this; }
  addToggle(cb: (toggle: ToggleComponent) => void): this { return this; }
  addDropdown(cb: (dropdown: DropdownComponent) => void): this { return this; }
}

// 模擬型別
export interface App {
  workspace: Workspace;
  vault: Vault;
}

export interface Workspace {
  getActiveFile(): TFile | null;
  getLeaf(newLeaf?: boolean | string): WorkspaceLeaf;
  revealLeaf(leaf: WorkspaceLeaf): void;
  getLeavesOfType(type: string): WorkspaceLeaf[];
}

export interface Vault {
  getRoot(): TFolder;
  adapter: DataAdapter;
}

export interface DataAdapter {
  getBasePath(): string;
  getFullPath(path: string): string;
}

export interface TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  parent: TFolder | null;
}

export interface TFolder {
  path: string;
  name: string;
  parent: TFolder | null;
}

export interface WorkspaceLeaf {
  view: ItemView | null;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  author: string;
  isDesktopOnly: boolean;
}

export interface Command {
  id: string;
  name: string;
  callback?: () => void;
  checkCallback?: (checking: boolean) => boolean | void;
}

export type ViewCreator = (leaf: WorkspaceLeaf) => ItemView;
export interface EventRef {}

export interface TextComponent {
  setValue(value: string): this;
  getValue(): string;
  onChange(callback: (value: string) => void): this;
}

export interface ToggleComponent {
  setValue(value: boolean): this;
  getValue(): boolean;
  onChange(callback: (value: boolean) => void): this;
}

export interface DropdownComponent {
  addOption(value: string, display: string): this;
  setValue(value: string): this;
  getValue(): string;
  onChange(callback: (value: string) => void): this;
}

// 匯出 Platform 工具
export const Platform = {
  isWin: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  isDesktop: true,
  isMobile: false,
};
