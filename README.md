# 文件共享系统

基于 Node.js + Express + MySQL + Sequelize 后端 / React + TypeScript + Vite 前端的文件共享平台，支持分块上传/断点续传、公开/个人空间、JWT 认证、管理员用户管理。

## 目录结构

```
File_Sharing_System/
├── backend/          后端服务（Express + Sequelize + MySQL）
│   ├── src/
│   │   ├── app.js           入口 & 启动流程
│   │   ├── config/          数据库、multer、迁移、初始管理员配置
│   │   ├── models/          user.model.js、file.model.js
│   │   ├── routes/          auth、files、users 路由
│   │   ├── middlewares/     auth、error 中间件
│   │   └── services/        业务逻辑
│   ├── certs/               HTTPS 自签名证书（备用）
│   ├── uploads/             上传文件存储目录（gitignore）
│   └── .env                 后端环境变量（gitignore，需手动创建）
├── frontend/          前端（React + Vite + TypeScript）
│   ├── src/
│   │   ├── pages/           页面组件
│   │   ├── services/        api.ts（axios 封装）
│   │   └── components/      UI 组件
│   ├── .env.development     开发环境变量
│   └── .env.production      生产环境变量
├── start-tunnel.bat   一键启动 Cloudflare Tunnel
├── get-tunnel-url.bat 获取当前 Tunnel 公网地址
└── .gitignore
```

## 环境依赖

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 18 | 推荐 v20+ |
| MySQL | >= 5.7 | 字符集 utf8mb4 |
| cloudflared | 最新 | 公网映射（可选） |
| OpenSSL | 任意 | 生成 HTTPS 证书（可选） |

npm 包由各子目录 `package.json` 管理，无需全局安装额外包。

## 快速开始

### 1. 创建 MySQL 数据库

用 root 或有建库权限的账号登录 MySQL：

```sql
CREATE DATABASE file_share_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

创建项目专用用户（如尚未创建）：

```sql
CREATE USER 'evenji'@'localhost' IDENTIFIED BY 'evenji';
GRANT ALL PRIVILEGES ON file_share_db.* TO 'evenji'@'localhost';
FLUSH PRIVILEGES;
```

验证：

```bash
mysql -u evenji -p -e "USE file_share_db; SHOW TABLES;"
```

### 2. 配置后端环境变量

复制或创建 `backend/.env`，按实际环境修改：

```env
# 环境变量配置
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
PUBLIC_HOST=localhost

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_FAMILY=
DB_NAME=file_share_db
DB_USER=evenji
DB_PASSWORD=evenji
DB_SYNC_ALTER=false

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRE=7d

# 文件上传
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# CORS（逗号分隔多个前端地址）
CLIENT_URL=http://localhost:3000,http://127.0.0.1:3000

# HTTPS（开发环境建议关闭，公网映射由 tunnel 提供 HTTPS）
HTTPS_ENABLED=false
HTTPS_KEY_PATH=./certs/localhost-key.pem
HTTPS_CERT_PATH=./certs/localhost-cert.pem

# 默认管理员
DEFAULT_ADMIN_PASSWORD=admin123456
DEFAULT_ADMIN_EMAIL=admin@example.com
```

> 启动时必须存在的变量：`DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`、`JWT_SECRET`，缺失则服务立即退出。

### 3. 安装依赖并启动

```bash
# 后端
cd backend
npm install
npm run dev      # nodemon 开发模式
# 或
npm start        # 生产模式

# 前端
cd frontend
npm install
npm run dev      # Vite 开发服务器，默认 localhost:3000
# 或
npm run build    # 构建 dist/
npm run preview  # 预览构建产物
```

启动顺序：**先启动后端，再启动前端**。后端会自动建表和创建默认管理员。

### 4. 默认管理员账号

| 字段 | 值 |
|------|----|
| 用户名 | `evenji` |
| 邮箱 | 由 `DEFAULT_ADMIN_EMAIL` 决定 |
| 密码 | 由 `DEFAULT_ADMIN_PASSWORD` 决定 |
| 角色 | `admin` |

首次启动后可用此账号登录并注册其他用户。

## 公网访问（Cloudflare Tunnel）

### 启动 Tunnel

```bash
start-tunnel.bat
```

这会启动 `cloudflared tunnel --url http://localhost:3000`，日志写入 `tunnel.log`。

### 获取公网地址

另开终端：

```bash
get-tunnel-url.bat
```

输出格式：`https://xxx-xxx.trycloudflare.com`

> Quick Tunnel 地址每次重启会变化。后端 CORS 已自动放行 `*.trycloudflare.com`，无需手动更新白名单。

### 公网访问路径

```
浏览器 → https://xxx.trycloudflare.com（tunnel 提供 HTTPS）
         → http://localhost:3000（前端 Vite dev server）
         → http://127.0.0.1:5000（后端，Vite 内部 proxy，无跨域问题）
```

因此后端无需开启 HTTPS，tunnel 链路已经覆盖。

## HTTPS 配置（可选）

后端支持 HTTPS，但开发环境 + tunnel 场景下不需要开启。仅在需要后端直接对外提供服务时启用。

### 生成自签名证书

```bash
cd backend

# Linux / macOS
openssl req -x509 -newkey rsa:4096 -keyout certs/localhost-key.pem -out certs/localhost-cert.pem -days 365 -nodes -subj "/CN=localhost"

# Windows（避免路径问题，用配置文件方式）
openssl req -x509 -newkey rsa:4096 -keyout certs/localhost-key.pem -out certs/localhost-cert.pem -days 365 -nodes -config certs/openssl.cnf
```

### 启用 HTTPS

修改 `backend/.env`：

```env
HTTPS_ENABLED=true
```

如证书文件不存在，服务会自动降级为 HTTP 并输出警告。

## 局域网访问

修改 `backend/.env` 中的以下项：

```env
HOST=0.0.0.0                  # 监听所有网卡
PUBLIC_HOST=192.168.x.x       # 你的局域网 IP
CLIENT_URL=http://192.168.x.x:3000,http://localhost:3000
```

前端 `.env.development` 无需修改，Vite 已配置 `0.0.0.0` 监听。

## 数据库表结构

### users 表

| 列 | 类型 | 说明 |
|----|------|------|
| id | INTEGER, PK, 自增 | |
| username | STRING(30), unique | 最少 3 字符 |
| email | STRING(255), unique | 自动转小写 |
| password | STRING(255) | bcrypt 加密，默认查询不返回 |
| role | ENUM('user','admin') | 默认 user |
| lastLogin | DATE | |
| createdAt | DATE | |

### files 表

| 列 | 类型 | 说明 |
|----|------|------|
| id | INTEGER, PK, 自增 | |
| filename | STRING(255) | 安全生成的存储名 |
| originalName | STRING(255) | 用户原始文件名 |
| mimetype | STRING(255) | |
| size | BIGINT | 文件大小（字节） |
| path | STRING(500) | 存储路径，JSON 输出时排除 |
| uploadedBy | INTEGER, FK→users.id | |
| spaceType | ENUM('personal','public') | 默认 personal |
| isPublic | BOOLEAN | 默认 false |
| sharedWith | JSON | 默认 [] |
| downloads | INTEGER | 默认 0 |
| description | STRING(500) | |
| tags | JSON | 默认 [] |
| uploadId | STRING(100) | 分块上传会话 ID |
| totalChunks | INTEGER | 总块数 |
| uploadedChunks | JSON | 已上传块索引 |
| uploadStatus | ENUM('uploading','completed','failed') | 默认 completed |
| chunkSize | INTEGER | |
| createdAt / updatedAt | DATE | |

> 启动时 `migration.js` 会自动补齐缺失的列，无需手动迁移。

## 关键配置说明

| 项 | 默认值 | 说明 |
|----|--------|------|
| 前端端口 | 3000 | `.env.development` 的 `VITE_DEV_SERVER_PORT` |
| 后端端口 | 5000 | `.env` 的 `PORT` |
| 分块上传大小 | 2 MB / 块 | 前端常量 `CHUNK_SIZE` |
| 最大并发上传 | 3 块 | 前端常量 `MAX_CONCURRENT_CHUNKS` |
| 最大文件大小 | 10 MB | `.env` 的 `MAX_FILE_SIZE`（小文件上传） |
| multer 批量上限 | 20 文件/请求 | `multer.config.js` |
| JWT 过期 | 7 天 | `.env` 的 `JWT_EXPIRE` |