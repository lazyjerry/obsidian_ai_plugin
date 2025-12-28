#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unix PTY 腳本
用於 macOS 和 Linux 系統的偽終端實作

使用方式：
    python3 unix_pty.py <shell> [<cwd>]

範例：
    python3 unix_pty.py /bin/zsh /Users/user/project
"""

import sys
import os
import pty
import select
import signal
import json
import struct
import fcntl
import termios

def set_winsize(fd: int, rows: int, cols: int) -> None:
    """設定終端視窗大小"""
    winsize = struct.pack('HHHH', rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "缺少 shell 參數",
            "usage": "python3 unix_pty.py <shell> [<cwd>]"
        }), file=sys.stderr)
        sys.exit(1)
    
    shell = sys.argv[1]
    cwd = sys.argv[2] if len(sys.argv) > 2 else os.getcwd()
    
    # 檢查 shell 是否存在
    if not os.path.exists(shell):
        print(json.dumps({
            "error": f"Shell 不存在: {shell}"
        }), file=sys.stderr)
        sys.exit(1)
    
    # 切換工作目錄
    try:
        os.chdir(cwd)
    except OSError as e:
        print(json.dumps({
            "error": f"無法切換到目錄: {cwd}",
            "detail": str(e)
        }), file=sys.stderr)
        sys.exit(1)
    
    # 建立偽終端
    master_fd, slave_fd = pty.openpty()
    
    # 設定初始視窗大小 (80x24)
    set_winsize(slave_fd, 24, 80)
    
    # Fork 子進程
    pid = os.fork()
    
    if pid == 0:
        # 子進程：執行 shell
        os.close(master_fd)
        
        # 建立新的 session
        os.setsid()
        
        # 設定控制終端
        fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
        
        # 重新導向 stdin/stdout/stderr
        os.dup2(slave_fd, 0)
        os.dup2(slave_fd, 1)
        os.dup2(slave_fd, 2)
        
        if slave_fd > 2:
            os.close(slave_fd)
        
        # 設定環境變數
        env = os.environ.copy()
        env['TERM'] = 'xterm-256color'
        env['LC_ALL'] = 'en_US.UTF-8'
        env['LANG'] = 'en_US.UTF-8'
        
        # 執行 shell
        os.execve(shell, [shell, '-l'], env)
    
    else:
        # 父進程：處理 I/O
        os.close(slave_fd)
        
        # 輸出 PID 供 Node.js 追蹤
        print(json.dumps({"pid": pid, "status": "running"}), flush=True)
        
        # 設定 stdin 為非阻塞模式
        stdin_fd = sys.stdin.fileno()
        old_flags = fcntl.fcntl(stdin_fd, fcntl.F_GETFL)
        fcntl.fcntl(stdin_fd, fcntl.F_SETFL, old_flags | os.O_NONBLOCK)
        
        # 設定 master_fd 為非阻塞模式
        old_master_flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
        fcntl.fcntl(master_fd, fcntl.F_SETFL, old_master_flags | os.O_NONBLOCK)
        
        # 處理視窗大小調整信號
        def handle_resize(signum, frame):
            """處理 SIGWINCH 信號"""
            pass  # 由 Node.js 透過特殊命令處理
        
        signal.signal(signal.SIGWINCH, handle_resize)
        
        try:
            while True:
                # 使用 select 等待可讀資料
                rlist, _, _ = select.select([master_fd, stdin_fd], [], [], 0.1)
                
                for fd in rlist:
                    if fd == master_fd:
                        # 從 PTY 讀取並輸出到 stdout
                        try:
                            data = os.read(master_fd, 1024)
                            if data:
                                sys.stdout.buffer.write(data)
                                sys.stdout.buffer.flush()
                            else:
                                # PTY 已關閉
                                raise EOFError
                        except (OSError, EOFError):
                            raise EOFError
                    
                    elif fd == stdin_fd:
                        # 從 stdin 讀取並寫入 PTY
                        try:
                            data = os.read(stdin_fd, 1024)
                            if data:
                                # 檢查特殊控制命令
                                if data.startswith(b'\x1b[RESIZE:'):
                                    # 格式: ESC[RESIZE:rows,cols]
                                    try:
                                        cmd = data.decode('utf-8')
                                        parts = cmd.split(':')[1].rstrip(']').split(',')
                                        rows, cols = int(parts[0]), int(parts[1])
                                        set_winsize(master_fd, rows, cols)
                                        # 發送 SIGWINCH 給子進程
                                        os.kill(pid, signal.SIGWINCH)
                                    except (ValueError, IndexError):
                                        pass
                                else:
                                    os.write(master_fd, data)
                            else:
                                raise EOFError
                        except (OSError, EOFError):
                            raise EOFError
                
                # 檢查子進程是否存活
                result = os.waitpid(pid, os.WNOHANG)
                if result[0] != 0:
                    # 子進程已退出
                    exit_code = os.WEXITSTATUS(result[1]) if os.WIFEXITED(result[1]) else -1
                    print(json.dumps({"pid": pid, "status": "exited", "exitCode": exit_code}), file=sys.stderr)
                    break
        
        except EOFError:
            pass
        except KeyboardInterrupt:
            # 傳送 SIGINT 給子進程
            os.kill(pid, signal.SIGINT)
        finally:
            os.close(master_fd)
            try:
                os.kill(pid, signal.SIGTERM)
                os.waitpid(pid, 0)
            except OSError:
                pass

if __name__ == '__main__':
    main()
