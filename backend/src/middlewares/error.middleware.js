// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
  // 设置默认错误状态码
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';

  // Sequelize验证错误
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    const errors = err.errors.map((e) => e.message);
    message = `验证失败: ${errors.join(', ')}`;
  }

  // Sequelize唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    const fields = Object.keys(err.fields || {});
    message = fields.length > 0 ? `${fields.join(', ')}已存在` : '数据已存在';
  }

  // Sequelize外键约束错误
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = '关联数据不存在，请检查用户信息是否有效';
  }

  // Sequelize数据库错误
  if (err.name === 'SequelizeDatabaseError') {
    statusCode = 400;
    message = `数据库操作失败: ${err.message}`;
  }

  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(e => e.message);
    message = `验证失败: ${errors.join(', ')}`;
  }

  // Mongoose重复键错误
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field}已存在`;
  }

  // Mongoose Cast错误
  if (err.name === 'CastError') {
    statusCode = 400;
    message = '无效的ID格式';
  }

  // Multer文件上传错误
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = '文件大小超过限制';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = '文件数量超过限制';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = '不允许的文件字段';
    } else {
      message = '文件上传失败';
    }
  }

  // 开发环境下输出详细错误信息
  if (process.env.NODE_ENV === 'development') {
    console.error('错误详情:', err);
  }

  // 发送错误响应
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
