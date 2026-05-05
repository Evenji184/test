@echo off
cd /d "%~dp0"
echo 正在启动 Cloudflare Tunnel...
echo 启动后请运行 get-tunnel-url.bat 获取公网地址
cloudflared tunnel --url http://localhost:3000 --logfile tunnel.log