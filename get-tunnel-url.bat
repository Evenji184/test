@echo off
cd /d "%~dp0"
if not exist tunnel.log (
    echo 未找到 tunnel.log，请先运行 start-tunnel.bat
    pause
    exit /b 1
)
for /f "tokens=6 delims=| " %%a in ('findstr /R /C:"https://.*\.trycloudflare\.com" tunnel.log') do (
    echo 当前 Tunnel 地址: %%a
)
if errorlevel 1 (
    echo 未找到 Tunnel 地址，请确认 cloudflared 已启动完成
    pause
)