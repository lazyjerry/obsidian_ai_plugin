#!/bin/bash
#
# AI Terminal Integration - 快速部署腳本
#
# 用法: ./scripts/deploy.sh [目標路徑]
# 
# 範例:
#   ./scripts/deploy.sh                                    # 使用預設路徑
#   ./scripts/deploy.sh ~/my-vault/.obsidian/plugins      # 指定路徑

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 外掛名稱
PLUGIN_NAME="obsidian-ai-terminal"

# 取得腳本所在目錄的父目錄（專案根目錄）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 載入 .env 檔案（如果存在）
ENV_FILE="$PROJECT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    # 讀取 .env 檔案，使用 source 處理含空格的路徑
    set -a
    source "$ENV_FILE"
    set +a
fi

# 預設目標路徑（如果 .env 未設定）
DEFAULT_TARGET="${DEPLOY_TARGET:-}"

# 如果沒有設定目標路徑，顯示錯誤
if [ -z "$DEFAULT_TARGET" ] && [ -z "$1" ]; then
    echo -e "${RED}錯誤: 未設定部署目標路徑${NC}"
    echo ""
    echo -e "${YELLOW}請執行以下步驟:${NC}"
    echo "  1. 複製 .env.example 為 .env"
    echo "     cp .env.example .env"
    echo ""
    echo "  2. 編輯 .env 設定您的 Obsidian 外掛目錄"
    echo ""
    echo -e "${YELLOW}或直接指定路徑:${NC}"
    echo "  ./scripts/deploy.sh ~/your-vault/.obsidian/plugins"
    exit 1
fi

# 使用參數或環境變數路徑
TARGET_BASE="${1:-$DEFAULT_TARGET}"
TARGET_DIR="$TARGET_BASE/$PLUGIN_NAME"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}AI Terminal Integration - 部署腳本${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# 檢查專案目錄
echo -e "${YELLOW}專案目錄:${NC} $PROJECT_DIR"
echo -e "${YELLOW}目標目錄:${NC} $TARGET_DIR"
echo ""

# 執行建置
echo -e "${BLUE}執行建置...${NC}"
cd "$PROJECT_DIR"
if npm run build; then
    echo -e "${GREEN}✓${NC} 建置成功"
else
    echo -e "${RED}✗${NC} 建置失敗"
    exit 1
fi
echo ""

# 檢查必要檔案是否存在
echo -e "${BLUE}檢查建置檔案...${NC}"

REQUIRED_FILES=("main.js" "manifest.json" "styles.css")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$PROJECT_DIR/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${RED}錯誤: 建置後仍缺少必要檔案:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo -e "  - $file"
    done
    exit 1
fi

echo -e "${GREEN}✓${NC} 所有必要檔案已就緒"
echo ""

# 建立目標目錄
echo -e "${BLUE}建立目標目錄...${NC}"
mkdir -p "$TARGET_DIR"
mkdir -p "$TARGET_DIR/scripts"
echo -e "${GREEN}✓${NC} 目標目錄已建立"
echo ""

# 複製檔案
echo -e "${BLUE}複製檔案...${NC}"

# 主要檔案
cp "$PROJECT_DIR/main.js" "$TARGET_DIR/"
echo -e "  ${GREEN}✓${NC} main.js"

cp "$PROJECT_DIR/manifest.json" "$TARGET_DIR/"
echo -e "  ${GREEN}✓${NC} manifest.json"

cp "$PROJECT_DIR/styles.css" "$TARGET_DIR/"
echo -e "  ${GREEN}✓${NC} styles.css"

# Python 腳本
if [ -d "$PROJECT_DIR/scripts" ]; then
    cp "$PROJECT_DIR/scripts/unix_pty.py" "$TARGET_DIR/scripts/" 2>/dev/null && \
        echo -e "  ${GREEN}✓${NC} scripts/unix_pty.py" || true
    
    cp "$PROJECT_DIR/scripts/windows_pty.py" "$TARGET_DIR/scripts/" 2>/dev/null && \
        echo -e "  ${GREEN}✓${NC} scripts/windows_pty.py" || true
fi

echo ""

# 顯示結果
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "外掛已部署到: ${BLUE}$TARGET_DIR${NC}"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo "  1. 重新啟動 Obsidian"
echo "  2. 或在設定中停用再啟用外掛"
echo ""

# 列出已複製的檔案
echo -e "${BLUE}已部署檔案:${NC}"
ls -la "$TARGET_DIR"
echo ""

if [ -d "$TARGET_DIR/scripts" ]; then
    echo -e "${BLUE}腳本檔案:${NC}"
    ls -la "$TARGET_DIR/scripts"
fi
