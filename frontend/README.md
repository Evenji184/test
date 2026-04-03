# 文件共享系统前端

## 项目介绍

这是一个基于 React、TypeScript 和 Vite 的文件共享系统前端项目，用于配合后台服务完成用户登录、文件上传、文件列表展示、文件下载和文件删除等操作。

前端通过 Axios 调用后台 API，并通过本地存储保存 JWT 令牌，实现基础的登录态管理。

## 技术栈

- React
- TypeScript
- Vite
- React Router
- Axios

## 目录结构

```text
frontend/
├── index.html                   # HTML 入口文件
├── package.json                 # 项目依赖与脚本
├── README.md                    # 前端说明文档
├── tsconfig.json                # TypeScript 配置
├── vite.config.ts               # Vite 配置
└── src/
    ├── App.tsx                  # 根组件与路由入口
    ├── main.tsx                 # 前端启动入口
    ├── styles.css               # 全局样式
    ├── components/
    │   ├── FileList.tsx         # 文件列表组件
    │   └── FileUpload.tsx       # 文件上传组件
    ├── pages/
    │   ├── DashboardPage.tsx    # 文件管理主页
    │   └── LoginPage.tsx        # 登录页
    └── services/
        ├── api.ts               # Axios 实例封装
        ├── authService.ts       # 认证接口服务
        └── fileService.ts       # 文件接口服务
```

## 页面与功能

### 1. 登录页

- 输入邮箱和密码
- 调用后台登录接口
- 登录成功后保存 token

### 2. 文件管理页

- 上传一个或多个文件
- 获取文件列表
- 下载文件
- 删除文件

## 接口调用说明

前端当前支持通过环境变量配置开发地址、代理目标和生产 API 地址。

### 开发环境

开发环境默认使用 [`/api`](frontend/src/services/api.ts) 相对路径，并由 [`frontend/vite.config.ts`](frontend/vite.config.ts) 代理到后端，避免浏览器直接跨域访问后端端口。

可在 [`frontend/.env.development`](frontend/.env.development) 中配置：

- `VITE_DEV_SERVER_HOST`：前端开发服务器监听地址，默认 `0.0.0.0`
- `VITE_DEV_SERVER_PORT`：前端开发服务器端口，默认 `3000`
- `VITE_API_PROXY_TARGET`：开发环境 API 代理目标，例如 `http://127.0.0.1:5000`
- `VITE_API_BASE_URL`：可选；如填写则会覆盖默认代理逻辑

### 生产环境

生产环境下，前端会优先读取 [`VITE_API_BASE_URL`](frontend/.env.production)；如果未配置，则自动回退为 `当前页面协议 + 当前主机名 + :5000/api`。

例如从 `http://172.21.38.119:3000` 打开前端时，默认会回退为 `http://172.21.38.119:5000/api`。

前端请求已在 [`frontend/src/services/api.ts`](frontend/src/services/api.ts) 中启用 `withCredentials`，以匹配后端的跨域凭证配置，避免局域网访问时登录请求被浏览器拦截。

## 启动方式

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

默认访问地址：`http://localhost:3000`

Vite 开发服务已在 [`frontend/vite.config.ts`](frontend/vite.config.ts) 中支持通过环境变量配置监听地址与端口，因此可通过局域网 IP 访问，例如 `http://172.21.38.119:3000`。

如后端启用了 HTTPS，前端请求地址也会默认跟随当前页面协议；若前后端地址不一致，可通过 `VITE_API_BASE_URL=https://你的后端地址:5000/api` 显式指定。

推荐的开发环境配置示例：

```env
VITE_DEV_SERVER_HOST=0.0.0.0
VITE_DEV_SERVER_PORT=3000
VITE_API_PROXY_TARGET=http://127.0.0.1:5000
VITE_API_BASE_URL=
```

推荐的生产环境配置示例：

```env
VITE_API_BASE_URL=http://172.21.38.119:5000/api
```

### 3. 构建生产版本

```bash
npm run build
```

## 说明

- 登录成功后，token 会保存在浏览器 `localStorage`
- 上传、删除、获取文件列表等请求会自动携带 token
- 当前样式已补充移动端适配，重点优化了首页卡片、文件列表、弹窗操作区和账号管理表格在手机上的显示效果
- 账号管理页在窄屏下会保留横向滚动，避免表格内容被压缩错位
- 当前界面为基础功能版本，后续可继续扩展注册页、文件搜索、分页、分享链接等能力
