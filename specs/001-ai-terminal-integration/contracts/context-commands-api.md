# Context Commands API Contract

**File**: `src/terminal/context-commands.ts`

## Interface

```typescript
export interface ContextCommandHandlerAPI {
  /** 處理使用者輸入（攔截 Enter 鍵並替換上下文指令） */
  handleInput(data: string): Promise<{ data: string, shouldExecute: boolean }>;
  
  /** 替換指令中的上下文關鍵字 */
  replaceContextCommands(input: string): Promise<string>;
  
  /** 註冊新的上下文指令 */
  register(command: ContextCommand): void;
  
  /** 取消註冊上下文指令 */
  unregister(keyword: string): void;
}
```

## Built-in Commands

```typescript
const BUILTIN_COMMANDS: ContextCommand[] = [
  {
    keyword: '@cfile',
    resolver: async (app) => {
      const file = app.workspace.getActiveFile();
      if (!file) throw new TerminalError(TerminalErrorCode.NO_ACTIVE_FILE, '目前沒有開啟的檔案');
      return (app.vault.adapter as FileSystemAdapter).getFullPath(file.path);
    },
    description: '當前開啟檔案的完整路徑',
    enabled: true,
    caseSensitive: true,
  },
  {
    keyword: '@folder',
    resolver: async (app) => {
      return (app.vault.adapter as FileSystemAdapter).getBasePath();
    },
    description: 'Vault 根目錄路徑',
    enabled: true,
    caseSensitive: true,
  },
];
```