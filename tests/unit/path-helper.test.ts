/**
 * PathHelper 單元測試
 * 
 * 測試路徑轉義功能（含空格、中文、特殊字元）
 */

import { PathHelper } from '../../src/utils/path-helper';
import { Platform } from 'obsidian';

// Mock obsidian Platform
jest.mock('obsidian', () => ({
  Platform: {
    isWin: false,
    isMacOS: true,
    isLinux: false,
  },
}));

// Mock obsidian App
const createMockApp = (activeFilePath: string | null = null) => ({
  workspace: {
    getActiveFile: jest.fn().mockReturnValue(
      activeFilePath ? { path: activeFilePath } : null
    ),
  },
  vault: {
    adapter: {
      getBasePath: jest.fn().mockReturnValue('/Users/test/vault'),
    },
  },
});

describe('PathHelper', () => {
  describe('路徑轉義（Unix）', () => {
    let pathHelper: PathHelper;
    
    beforeEach(() => {
      const mockApp = createMockApp('path/to/file.md');
      pathHelper = new PathHelper(mockApp as any);
    });

    it('應該轉義含空格的路徑', () => {
      const path = '/Users/test/my folder/file.md';
      const escaped = pathHelper.escapePath(path);
      
      expect(escaped).toBe("'/Users/test/my folder/file.md'");
    });

    it('應該轉義含中文的路徑', () => {
      const path = '/Users/test/我的文件/筆記.md';
      const escaped = pathHelper.escapePath(path);
      
      expect(escaped).toBe("'/Users/test/我的文件/筆記.md'");
    });

    it('應該轉義含特殊字元的路徑', () => {
      const path = '/Users/test/file$name.md';
      const escaped = pathHelper.escapePath(path);
      
      expect(escaped).toBe("'/Users/test/file$name.md'");
    });

    it('應該處理含單引號的路徑', () => {
      const path = "/Users/test/it's a file.md";
      const escaped = pathHelper.escapePath(path);
      
      // Unix 中需要特殊處理單引號：'path' → 'it'\''s'
      expect(escaped).toBe("'/Users/test/it'\\''s a file.md'");
    });

    it('應該處理含雙引號的路徑', () => {
      const path = '/Users/test/file"name.md';
      const escaped = pathHelper.escapePath(path);
      
      expect(escaped).toBe("'/Users/test/file\"name.md'");
    });

    it('應該處理含反斜線的路徑', () => {
      const path = '/Users/test/file\\name.md';
      const escaped = pathHelper.escapePath(path);
      
      expect(escaped).toBe("'/Users/test/file\\name.md'");
    });

    it('應該處理含括號的路徑', () => {
      const path = '/Users/test/file(1).md';
      const escaped = pathHelper.escapePath(path);
      
      expect(escaped).toBe("'/Users/test/file(1).md'");
    });

    it('應該處理簡單路徑不變', () => {
      const path = '/Users/test/simple-file.md';
      const escaped = pathHelper.escapePath(path);
      
      expect(escaped).toBe("'/Users/test/simple-file.md'");
    });

    it('應該處理空路徑', () => {
      const escaped = pathHelper.escapePath('');
      expect(escaped).toBe("''");
    });
  });

  describe('路徑轉義（Windows）', () => {
    let pathHelper: PathHelper;
    
    beforeAll(() => {
      // Mock Windows 平台
      (Platform as any).isWin = true;
      (Platform as any).isMacOS = false;
    });
    
    afterAll(() => {
      // 恢復原始設定
      (Platform as any).isWin = false;
      (Platform as any).isMacOS = true;
    });
    
    beforeEach(() => {
      const mockApp = createMockApp('path/to/file.md');
      pathHelper = new PathHelper(mockApp as any);
    });

    it('應該在 Windows 使用雙引號轉義', () => {
      const path = 'C:\\Users\\test\\my folder\\file.md';
      const escaped = pathHelper.escapePath(path);
      
      expect(escaped).toBe('"C:\\Users\\test\\my folder\\file.md"');
    });

    it('應該處理含中文的 Windows 路徑', () => {
      const path = 'C:\\Users\\test\\我的文件\\筆記.md';
      const escaped = pathHelper.escapePath(path);
      
      expect(escaped).toBe('"C:\\Users\\test\\我的文件\\筆記.md"');
    });

    it('應該處理含雙引號的 Windows 路徑', () => {
      const path = 'C:\\Users\\test\\file"name.md';
      const escaped = pathHelper.escapePath(path);
      
      // Windows 中雙引號需要轉義為雙雙引號
      expect(escaped).toBe('"C:\\Users\\test\\file""name.md"');
    });
  });

  describe('取得當前檔案路徑', () => {
    it('應該返回當前檔案的完整路徑', () => {
      const mockApp = createMockApp('path/to/file.md');
      const pathHelper = new PathHelper(mockApp as any);
      
      const filePath = pathHelper.getCurrentFilePath();
      
      expect(filePath).toBe('/Users/test/vault/path/to/file.md');
    });

    it('無檔案開啟時應該返回 null', () => {
      const mockApp = createMockApp(null);
      const pathHelper = new PathHelper(mockApp as any);
      
      const filePath = pathHelper.getCurrentFilePath();
      
      expect(filePath).toBeNull();
    });
  });

  describe('取得當前檔案目錄', () => {
    it('應該返回當前檔案的目錄', () => {
      const mockApp = createMockApp('path/to/file.md');
      const pathHelper = new PathHelper(mockApp as any);
      
      const dirPath = pathHelper.getCurrentFileDirectory();
      
      expect(dirPath).toBe('/Users/test/vault/path/to');
    });

    it('無檔案開啟時應該返回 null', () => {
      const mockApp = createMockApp(null);
      const pathHelper = new PathHelper(mockApp as any);
      
      const dirPath = pathHelper.getCurrentFileDirectory();
      
      expect(dirPath).toBeNull();
    });

    it('根目錄檔案應該返回 vault 路徑', () => {
      const mockApp = createMockApp('file.md');
      const pathHelper = new PathHelper(mockApp as any);
      
      const dirPath = pathHelper.getCurrentFileDirectory();
      
      expect(dirPath).toBe('/Users/test/vault');
    });
  });

  describe('取得 Vault 路徑', () => {
    it('應該返回 Vault 根目錄路徑', () => {
      const mockApp = createMockApp('path/to/file.md');
      const pathHelper = new PathHelper(mockApp as any);
      
      const vaultPath = pathHelper.getVaultPath();
      
      expect(vaultPath).toBe('/Users/test/vault');
    });
  });

  describe('取得預設 Shell', () => {
    it('應該返回平台預設 Shell', () => {
      const mockApp = createMockApp('path/to/file.md');
      const pathHelper = new PathHelper(mockApp as any);
      
      const shell = pathHelper.getDefaultShell();
      
      // macOS 預設 zsh
      expect(shell).toBe('/bin/zsh');
    });
  });
});
