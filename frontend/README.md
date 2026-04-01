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

前端默认通过 [`frontend/src/services/api.ts`](frontend/src/services/api.ts) 访问：

- `http://localhost:5000/api/auth/*`
- `http://localhost:5000/api/files/*`

如需修改后端地址，可调整 [`api`](frontend/src/services/api.ts:3) 中的 `baseURL`。

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

### 3. 构建生产版本

```bash
npm run build
```

## 说明

- 登录成功后，token 会保存在浏览器 `localStorage`
- 上传、删除、获取文件列表等请求会自动携带 token
- 当前界面为基础功能版本，后续可继续扩展注册页、文件搜索、分页、分享链接等能力
