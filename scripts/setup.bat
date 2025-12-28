@echo off
REM AI Terminal Integration - 環境檢查腳本 (Windows)
REM
REM 此腳本檢查系統是否符合執行 AI Terminal 外掛的需求

echo ================================================
echo AI Terminal Integration - 環境檢查
echo ================================================
echo.

set PASS_COUNT=0
set FAIL_COUNT=0
set WARN_COUNT=0

REM 1. 檢查 Python
echo 檢查 Python...
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo [OK] Python %PYTHON_VERSION%
    set /a PASS_COUNT+=1
) else (
    echo [FAIL] Python 未安裝
    set /a FAIL_COUNT+=1
)

REM 2. 檢查 Node.js
echo.
echo 檢查 Node.js...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js %NODE_VERSION%
    set /a PASS_COUNT+=1
) else (
    echo [WARN] Node.js 未安裝（僅開發需要）
    set /a WARN_COUNT+=1
)

REM 3. 檢查作業系統
echo.
echo 檢查作業系統...
for /f "tokens=4-5 delims=. " %%i in ('ver') do set VERSION=%%i.%%j
echo [OK] Windows %VERSION%
set /a PASS_COUNT+=1

REM 4. 檢查 PowerShell
echo.
echo 檢查 PowerShell...
where powershell >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] PowerShell 可用
    set /a PASS_COUNT+=1
) else (
    echo [WARN] PowerShell 不可用，將使用 cmd.exe
    set /a WARN_COUNT+=1
)

REM 結果摘要
echo.
echo ================================================
echo 檢查結果摘要
echo ================================================
echo 通過: %PASS_COUNT%
echo 警告: %WARN_COUNT%
echo 失敗: %FAIL_COUNT%
echo.

if %FAIL_COUNT% GTR 0 (
    echo 有 %FAIL_COUNT% 個必要條件未滿足，請先解決後再安裝外掛。
    exit /b 1
) else (
    echo 環境檢查通過！可以安裝 AI Terminal 外掛。
    exit /b 0
)
