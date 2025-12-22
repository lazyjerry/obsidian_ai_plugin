# Path Helper API Contract

**File**: `src/utils/path-helper.ts`

## Interface

```typescript
export interface PathHelperAPI {
  /** 取得當前開啟檔案的完整路徑 */
  getCurrentFilePath(): string | null;
  
  /** 取得 vault 根目錄路徑 */
  getVaultPath(): string | null;
  
  /** 取得檔案所在目錄路徑 */
  getFileDirectory(file: TFile): string | null;
  
  /** Vault 相對路徑 → 系統絕對路徑 */
  toAbsolutePath(vaultRelativePath: string): string | null;
  
  /** 系統絕對路徑 → Vault 相對路徑 */
  toRelativePath(absolutePath: string): string | null;
  
  /** 路徑轉義（跨平台安全） */
  escapePath(path: string): string;
}
```

## Path Escaping

```typescript
// Unix/macOS: 單引號（避免變數展開）
escapePath('/path/to/my file.md');  // '/path/to/my file.md'

// Windows: 雙引號
escapePath('C:\\Users\\user\\My Documents\\file.md');  // "C:\Users\user\My Documents\file.md"
```