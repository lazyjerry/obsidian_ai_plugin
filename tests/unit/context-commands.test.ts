/**
 * ContextCommands 單元測試
 * 
 * 測試 @cfile 和 @folder 上下文指令替換邏輯
 */

import { ContextCommandHandler, ContextCommandType } from '../../src/terminal/context-commands';
import { PathHelper } from '../../src/utils/path-helper';
import { TerminalError } from '../../src/types';

// Mock PathHelper
jest.mock('../../src/utils/path-helper', () => ({
  PathHelper: jest.fn().mockImplementation(() => ({
    getCurrentFilePath: jest.fn().mockReturnValue('/vault/path/to/file.md'),
    getCurrentFileDirectory: jest.fn().mockReturnValue('/vault/path/to'),
    getVaultPath: jest.fn().mockReturnValue('/vault'),
    escapePath: jest.fn((p: string) => `'${p.replace(/'/g, "'\\''")}'`),
  })),
}));

// Mock obsidian App
const mockApp = {
  workspace: {
    getActiveFile: jest.fn().mockReturnValue({
      path: 'path/to/file.md',
    }),
  },
  vault: {
    adapter: {
      getBasePath: jest.fn().mockReturnValue('/vault'),
    },
  },
};

describe('ContextCommandHandler', () => {
  let handler: ContextCommandHandler;
  let mockPathHelper: jest.Mocked<PathHelper>;

  beforeEach(() => {
    mockPathHelper = new PathHelper(mockApp as any) as jest.Mocked<PathHelper>;
    handler = new ContextCommandHandler(mockPathHelper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('@cfile 替換邏輯', () => {
    it('應該將 @cfile 替換為當前檔案路徑', () => {
      const input = 'cat @cfile';
      const result = handler.replaceContextCommands(input);
      
      expect(result).toContain("'/vault/path/to/file.md'");
    });

    it('應該替換命令中的多個 @cfile', () => {
      const input = 'diff @cfile @cfile';
      const result = handler.replaceContextCommands(input);
      
      // 應該有兩個路徑
      const matches = result.match(/\/vault\/path\/to\/file\.md/g);
      expect(matches).toHaveLength(2);
    });

    it('應該處理 @cfile 在命令末尾的情況', () => {
      const input = 'echo @cfile';
      const result = handler.replaceContextCommands(input);
      
      expect(result).toBe("echo '/vault/path/to/file.md'");
    });

    it('應該正確處理 @cfile 在引號內的情況', () => {
      const input = 'echo "File: @cfile"';
      const result = handler.replaceContextCommands(input);
      
      // @cfile 應該被替換，即使在引號內
      expect(result).toContain('/vault/path/to/file.md');
    });

    it('無檔案開啟時應該拋出錯誤', () => {
      mockPathHelper.getCurrentFilePath = jest.fn().mockReturnValue(null);
      
      const input = 'cat @cfile';
      
      expect(() => handler.replaceContextCommands(input)).toThrow(TerminalError);
    });
  });

  describe('@folder 替換邏輯', () => {
    it('應該將 @folder 替換為當前檔案目錄', () => {
      const input = 'ls @folder';
      const result = handler.replaceContextCommands(input);
      
      expect(result).toContain("'/vault/path/to'");
    });

    it('應該替換命令中的多個 @folder', () => {
      const input = 'cd @folder && ls @folder';
      const result = handler.replaceContextCommands(input);
      
      const matches = result.match(/\/vault\/path\/to/g);
      expect(matches).toHaveLength(2);
    });

    it('無檔案開啟時應該使用 Vault 根目錄', () => {
      mockPathHelper.getCurrentFileDirectory = jest.fn().mockReturnValue(null);
      
      const input = 'ls @folder';
      const result = handler.replaceContextCommands(input);
      
      expect(result).toContain("'/vault'");
    });
  });

  describe('混合指令處理', () => {
    it('應該同時處理 @cfile 和 @folder', () => {
      const input = 'cp @cfile @folder/backup/';
      const result = handler.replaceContextCommands(input);
      
      expect(result).toContain('/vault/path/to/file.md');
      expect(result).toContain('/vault/path/to');
    });

    it('無上下文指令時應該返回原始輸入', () => {
      const input = 'ls -la';
      const result = handler.replaceContextCommands(input);
      
      expect(result).toBe('ls -la');
    });

    it('應該忽略不認識的 @ 指令', () => {
      const input = 'email @user@example.com';
      const result = handler.replaceContextCommands(input);
      
      expect(result).toBe('email @user@example.com');
    });
  });

  describe('偵測上下文指令', () => {
    it('應該偵測到 @cfile', () => {
      const hasCommand = handler.hasContextCommands('cat @cfile');
      expect(hasCommand).toBe(true);
    });

    it('應該偵測到 @folder', () => {
      const hasCommand = handler.hasContextCommands('cd @folder');
      expect(hasCommand).toBe(true);
    });

    it('無上下文指令時應該返回 false', () => {
      const hasCommand = handler.hasContextCommands('ls -la');
      expect(hasCommand).toBe(false);
    });

    it('應該列出所有支援的上下文指令', () => {
      const commands = handler.getSupportedCommands();
      
      expect(commands).toContain(ContextCommandType.CFILE);
      expect(commands).toContain(ContextCommandType.FOLDER);
    });
  });

  describe('輸入處理', () => {
    it('應該在 Enter 鍵時處理輸入', () => {
      const callback = jest.fn();
      handler.handleInput('cat @cfile\r', callback);
      
      expect(callback).toHaveBeenCalledWith(
        expect.stringContaining('/vault/path/to/file.md')
      );
    });

    it('應該傳遞非 Enter 的輸入', () => {
      const callback = jest.fn();
      handler.handleInput('cat @c', callback);
      
      expect(callback).toHaveBeenCalledWith('cat @c');
    });

    it('應該處理 \\n 作為 Enter', () => {
      const callback = jest.fn();
      handler.handleInput('echo @cfile\n', callback);
      
      expect(callback).toHaveBeenCalledWith(
        expect.stringContaining('/vault/path/to/file.md')
      );
    });
  });
});
