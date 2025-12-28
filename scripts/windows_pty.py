#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Windows PTY 腳本
用於 Windows 系統的偽終端實作（使用 ConPTY API）

使用方式：
    python windows_pty.py <shell> [<cwd>]

範例：
    python windows_pty.py cmd.exe C:\\Users\\user\\project

注意：此腳本需要 Windows 10 1809 或更高版本（支援 ConPTY）
"""

import sys
import os
import json
import subprocess
import threading
import signal

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "缺少 shell 參數",
            "usage": "python windows_pty.py <shell> [<cwd>]"
        }), file=sys.stderr)
        sys.exit(1)
    
    shell = sys.argv[1]
    cwd = sys.argv[2] if len(sys.argv) > 2 else os.getcwd()
    
    # 檢查工作目錄
    if not os.path.isdir(cwd):
        print(json.dumps({
            "error": f"目錄不存在: {cwd}"
        }), file=sys.stderr)
        sys.exit(1)
    
    # 設定環境變數
    env = os.environ.copy()
    env['TERM'] = 'xterm-256color'
    
    # 使用 subprocess 啟動 shell（簡化版，不使用 ConPTY）
    # 完整 ConPTY 實作需要額外的 Windows API 呼叫
    try:
        process = subprocess.Popen(
            shell,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=cwd,
            env=env,
            shell=True,
            bufsize=0,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
        )
        
        # 輸出 PID
        print(json.dumps({"pid": process.pid, "status": "running"}), flush=True)
        
        # 建立輸出讀取執行緒
        def read_output():
            """讀取子進程輸出"""
            try:
                while True:
                    data = process.stdout.read(1)
                    if not data:
                        break
                    sys.stdout.buffer.write(data)
                    sys.stdout.buffer.flush()
            except Exception:
                pass
        
        output_thread = threading.Thread(target=read_output, daemon=True)
        output_thread.start()
        
        # 讀取 stdin 並寫入子進程
        try:
            while True:
                data = sys.stdin.buffer.read(1)
                if not data:
                    break
                
                # 檢查特殊控制命令（視窗大小調整）
                if data == b'\x1b':
                    # 可能是 ESC 序列
                    peek = sys.stdin.buffer.read(7)
                    if peek.startswith(b'[RESIZE:'):
                        # 跳過視窗大小調整命令（Windows 簡化版不支援）
                        while True:
                            c = sys.stdin.buffer.read(1)
                            if c == b']':
                                break
                        continue
                    else:
                        data += peek
                
                if process.poll() is not None:
                    break
                
                process.stdin.write(data)
                process.stdin.flush()
        
        except (BrokenPipeError, EOFError):
            pass
        except KeyboardInterrupt:
            process.terminate()
        
        # 等待進程結束
        exit_code = process.wait()
        print(json.dumps({"pid": process.pid, "status": "exited", "exitCode": exit_code}), file=sys.stderr)
    
    except FileNotFoundError:
        print(json.dumps({
            "error": f"Shell 不存在: {shell}"
        }), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "error": f"啟動失敗: {str(e)}"
        }), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
