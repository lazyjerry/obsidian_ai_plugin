/**
 * XtermEmulator 單元測試
 * 
 * 測試 XtermEmulator 類別的初始化與銷毀功能
 */

import { XtermEmulator } from '../../src/terminal/xterm-emulator';

// Mock xterm.js
jest.mock('@xterm/xterm', () => ({
  Terminal: jest.fn().mockImplementation(() => ({
    open: jest.fn(),
    write: jest.fn(),
    writeln: jest.fn(),
    clear: jest.fn(),
    focus: jest.fn(),
    dispose: jest.fn(),
    loadAddon: jest.fn(),
    onData: jest.fn(() => ({ dispose: jest.fn() })),
    onKey: jest.fn(() => ({ dispose: jest.fn() })),
    onResize: jest.fn(() => ({ dispose: jest.fn() })),
    cols: 80,
    rows: 24,
  })),
}));

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn().mockImplementation(() => ({
    fit: jest.fn(),
    dispose: jest.fn(),
    activate: jest.fn(),
  })),
}));

jest.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    activate: jest.fn(),
  })),
}));

describe('XtermEmulator', () => {
  let emulator: XtermEmulator;
  let container: HTMLElement;

  beforeEach(() => {
    // 建立測試用 DOM 容器
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    // 清理
    if (emulator) {
      emulator.dispose();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('初始化', () => {
    it('應該能夠建立 XtermEmulator 實例', () => {
      emulator = new XtermEmulator();
      expect(emulator).toBeDefined();
      expect(emulator.terminal).toBeDefined();
    });

    it('應該接受自訂配置選項', () => {
      emulator = new XtermEmulator({
        fontSize: 16,
        fontFamily: 'Consolas',
        cursorBlink: false,
      });
      expect(emulator).toBeDefined();
    });

    it('應該能夠開啟並綁定到 DOM 容器', () => {
      emulator = new XtermEmulator();
      emulator.open(container);
      
      expect(emulator.container).toBe(container);
      expect(emulator.terminal.open).toHaveBeenCalledWith(container);
    });
  });

  describe('終端操作', () => {
    beforeEach(() => {
      emulator = new XtermEmulator();
      emulator.open(container);
    });

    it('應該能夠寫入資料到終端', () => {
      emulator.write('Hello, World!');
      expect(emulator.terminal.write).toHaveBeenCalledWith('Hello, World!');
    });

    it('應該能夠寫入一行資料', () => {
      emulator.writeln('Line 1');
      expect(emulator.terminal.writeln).toHaveBeenCalledWith('Line 1');
    });

    it('應該能夠清空終端', () => {
      emulator.clear();
      expect(emulator.terminal.clear).toHaveBeenCalled();
    });

    it('應該能夠聚焦終端', () => {
      emulator.focus();
      expect(emulator.terminal.focus).toHaveBeenCalled();
    });
  });

  describe('事件監聽', () => {
    beforeEach(() => {
      emulator = new XtermEmulator();
      emulator.open(container);
    });

    it('應該能夠監聽使用者輸入', () => {
      const callback = jest.fn();
      const disposable = emulator.onData(callback);
      
      expect(emulator.terminal.onData).toHaveBeenCalled();
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });

    it('應該能夠監聽按鍵事件', () => {
      const callback = jest.fn();
      const disposable = emulator.onKey(callback);
      
      expect(emulator.terminal.onKey).toHaveBeenCalled();
      expect(disposable).toBeDefined();
    });

    it('應該能夠監聽終端大小變化', () => {
      const callback = jest.fn();
      const disposable = emulator.onResize(callback);
      
      expect(emulator.terminal.onResize).toHaveBeenCalled();
      expect(disposable).toBeDefined();
    });
  });

  describe('終端尺寸', () => {
    it('應該能夠取得終端尺寸', () => {
      emulator = new XtermEmulator();
      const dimensions = emulator.dimensions;
      
      expect(dimensions).toHaveProperty('cols');
      expect(dimensions).toHaveProperty('rows');
      expect(dimensions.cols).toBe(80);
      expect(dimensions.rows).toBe(24);
    });
  });

  describe('銷毀', () => {
    it('應該能夠銷毀終端並釋放資源', () => {
      emulator = new XtermEmulator();
      emulator.open(container);
      
      emulator.dispose();
      
      expect(emulator.terminal.dispose).toHaveBeenCalled();
      expect(emulator.container).toBeNull();
    });

    it('多次銷毀應該是安全的', () => {
      emulator = new XtermEmulator();
      emulator.open(container);
      
      expect(() => {
        emulator.dispose();
        emulator.dispose();
      }).not.toThrow();
    });

    it('銷毀後不應該能夠寫入', () => {
      emulator = new XtermEmulator();
      emulator.open(container);
      emulator.dispose();
      
      // 銷毀後 write 應該被忽略（不拋出錯誤）
      expect(() => {
        emulator.write('test');
      }).not.toThrow();
    });
  });
});
