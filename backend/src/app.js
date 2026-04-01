const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();
const sequelize = require('./config/database.config');
const User = require('./models/user.model');
const File = require('./models/file.model');

// 导入路由
const authRoutes = require('./routes/auth.routes');
const fileRoutes = require('./routes/file.routes');

// 导入错误处理中间件
const errorHandler = require('./middlewares/error.middleware');

const app = express();

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
  origin: process.env.CLIENT_URL,
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

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('✅ MySQL 数据库连接成功');

    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📁 文件上传目录: ${process.env.UPLOAD_DIR}`);
    });
  } catch (err) {
    console.error('❌ MySQL 数据库连接失败:', err);
    process.exit(1);
  }
};

startServer();
