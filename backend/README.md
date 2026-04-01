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

### 1. 用户认证

- 用户注册
- 用户登录
- 获取当前登录用户信息
- JWT 鉴权保护接口

### 2. 文件管理

- 多文件上传
- 文件列表查询
- 文件下载
- 文件删除
- 文件类型与大小限制

## 主要接口

### 认证接口

- `POST /api/auth/register`：注册
- `POST /api/auth/login`：登录
- `GET /api/auth/me`：获取当前用户信息

### 文件接口

- `GET /api/files`：获取文件列表
- `POST /api/files/upload`：上传文件
- `GET /api/files/:id/download`：下载文件
- `DELETE /api/files/:id`：删除文件

## 环境变量说明

可在 [`backend/.env`](backend/.env) 中配置：

- `PORT`：服务端口
- `DB_HOST`：MySQL 主机地址
- `DB_PORT`：MySQL 端口
- `DB_NAME`：MySQL 数据库名
- `DB_USER`：MySQL 用户名
- `DB_PASSWORD`：MySQL 密码
- `JWT_SECRET`：JWT 密钥
- `JWT_EXPIRE`：JWT 过期时间
- `MAX_FILE_SIZE`：单文件大小限制
- `UPLOAD_DIR`：上传目录
- `CLIENT_URL`：前端地址

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
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=file_share
DB_USER=root
DB_PASSWORD=123456
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads/
CLIENT_URL=http://localhost:5173
```

### 3. 启动开发服务

```bash
npm run dev
```

### 4. 生产模式启动

```bash
npm start
```

## 说明

- 上传文件默认保存在 `uploads/` 目录
- 当前版本使用本地存储，后续可扩展为云存储
- 若 MySQL 未启动或连接信息错误，服务会在数据库连接阶段报错
