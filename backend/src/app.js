const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
require('dotenv').config();
const sequelize = require('./config/database.config');
const { initDefaultAdmin } = require('./config/init-admin');
const { ensureFileTableColumns } = require('./config/migration');
const User = require('./models/user.model');
const File = require('./models/file.model');

// 导入路由
const authRoutes = require('./routes/auth.routes');
const fileRoutes = require('./routes/file.routes');
const userRoutes = require('./routes/user.routes');

// 导入错误处理中间件
const errorHandler = require('./middlewares/error.middleware');

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

User.hasMany(File, { foreignKey: 'uploadedBy', as: 'files' });
File.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

File.addHook('afterFind', (result) => {
  const attachUploader = (item) => {
    if (!item) return;
    const uploader = item.get('uploader');
    if (uploader) {
      item.setDataValue('uploadedBy', uploader.toJSON());
    }
  };

  if (Array.isArray(result)) {
    result.forEach(attachUploader);
    return;
  }

  attachUploader(result);
});

// 中间件配置
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS 不允许该来源访问: ${origin}`));
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（用于访问上传的文件）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/users', userRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: '服务运行正常' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '请求的资源不存在' });
});

// 错误处理中间件
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_HOST = process.env.PUBLIC_HOST || (HOST === '0.0.0.0' ? 'localhost' : HOST);
const shouldAlterSchema = process.env.DB_SYNC_ALTER === 'true';
const httpsEnabled = process.env.HTTPS_ENABLED === 'true';

const createServer = () => {
  if (!httpsEnabled) {
    return {
      server: http.createServer(app),
      protocol: 'http'
    };
  }

  const keyPath = path.resolve(process.env.HTTPS_KEY_PATH || './certs/localhost-key.pem');
  const certPath = path.resolve(process.env.HTTPS_CERT_PATH || './certs/localhost-cert.pem');

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.warn(`⚠️ HTTPS 证书不存在，已自动降级为 HTTP 模式。请检查 HTTPS_KEY_PATH=${keyPath} 与 HTTPS_CERT_PATH=${certPath}`);
    return {
      server: http.createServer(app),
      protocol: 'http'
    };
  }

  return {
    server: https.createServer(
      {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      },
      app
    ),
    protocol: 'https'
  };
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync(shouldAlterSchema ? { alter: true } : undefined);
    await ensureFileTableColumns();
    await initDefaultAdmin();
    const { server, protocol } = createServer();
    console.log('✅ MySQL 数据库连接成功');
    if (shouldAlterSchema) {
      console.log('⚠️ 已启用数据库表结构自动同步（alter）');
    }
    if (protocol === 'https') {
      console.log('🔐 HTTPS 已启用');
    }

    server.listen(PORT, HOST, () => {
      console.log(`🚀 服务器运行在 ${protocol}://${PUBLIC_HOST}:${PORT}`);
      console.log(`📁 文件上传目录: ${process.env.UPLOAD_DIR}`);
    });
  } catch (err) {
    console.error('❌ MySQL 数据库连接失败:', err);
    process.exit(1);
  }
};

startServer();
