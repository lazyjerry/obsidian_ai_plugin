# Selection Reference API Contract

**File**: `src/utils/selection-reference.ts`

## Interface

```typescript
export interface SelectionReferenceHandlerAPI {
  /** 取得當前選取範圍 */
  getSelection(): SelectionReference | null;
  
  /** 格式化為 GitHub 風格引用 */
  formatReference(selection: SelectionReference): string | null;
  
  /** 顯示可點擊的通知訊息 */
  showReferenceNotice(): Promise<void>;
  
  /** 複製到剪貼簿 */
  copyToClipboard(text: string): Promise<void>;
}
```

## Reference Formats

```typescript
// 單行選取
'file.md#L10'

// 多行選取
'file.md#L10-L15'

// 完整路徑（用於終端）
'/absolute/path/to/file.md#L10-L15'
```