/**
 * SelectionReference 單元測試
 * 
 * 測試選取範圍參考格式化功能
 */

import { SelectionReferenceHandler } from '../../src/utils/selection-reference';
import { SelectionRange, SelectionReference } from '../../src/types';

// Mock obsidian
jest.mock('obsidian', () => ({
  Notice: jest.fn().mockImplementation(function(this: any, message: string) {
    this.message = message;
  }),
}));

// Mock App
const createMockApp = () => ({
  workspace: {
    getActiveFile: jest.fn().mockReturnValue({
      path: 'path/to/note.md',
      name: 'note.md',
      basename: 'note',
    }),
    getActiveViewOfType: jest.fn(),
  },
  vault: {
    adapter: {
      getBasePath: jest.fn().mockReturnValue('/vault'),
    },
  },
});

// Mock MarkdownView
const createMockMarkdownView = (selection: { from: { line: number }, to: { line: number } } | null) => ({
  editor: {
    getCursor: jest.fn().mockImplementation((anchor?: string) => {
      if (selection) {
        return anchor === 'from' ? selection.from : selection.to;
      }
      return { line: 5, ch: 0 }; // 預設游標位置
    }),
    getSelection: jest.fn().mockReturnValue(selection ? 'selected text' : ''),
  },
});

describe('SelectionReferenceHandler', () => {
  let handler: SelectionReferenceHandler;
  let mockApp: ReturnType<typeof createMockApp>;

  beforeEach(() => {
    mockApp = createMockApp();
    handler = new SelectionReferenceHandler(mockApp as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('格式化參考', () => {
    it('應該格式化單行選取（file.md#L10）', () => {
      const range: SelectionRange = {
        startLine: 10,
        endLine: 10,
        isSingleLine: true,
      };
      
      const formatted = handler.formatReference('note.md', range);
      
      expect(formatted).toBe('note.md#L10');
    });

    it('應該格式化多行選取（file.md#L10-L15）', () => {
      const range: SelectionRange = {
        startLine: 10,
        endLine: 15,
        isSingleLine: false,
      };
      
      const formatted = handler.formatReference('note.md', range);
      
      expect(formatted).toBe('note.md#L10-L15');
    });

    it('應該處理包含路徑的檔案名稱', () => {
      const range: SelectionRange = {
        startLine: 5,
        endLine: 10,
        isSingleLine: false,
      };
      
      const formatted = handler.formatReference('folder/subfolder/note.md', range);
      
      expect(formatted).toBe('folder/subfolder/note.md#L5-L10');
    });
  });

  describe('取得選取範圍', () => {
    it('應該取得選取範圍', () => {
      const mockView = createMockMarkdownView({ 
        from: { line: 9 }, 
        to: { line: 14 } 
      });
      mockApp.workspace.getActiveViewOfType = jest.fn().mockReturnValue(mockView);
      
      const range = handler.getSelectionRange();
      
      expect(range).toEqual({
        startLine: 10, // 0-based to 1-based
        endLine: 15,
        isSingleLine: false,
      });
    });

    it('無選取時應該返回游標位置', () => {
      const mockView = createMockMarkdownView(null);
      mockApp.workspace.getActiveViewOfType = jest.fn().mockReturnValue(mockView);
      
      const range = handler.getSelectionRange();
      
      // 游標在第 5 行（0-based）= 第 6 行（1-based）
      expect(range?.startLine).toBe(6);
      expect(range?.isSingleLine).toBe(true);
    });

    it('無 MarkdownView 時應該返回 null', () => {
      mockApp.workspace.getActiveViewOfType = jest.fn().mockReturnValue(null);
      
      const range = handler.getSelectionRange();
      
      expect(range).toBeNull();
    });
  });

  describe('建立參考', () => {
    it('應該建立完整的 SelectionReference', () => {
      const mockView = createMockMarkdownView({ 
        from: { line: 9 }, 
        to: { line: 14 } 
      });
      mockApp.workspace.getActiveViewOfType = jest.fn().mockReturnValue(mockView);
      
      const reference = handler.createReference();
      
      expect(reference).toEqual({
        filePath: 'path/to/note.md',
        range: {
          startLine: 10,
          endLine: 15,
          isSingleLine: false,
        },
        formatted: 'path/to/note.md#L10-L15',
      });
    });

    it('無檔案開啟時應該返回 null', () => {
      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(null);
      
      const reference = handler.createReference();
      
      expect(reference).toBeNull();
    });
  });

  describe('複製到剪貼簿', () => {
    beforeEach(() => {
      // Mock navigator.clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('應該能夠複製參考到剪貼簿', async () => {
      const reference: SelectionReference = {
        filePath: 'note.md',
        range: {
          startLine: 10,
          endLine: 15,
          isSingleLine: false,
        },
        formatted: 'note.md#L10-L15',
      };
      
      await handler.copyToClipboard(reference);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('note.md#L10-L15');
    });
  });

  describe('顯示通知', () => {
    it('應該顯示可複製的通知', () => {
      const reference: SelectionReference = {
        filePath: 'note.md',
        range: {
          startLine: 10,
          endLine: 10,
          isSingleLine: true,
        },
        formatted: 'note.md#L10',
      };
      
      handler.showReferenceNotice(reference);
      
      // Notice 被呼叫
      const Notice = require('obsidian').Notice;
      expect(Notice).toHaveBeenCalled();
    });
  });
});
