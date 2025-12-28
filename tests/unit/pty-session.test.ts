/**
 * PtySession 單元測試
 * 
 * 測試 PtySession 類別的建立與通訊功能
 */

import { PtySession } from '../../src/terminal/pty-session';
import { TerminalError, TerminalErrorCode } from '../../src/types';
import { ChildProcess } from 'node:child_process';

// Mock child_process
jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}));

// Mock obsidian Platform
jest.mock('obsidian', () => ({
  Platform: {
    isWin: false,
    isMacOS: true,
    isLinux: false,
  },
}));

import { spawn } from 'node:child_process';

describe('PtySession', () => {
  let ptySession: PtySession;
  let mockProcess: Partial<ChildProcess>;
  let mockStdin: { write: jest.Mock };
  let mockStdout: { on: jest.Mock };
  let mockStderr: { on: jest.Mock };

  beforeEach(() => {
    // 建立 mock streams
    mockStdin = { 
      write: jest.fn((data, encoding, callback) => {
        if (callback) callback();
      }) 
    };
    mockStdout = { on: jest.fn() };
    mockStderr = { on: jest.fn() };

    // 建立 mock process
    mockProcess = {
      pid: 12345,
      stdin: mockStdin as unknown as NodeJS.WritableStream,
      stdout: mockStdout as unknown as NodeJS.ReadableStream,
      stderr: mockStderr as unknown as NodeJS.ReadableStream,
      on: jest.fn(),
      kill: jest.fn(),
    };

    (spawn as jest.Mock).mockReturnValue(mockProcess);
  });

  afterEach(() => {
    if (ptySession) {
      ptySession.dispose();
    }
    jest.clearAllMocks();
  });

  describe('建立實例', () => {
    it('應該能夠建立 PtySession 實例', () => {
      ptySession = new PtySession({
        shell: '/bin/zsh',
        cwd: '/Users/test',
        scriptsPath: '/path/to/scripts',
      });
      
      expect(ptySession).toBeDefined();
      expect(ptySession.shell).toBe('/bin/zsh');
      expect(ptySession.cwd).toBe('/Users/test');
    });

    it('應該接受自訂 Python 執行檔路徑', () => {
      ptySession = new PtySession({
        shell: '/bin/zsh',
        cwd: '/Users/test',
        scriptsPath: '/path/to/scripts',
        pythonExecutable: '/usr/local/bin/python3',
      });
      
      expect(ptySession).toBeDefined();
    });
  });

  describe('啟動 PTY', () => {
    beforeEach(() => {
      ptySession = new PtySession({
        shell: '/bin/zsh',
        cwd: '/Users/test',
        scriptsPath: '/path/to/scripts',
      });
    });

    it('應該能夠啟動 PTY 進程', async () => {
      await ptySession.start();
      
      expect(spawn).toHaveBeenCalledWith(
        'python3',
        expect.arrayContaining([
          expect.stringContaining('unix_pty.py'),
          '/bin/zsh',
          '/Users/test',
        ]),
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      );
    });

    it('應該設定 stdout 資料監聽器', async () => {
      await ptySession.start();
      
      expect(mockStdout.on).toHaveBeenCalledWith('data', expect.any(Function));
    });

    it('應該設定 stderr 資料監聽器', async () => {
      await ptySession.start();
      
      expect(mockStderr.on).toHaveBeenCalledWith('data', expect.any(Function));
    });

    it('應該設定進程事件監聽器', async () => {
      await ptySession.start();
      
      expect(mockProcess.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('寫入資料', () => {
    beforeEach(async () => {
      ptySession = new PtySession({
        shell: '/bin/zsh',
        cwd: '/Users/test',
        scriptsPath: '/path/to/scripts',
      });
      await ptySession.start();
    });

    it('應該能夠寫入資料到 PTY stdin', async () => {
      await ptySession.write('ls -la\n');
      
      expect(mockStdin.write).toHaveBeenCalledWith(
        'ls -la\n',
        'utf-8',
        expect.any(Function)
      );
    });
  });

  describe('調整大小', () => {
    beforeEach(async () => {
      ptySession = new PtySession({
        shell: '/bin/zsh',
        cwd: '/Users/test',
        scriptsPath: '/path/to/scripts',
      });
      await ptySession.start();
    });

    it('應該能夠發送視窗大小調整命令', () => {
      ptySession.resize(100, 30);
      
      expect(mockStdin.write).toHaveBeenCalledWith(
        expect.stringContaining('RESIZE:30,100'),
        'utf-8'
      );
    });
  });

  describe('終止進程', () => {
    beforeEach(async () => {
      ptySession = new PtySession({
        shell: '/bin/zsh',
        cwd: '/Users/test',
        scriptsPath: '/path/to/scripts',
      });
      await ptySession.start();
    });

    it('應該能夠終止 PTY 進程', () => {
      ptySession.kill();
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('應該能夠使用指定信號終止進程', () => {
      ptySession.kill('SIGKILL');
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });

  describe('事件監聽', () => {
    beforeEach(async () => {
      ptySession = new PtySession({
        shell: '/bin/zsh',
        cwd: '/Users/test',
        scriptsPath: '/path/to/scripts',
      });
      await ptySession.start();
    });

    it('應該能夠監聽資料輸出', () => {
      const callback = jest.fn();
      const disposable = ptySession.onData(callback);
      
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });

    it('應該能夠監聽進程退出', () => {
      const callback = jest.fn();
      const disposable = ptySession.onExit(callback);
      
      expect(disposable).toBeDefined();
    });

    it('應該能夠監聽錯誤', () => {
      const callback = jest.fn();
      const disposable = ptySession.onError(callback);
      
      expect(disposable).toBeDefined();
    });

    it('應該能夠取消監聽', () => {
      const callback = jest.fn();
      const disposable = ptySession.onData(callback);
      
      expect(() => disposable.dispose()).not.toThrow();
    });
  });

  describe('銷毀', () => {
    beforeEach(async () => {
      ptySession = new PtySession({
        shell: '/bin/zsh',
        cwd: '/Users/test',
        scriptsPath: '/path/to/scripts',
      });
      await ptySession.start();
    });

    it('應該能夠銷毀 Session', () => {
      expect(() => ptySession.dispose()).not.toThrow();
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('多次銷毀應該是安全的', () => {
      expect(() => {
        ptySession.dispose();
        ptySession.dispose();
      }).not.toThrow();
    });

    it('銷毀後無法再啟動', async () => {
      ptySession.dispose();
      
      await expect(ptySession.start()).rejects.toThrow(TerminalError);
    });
  });
});
