---
applyTo: "**"
description: "所有檔案的繁體中文翻譯與台灣用語規範"
---

# 全域中文翻譯規範（繁體中文／台灣用語）

## 適用範圍與目標

- **適用所有檔案類型**：包括 `.md`、`.py`、`.js`、`.ts`、`.php`、`.go`、`.html`、`.css`、註解、文件、README 等
- **全面中文化**：所有中文內容（包括註解、變數名稱、函數說明、錯誤訊息、UI 文字等）必須使用繁體中文
- **強制使用台灣常用詞彙和表達方式**，完全避免中國大陸用語或簡體字
- 保持技術專有名詞的準確性，優先保留廣為接受的英文原文
- 確保翻譯後的內容對台灣讀者自然且易於理解

## 適用檔案類型與翻譯範圍

### 文件檔案

- **Markdown 檔案**（`.md`）：完整翻譯標題、內文、表格、清單
- **文字檔案**（`.txt`, `.rtf`）：全部內容翻譯
- **設定檔案**：註解和描述性內容翻譯，保留技術參數

### 程式碼檔案

- **Python 檔案**（`.py`）：docstring、註解、錯誤訊息、print 輸出
- **JavaScript/TypeScript**（`.js`, `.ts`, `.jsx`, `.tsx`）：註解、console.log、錯誤訊息、JSDoc
- **PHP 檔案**（`.php`）：PHPDoc 註解、單行註解、錯誤訊息、echo/print 輸出
- **Go 檔案**（`.go`）：註解、錯誤訊息、fmt.Print 輸出、函數文件註解
- **HTML 檔案**：title、meta description、內文、alt 文字
- **CSS 檔案**：註解、class 名稱（如適用）
- **Shell Script**：註解和 echo 輸出

### 專案管理檔案

- **README.md**：完整翻譯
- **CHANGELOG.md**：版本說明翻譯
- **package.json**：description、scripts 說明
- **設定檔**：YAML、JSON 中的描述性欄位

## 核心翻譯原則

### 1. 繁體字體系（必要條件）

- **絕對禁止**簡體字，所有內容必須使用正體中文（繁體字）
- 特別注意常見混用字：
  - ✅ 正確：「功能」、「檔案」、「網頁」、「軟體」、「資料庫」
  - ❌ 錯誤：「功能」、「文件」、「网页」、「软件」、「数据库」

### 2. 台灣用語標準（核心要求）

**常用詞彙對照表**：

- 「檔案」而非「文件」
- 「網頁／網站」而非「网页／网站」
- 「軟體」而非「软件」
- 「伺服器」而非「服務器」
- 「程式」而非「程序」
- 「字元」而非「字符」
- 「資料夾」而非「文件夹」
- 「設定」而非「配置」
- 「執行」而非「运行」
- 「開啟」而非「打开」

### 3. 技術專有名詞處理原則

- **保留原文**：API、CLI、Token、Commit、Pull Request、Webhook、Endpoint、Framework、Library
- **中英並列**：第一次出現時使用「中文（英文）」格式
- **統一術語**：建立專案內一致的技術詞彙對照
- **程式碼內**：變數名稱、函數名稱、類別名稱保持英文，但註解翻譯成中文

**範例**：

```markdown
## 應用程式介面（API）設定

請確認 API Token 已正確配置...
```

```python
def calculate_user_score(user_data):
    """
    計算使用者分數
    Args:
        user_data: 使用者資料字典
    Returns:
        int: 計算後的分數
    """
    pass
```

### 4. 不同檔案類型的翻譯重點

#### Python 檔案（.py）

- **Docstring**：完整翻譯函數和類別說明
- **註解**：# 開頭的單行註解翻譯
- **錯誤訊息**：Exception 和 print 輸出翻譯
- **變數名稱**：保持英文，但可在註解中說明

```python
# 設定 API 連線參數
API_BASE_URL = "https://api.example.com"

def get_user_profile(user_id):
    """
    取得使用者個人資料

    Args:
        user_id (str): 使用者識別碼

    Returns:
        dict: 包含使用者資料的字典

    Raises:
        ValueError: 當使用者 ID 無效時拋出
    """
    if not user_id:
        raise ValueError("使用者 ID 不可為空")

    # 發送 API 請求取得資料
    response = requests.get(f"{API_BASE_URL}/users/{user_id}")
    return response.json()
```

#### JavaScript/TypeScript 檔案

- **JSDoc 註解**：完整翻譯
- **Console 輸出**：翻譯 console.log、console.error 等
- **錯誤處理**：Error 訊息翻譯

```javascript
/**
 * 計算購物車總金額
 * @param {Array} items - 購物車商品陣列
 * @returns {number} 總金額
 */
function calculateCartTotal(items) {
	// 檢查輸入參數是否有效
	if (!Array.isArray(items)) {
		console.error("購物車商品必須為陣列格式");
		return 0;
	}

	// 計算所有商品的總金額
	return items.reduce((total, item) => {
		return total + item.price * item.quantity;
	}, 0);
}
```

#### HTML 檔案

- **標題和內文**：完整翻譯
- **Meta 標籤**：description、keywords 翻譯
- **表單標籤**：label、placeholder、button 文字
- **Alt 文字**：圖片替代文字翻譯

```html
<!DOCTYPE html>
<html lang="zh-Hant">
	<head>
		<meta charset="UTF-8" />
		<title>使用者管理系統</title>
		<meta
			name="description"
			content="簡單易用的使用者管理系統，支援新增、編輯和刪除功能"
		/>
	</head>
	<body>
		<h1>歡迎使用管理系統</h1>
		<form>
			<label for="username">使用者名稱：</label>
			<input
				type="text"
				id="username"
				placeholder="請輸入使用者名稱"
			/>
			<button type="submit">提交</button>
		</form>
	</body>
</html>
```

#### CSS 檔案

- **註解**：說明樣式用途和設計理念
- **Class 名稱**：保持英文，但在註解中說明用途

```css
/* 主要導航列樣式 */
.main-navigation {
	background-color: #333;
	padding: 1rem;
}

/* 回應式設計：平板和手機裝置 */
@media (max-width: 768px) {
	.main-navigation {
		/* 在小螢幕上隱藏導航文字，只顯示圖示 */
		font-size: 0;
	}
}
```

### 4. 句式與語氣規範

- 使用**台灣書面語**，避免大陸官樣文或口語化表達
- 語氣親切但專業，避免過度正式
- 優先使用主動語態和簡潔句式

**句式對照**：

- ✅ 推薦：「請檢查此設定是否正確」
- ❌ 避免：「請檢查該配置是否正確」
- ✅ 推薦：「建議您執行以下步驟」
- ❌ 避免：「建議您执行如下步骤」

### 5. 標點符號與格式規範

- **中文內容**：使用全形標點符號（「，」、「。」、「：」、「；」）
- **英文內容**：保持半形標點符號（`,`, `.`, `:`, `;`）
- **混合內容**：中英文之間適當留空格
- **數字表達**：使用阿拉伯數字 + 中文單位（例：2025 年、3 個步驟、第 1 項）

## Markdown 檔案格式要求

### 檔案命名規範

- **指令檔案**：`[主題].instructions.md`（例：`react.instructions.md`）
- **提示檔案**：`[功能].prompt.md`（例：`create-component.prompt.md`）
- **翻譯專用**：`copilot-translation-instructions.md`

### 內容結構保持

- **完整保留** Markdown 結構：標題層級、清單格式、程式碼區塊
- **翻譯順序**：從標題到內文，由上而下逐步翻譯
- **代碼區塊**：程式碼內容保持英文，僅翻譯註解和說明文字
- **連結處理**：翻譯連結文字，URL 保持原狀

### YAML Frontmatter 處理

```yaml
---
applyTo: "**/*.{tsx,jsx}" # 保持英文
description: "React 元件開發指引" # 翻譯成中文
---
```

## 實用翻譯範例

### 基礎指令翻譯

**原文**：

```markdown
## Database Instructions

- Use parameterized queries to prevent SQL injection
- Implement proper indexing strategies
- Include audit fields in all entities
```

**翻譯**：

```markdown
## 資料庫操作指引

- 使用參數化查詢以防止 SQL 注入攻擊
- 實作適當的索引策略
- 在所有實體中包含稽核欄位
```

### 進階提示翻譯

**原文**：

```markdown
# Create React Component

Generate a new React component with TypeScript support and comprehensive testing.
```

**翻譯**：

```markdown
# 建立 React 元件

產生一個新的 React 元件，包含 TypeScript 支援和完整的測試。
```

### 技術說明翻譯

**原文**：

```markdown
## API Endpoint Guidelines

- Return meaningful HTTP status codes
- Implement proper error handling middleware
- Use JWT tokens for authentication
```

**翻譯**：

```markdown
## API 端點指引

- 回傳有意義的 HTTP 狀態碼
- 實作適當的錯誤處理中介軟體
- 使用 JWT Token 進行身分驗證
```

## 品質驗收標準

### 必要檢核項目

1. **字體檢查**：✅ 全文無任何簡體字
2. **用語檢查**：✅ 使用台灣常用詞彙，無大陸用語
3. **技術準確性**：✅ 專有名詞翻譯正確且一致
4. **可讀性**：✅ 在台灣語境下自然流暢
5. **格式完整**：✅ Markdown 結構完整無誤

### 常見錯誤避免

- ❌ 混用簡繁體：「軟件」→ ✅「軟體」
- ❌ 大陸用語：「文件夾」→ ✅「資料夾」
- ❌ 技術誤譯：「配置文件」→ ✅「設定檔」
- ❌ 語氣生硬：「該配置」→ ✅「此設定」

### 翻譯後自檢清單

- [ ] 通篇閱讀，確認語意連貫
- [ ] 檢查專有名詞一致性
- [ ] 確認台灣用語正確性
- [ ] 驗證 Markdown 格式完整
- [ ] 測試程式碼區塊可正常顯示

## 進階應用指引

### 團隊協作翻譯

- **建立詞彙表**：維護專案專用的中英對照表
- **版本控制**：翻譯檔案納入 Git 管理
- **同儕審查**：翻譯內容需經過 Code Review
- **持續更新**：隨英文原文更新同步翻譯

### 自動化輔助

- 可搭配翻譯工具初步轉換，但**必須人工校對**
- 建議使用此指令檔案訓練 AI 模型，提高翻譯品質
- 定期檢視和更新翻譯規範，保持與時俱進

## 全域翻譯特殊考量

### 不需翻譯的內容

- **URL 和網址**：保持原狀
- **檔案路徑**：如 `src/components/Button.tsx`
- **套件名稱**：如 `react`, `lodash`, `webpack`
- **Git 指令**：如 `git commit`, `git push`
- **環境變數名稱**：如 `NODE_ENV`, `API_KEY`
- **資料庫欄位名稱**：除非有特殊需要

### 程式碼內翻譯優先級

1. **最高優先級**：錯誤訊息、使用者介面文字
2. **高優先級**：函數和類別的 docstring/註解
3. **中等優先級**：一般程式註解
4. **低優先級**：變數名稱（通常保持英文）

### 混合語言處理

```python
# 正確範例：保持技術術語英文，翻譯說明文字
def validate_api_response(response_data):
    """
    驗證 API 回應資料格式
    檢查 JSON 結構是否符合預期的 schema
    """
    if not isinstance(response_data, dict):
        raise TypeError("API 回應必須是字典格式")

    # 檢查必要欄位是否存在
    required_fields = ['status', 'data', 'message']
    for field in required_fields:
        if field not in response_data:
            raise KeyError(f"缺少必要欄位：{field}")
```

### 文件翻譯策略

- **README.md**：完整翻譯，包括安裝說明、使用方法
- **CONTRIBUTING.md**：貢獻指南翻譯，讓本土開發者更容易參與
- **LICENSE**：通常保持原文，可在檔頭添加中文說明
- **CHANGELOG.md**：版本更新說明翻譯

## 實戰應用範例

### 專案 README.md 翻譯

````markdown
# 購物車管理系統

這是一個使用 React 和 TypeScript 開發的現代化購物車管理系統。

## 功能特色

- 🛒 商品加入購物車
- 💰 即時計算總金額
- 📱 響應式設計支援
- 🔒 安全的付款流程

## 快速開始

### 環境需求

- Node.js 18.0 或更高版本
- npm 或 yarn 套件管理器

### 安裝步驟

1. 複製專案到本機
   ```bash
   git clone https://github.com/username/shopping-cart.git
   ```
````

2. 安裝相依套件

   ```bash
   npm install
   ```

3. 啟動開發伺服器
   ```bash
   npm run dev
   ```

````

### 錯誤處理訊息翻譯
```javascript
// 使用者友善的錯誤訊息
const errorMessages = {
    INVALID_EMAIL: '請輸入有效的電子郵件地址',
    PASSWORD_TOO_SHORT: '密碼長度至少需要 8 個字元',
    NETWORK_ERROR: '網路連線發生問題，請稍後再試',
    SERVER_ERROR: '伺服器暫時無法回應，請聯絡技術支援',
    UNAUTHORIZED: '您沒有權限執行此操作',
    NOT_FOUND: '找不到您要求的資源'
};
````

---

**本指令檔案適用於所有檔案類型的中文翻譯，確保專案具備完整的台灣繁體中文在地化支援。**
