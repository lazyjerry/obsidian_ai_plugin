// xterm.js Mock
// 用於測試環境模擬 xterm.js Terminal

export class Terminal {
  private _element: HTMLElement | null = null;
  private _options: ITerminalOptions;
  
  constructor(options?: ITerminalOptions) {
    this._options = options ?? {};
  }
  
  get element(): HTMLElement | undefined {
    return this._element ?? undefined;
  }
  
  open(parent: HTMLElement): void {
    this._element = document.createElement('div');
    parent.appendChild(this._element);
  }
  
  write(data: string): void {}
  
  writeln(data: string): void {}
  
  clear(): void {}
  
  reset(): void {}
  
  focus(): void {}
  
  blur(): void {}
  
  resize(cols: number, rows: number): void {}
  
  loadAddon(addon: ITerminalAddon): void {
    addon.activate(this);
  }
  
  onData(callback: (data: string) => void): IDisposable {
    return { dispose: () => {} };
  }
  
  onKey(callback: (e: { key: string; domEvent: KeyboardEvent }) => void): IDisposable {
    return { dispose: () => {} };
  }
  
  onResize(callback: (e: { cols: number; rows: number }) => void): IDisposable {
    return { dispose: () => {} };
  }
  
  dispose(): void {
    this._element = null;
  }
}

export interface ITerminalOptions {
  rows?: number;
  cols?: number;
  cursorBlink?: boolean;
  fontSize?: number;
  fontFamily?: string;
  theme?: ITheme;
}

export interface ITheme {
  background?: string;
  foreground?: string;
  cursor?: string;
}

export interface ITerminalAddon {
  activate(terminal: Terminal): void;
  dispose(): void;
}

export interface IDisposable {
  dispose(): void;
}
