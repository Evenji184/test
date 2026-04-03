# 文件共享系统后台

## 项目介绍

这是一个基于 Node.js、Express 和 MySQL 的文件共享系统后台服务，负责处理用户认证、文件上传、文件下载、文件列表查询和文件删除等功能。

后台提供 RESTful API，配合前端页面实现完整的文件共享流程。当前版本采用本地文件系统存储上传文件，并使用 JWT 进行用户身份认证。

## 技术栈

- Node.js
- Express
- MySQL + Sequelize
- Multer
- JWT
- bcryptjs

## 目录结构

```text
backend/
├── .env                         # 环境变量配置
├── package.json                 # 项目依赖与脚本
├── README.md                    # 后台说明文档
├── uploads/                     # 上传文件目录（运行时生成）
└── src/
    ├── app.js                   # 应用入口
    ├── config/
    │   ├── database.config.js   # MySQL 数据库配置
    │   └── multer.config.js     # 文件上传配置
    ├── controllers/
    │   ├── auth.controller.js   # 用户认证控制器
    │   └── file.controller.js   # 文件管理控制器
    ├── middlewares/
    │   ├── auth.middleware.js   # JWT 认证中间件
    │   └── error.middleware.js  # 全局错误处理中间件
    ├── models/
    │   ├── file.model.js        # 文件数据模型
    │   └── user.model.js        # 用户数据模型
    └── routes/
        ├── auth.routes.js       # 认证路由
        └── file.routes.js       # 文件路由
```

## 核心功能

### 1. 用户认证与权限

- 管理员注册用户
- 用户登录
- 用户修改自己的密码
- 获取当前登录用户信息
- JWT 鉴权保护接口
- 基于 `role` 字段的管理员权限控制

### 1.1 角色说明

- `user`：普通用户，可登录并管理文件
- `admin`：管理员，可访问注册页、账号管理页并创建新账号

### 2. 文件管理

- 多文件上传
- 文件列表查询
- 文件下载
- 文件删除
- 个人空间与公共空间隔离
- 文件列表关键字模糊搜索
- 文件类型与大小限制
- 文件上传白名单校验与路径遍历防护

## 主要接口

### 认证接口

- `POST /api/auth/register`：管理员注册新账号（需管理员登录）
- `POST /api/auth/login`：登录
- `GET /api/auth/me`：获取当前用户信息
- `PUT /api/auth/change-password`：修改当前登录用户密码（需登录）

### 账号管理接口

- `GET /api/users`：获取账号列表（仅管理员）
- `PUT /api/users/:id`：更新账号角色（仅管理员）

### 文件接口

- `GET /api/files`：获取文件列表，支持 `space=public|personal` 与 `keyword=关键字`
- `POST /api/files/upload`：上传文件，支持 `spaceType=public|personal`
- `GET /api/files/:id/download`：下载文件
- `DELETE /api/files/:id`：删除文件

## 环境变量说明

可在 [`backend/.env`](backend/.env) 中配置：

- `PORT`：服务端口
- `HOST`：后端监听地址，默认 `0.0.0.0`，如需仅监听某个局域网 IP 可改为对应地址
- `PUBLIC_HOST`：启动日志中展示的访问地址，默认 `localhost`；若需显示局域网访问地址，可改为实际 IP
- `DB_HOST`：MySQL 主机地址，兼容 IPv4/IPv6，例如 `127.0.0.1`、`localhost`、`::1`，若使用带方括号的 IPv6 字面量如 `[::1]` 也可正常解析；如果 MySQL 与后端部署在同一台机器，本地开发通常应保持为 `127.0.0.1` 或 `localhost`
- `DB_PORT`：MySQL 端口
- `DB_FAMILY`：可选，强制地址族，`4` 表示仅 IPv4，`6` 表示仅 IPv6；不配置时自动兼容 IPv4/IPv6
- `DB_NAME`：MySQL 数据库名
- `DB_USER`：MySQL 用户名
- `DB_PASSWORD`：MySQL 密码
- `DB_SYNC_ALTER`：可选，设为 `true` 时启动阶段使用 [`sequelize.sync({ alter: true })`](backend/src/app.js:80) 自动补齐表结构，适合开发环境修复新增字段
- `JWT_SECRET`：JWT 密钥
- `JWT_EXPIRE`：JWT 过期时间
- `DEFAULT_ADMIN_PASSWORD`：默认管理员 `evenji` 的初始密码
- `DEFAULT_ADMIN_EMAIL`：默认管理员 `evenji` 的邮箱
- `UPLOAD_DIR`：上传目录
- `CLIENT_URL`：前端地址，支持多个来源，使用英文逗号分隔，例如 `http://172.21.38.119:3000,http://localhost:3000`
- `HTTPS_ENABLED`：可选，设为 `true` 时以后端 HTTPS 模式启动
- `HTTPS_KEY_PATH`：HTTPS 私钥文件路径，默认 `./certs/localhost-key.pem`
- `HTTPS_CERT_PATH`：HTTPS 证书文件路径，默认 `./certs/localhost-cert.pem`

## 启动方式

### 1. 安装依赖

```bash
npm install
```

如果是从 MongoDB 版本切换过来，需重新安装依赖以移除 [`mongoose`](backend/package.json:1) 并安装 [`mysql2`](backend/package.json:1) 与 [`sequelize`](backend/package.json:1)。

### 2. 启动 MySQL

请确保本地 MySQL 已启动，并提前创建好数据库，且连接信息与 [`backend/.env`](backend/.env) 中的 `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD` 一致。

可参考以下配置：

```env
PORT=5000
HOST=0.0.0.0
PUBLIC_HOST=localhost
DB_HOST=localhost
DB_PORT=3306
DB_FAMILY=
DB_NAME=file_share
DB_USER=root
DB_PASSWORD=123456
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=evenji@example.com
UPLOAD_DIR=uploads/
CLIENT_URL=http://localhost:5173
```

### 2.1 默认管理员账号

服务启动并完成 [`sequelize.sync()`](backend/src/app.js:77) 后，会自动检查用户名为 `evenji` 的账号：

- 若不存在，则自动创建为管理员账号
- 若已存在但不是管理员，则自动提升为管理员

默认管理员账号规则：

- 用户名：`evenji`
- 角色：`admin`
- 密码：来自 `DEFAULT_ADMIN_PASSWORD`
- 邮箱：来自 `DEFAULT_ADMIN_EMAIL`

生产环境必须修改默认管理员密码。

### 2.2 数据库地址兼容说明

数据库连接默认兼容 IPv4 与 IPv6：

- `DB_HOST=localhost`：推荐，交由系统自动解析可用地址
- `DB_HOST=127.0.0.1`：显式使用 IPv4
- `DB_HOST=::1`：显式使用 IPv6
- `DB_HOST=[::1]`：也支持带方括号的 IPv6 写法，服务启动时会自动规范化

如需强制只使用某一地址族，可额外配置：

- `DB_FAMILY=4`：仅使用 IPv4
- `DB_FAMILY=6`：仅使用 IPv6

### 2.3 表结构同步说明

当升级版本后新增了模型字段（例如 [`spaceType`](backend/src/models/file.model.js:56)）而数据库中的旧表尚未更新时，MySQL 可能报错：`Unknown column 'File.spaceType' in 'field list'`。

当前版本启动时会自动执行 [`backend/src/config/migration.js`](backend/src/config/migration.js) 中的兜底迁移逻辑，检测 [`files`](backend/src/models/file.model.js:85) 表是否缺少 `spaceType`、`isPublic` 等关键字段；如果缺失，会自动补齐，无需手工改表。

开发环境如需让 Sequelize 继续自动对齐更多模型变更，可临时在 [`backend/.env`](backend/.env) 中加入：

```env
DB_SYNC_ALTER=true
```

服务启动时会先执行 [`sequelize.sync({ alter: true })`](backend/src/app.js:81)，随后再运行自动字段补齐逻辑。字段补齐完成后，建议将该配置移除或改回空值，避免后续启动时持续自动改表。

### 3. 启动开发服务

```bash
npm run dev
```

### 3.1 HTTPS 启动说明

默认情况下，后端以 HTTP 模式启动，适合本地开发。如需直接由 Express 提供 HTTPS，可在 [`backend/.env`](backend/.env) 中配置：

```env
HTTPS_ENABLED=true
HTTPS_KEY_PATH=./certs/localhost-key.pem
HTTPS_CERT_PATH=./certs/localhost-cert.pem
```

开发环境可先创建 [`backend/certs`](backend/certs) 目录，再生成自签名证书：

```bash
mkdir certs
openssl req -x509 -newkey rsa:4096 -keyout certs/localhost-key.pem -out certs/localhost-cert.pem -days 365 -nodes -subj "/CN=localhost"
```

服务启动时会在 [`backend/src/app.js`](backend/src/app.js:82) 中按配置创建 HTTPS Server；若证书文件不存在，会输出警告并自动降级为 HTTP 模式，不会阻塞普通开发启动。开发环境建议使用自签名证书，生产环境更推荐由 Nginx、Caddy 等反向代理终止 HTTPS。

### 3.2 局域网访问说明

如果需要让同一局域网内的其他设备访问后端，可在 [`backend/.env`](backend/.env) 中配置：

```env
HOST=0.0.0.0
PUBLIC_HOST=172.21.38.119
CLIENT_URL=http://172.21.38.119:3000
```

- [`HOST`](backend/.env) 控制服务实际监听的网卡地址，通常保留 `0.0.0.0` 即可监听所有网卡
- [`PUBLIC_HOST`](backend/.env) 控制启动日志中显示的访问地址
- [`CLIENT_URL`](backend/.env) 需要与前端实际访问地址保持一致，避免 CORS 拦截
- [`DB_HOST`](backend/.env) 是 MySQL 地址，不等于前端或后端的局域网访问地址；如果数据库仍运行在当前机器本地，不应改成局域网 IP

### 4. 生产模式启动

```bash
npm start
```

## 说明

- 上传文件默认保存在 `uploads/` 目录
- 上传允许任意文件类型，单文件大小仍限制为 10MB，服务端会保留原始扩展名生成安全文件名
- 单文件大小限制为 10MB，服务端会为文件生成随机安全文件名
- 文件支持上传到“公共空间”或“个人空间”，普通用户只能查看自己的个人空间文件，管理员可查看所有人的个人空间文件
- 文件列表支持按文件名、存储名或 MIME 类型进行模糊搜索
- 下载与删除前会校验文件真实路径必须位于 [`uploads/`](backend/uploads) 目录内，防止路径遍历
- 注册页和账号管理页仅管理员可访问
- 注册时会校验 `username` 与 `email` 是否重复
- 已登录用户可在首页打开修改密码弹窗，提交旧密码和新密码完成密码更新
- 前端在检测到未登录或令牌失效时会自动跳转到 [`/login`](frontend/src/pages/LoginPage.tsx:5)
- 当前版本使用本地存储，后续可扩展为云存储
- 若 MySQL 未启动或连接信息错误，服务会在数据库连接阶段报错
- 当 `HTTPS_ENABLED=true` 时，后端访问地址会切换为 `https://localhost:端口`
