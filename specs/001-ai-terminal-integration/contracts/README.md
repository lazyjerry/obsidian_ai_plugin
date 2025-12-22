# API Contracts: AI Terminal Integration

**Date**: 2025-12-22  
**Feature**: AI Terminal Integration  
**Purpose**: 定義內部 API 介面契約，確保模組間互動的型別安全與一致性

---

## 概述

本目錄包含 AI Terminal Integration 功能的 API 契約定義（TypeScript 介面與型別）。

**契約範圍**：
- 內部模組 API（PtyManager、ContextCommandHandler、PathHelper 等）
- 資料結構與型別定義
- 事件介面與回調函數簽名
- 錯誤類型與訊息格式

**非契約範圍**：
- Obsidian Plugin API（由 obsidian.d.ts 定義）
- xterm.js API（由 @xterm/xterm 定義）
- 外部 AI CLI 工具介面（使用者自行安裝）

**文件列表**：
- `types.ts` - 核心型別定義
- `pty-api.ts` - PTY 管理器 API
- `context-commands-api.ts` - 上下文指令處理 API
- `path-api.ts` - 路徑處理工具 API
- `selection-api.ts` - 選取範圍處理 API
- `events.ts` - 事件介面定義

---

**使用方式**：

```typescript
// 在實作檔案中匯入契約
import { PtyManagerAPI, CreateSessionOptions } from './contracts/pty-api';
import { ContextCommand, ContextResolver } from './contracts/context-commands-api';

// 實作必須符合契約
class PtyManager implements PtyManagerAPI {
  async create(options: CreateSessionOptions): Promise<TerminalSession> {
    // 實作邏輯...
  }
}
```

**驗證**：所有實作必須通過 TypeScript 嚴格模式編譯，無型別錯誤。
