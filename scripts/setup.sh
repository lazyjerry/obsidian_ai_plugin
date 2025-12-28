#!/bin/bash
#
# AI Terminal Integration - 環境檢查腳本 (Unix)
#
# 此腳本檢查系統是否符合執行 AI Terminal 外掛的需求

set -e

echo "================================================"
echo "AI Terminal Integration - 環境檢查"
echo "================================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查結果
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# 檢查函數
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    PASS_COUNT=$((PASS_COUNT+1))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    FAIL_COUNT=$((FAIL_COUNT+1))
}

check_warn() {
    echo -e "${YELLOW}!${NC} $1"
    WARN_COUNT=$((WARN_COUNT+1))
}

# 1. 檢查 Python
echo "檢查 Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
    
    if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 10 ]; then
        check_pass "Python $PYTHON_VERSION (需要 3.10+)"
    else
        check_fail "Python $PYTHON_VERSION (需要 3.10+)"
    fi
else
    check_fail "Python 未安裝"
fi

# 2. 檢查 Node.js
echo ""
echo "檢查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
    
    if [ "$NODE_MAJOR" -ge 18 ]; then
        check_pass "Node.js $NODE_VERSION (需要 18+)"
    else
        check_warn "Node.js $NODE_VERSION (建議 18+)"
    fi
else
    check_warn "Node.js 未安裝（僅開發需要）"
fi

# 3. 檢查 Shell
echo ""
echo "檢查 Shell..."
SHELL_NAME=$(basename "$SHELL")
check_pass "預設 Shell: $SHELL_NAME"

# 4. 檢查作業系統
echo ""
echo "檢查作業系統..."
OS_NAME=$(uname -s)
case "$OS_NAME" in
    Darwin)
        check_pass "作業系統: macOS"
        ;;
    Linux)
        check_pass "作業系統: Linux"
        ;;
    *)
        check_warn "作業系統: $OS_NAME (可能不完全支援)"
        ;;
esac

# 5. 檢查 PTY 模組
echo ""
echo "檢查 Python PTY 模組..."
if python3 -c "import pty" 2>/dev/null; then
    check_pass "Python pty 模組可用"
else
    check_fail "Python pty 模組不可用"
fi

# 6. 檢查 Python fcntl 模組（Unix 專用）
if python3 -c "import fcntl" 2>/dev/null; then
    check_pass "Python fcntl 模組可用"
else
    check_warn "Python fcntl 模組不可用（調整終端大小可能受限）"
fi

# 7. 檢查 Obsidian 安裝（可選）
echo ""
echo "檢查 Obsidian..."
if [ -d "/Applications/Obsidian.app" ] || [ -d "$HOME/Applications/Obsidian.app" ]; then
    check_pass "Obsidian 已安裝 (macOS)"
elif [ -d "/opt/Obsidian" ] || [ -f "/usr/bin/obsidian" ]; then
    check_pass "Obsidian 已安裝 (Linux)"
else
    check_warn "無法偵測 Obsidian 安裝位置"
fi

# 結果摘要
echo ""
echo "================================================"
echo "檢查結果摘要"
echo "================================================"
echo -e "${GREEN}通過${NC}: $PASS_COUNT"
echo -e "${YELLOW}警告${NC}: $WARN_COUNT"
echo -e "${RED}失敗${NC}: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}有 $FAIL_COUNT 個必要條件未滿足，請先解決後再安裝外掛。${NC}"
    exit 1
else
    echo -e "${GREEN}環境檢查通過！可以安裝 AI Terminal 外掛。${NC}"
    exit 0
fi
