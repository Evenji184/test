const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// 验证JWT Token
const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: '请提供认证令牌' 
      });
    }

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        error: '用户不存在' 
      });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: '无效的认证令牌' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: '认证令牌已过期' 
      });
    }
    
    res.status(500).json({ 
      error: '认证失败' 
    });
  }
};

// 可选的认证（用于公开和私有混合的路由）
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
        req.userId = user._id;
      }
    }
    
    next();
  } catch (error) {
    // 即使token无效，也继续执行（作为未认证用户）
    next();
  }
};

// 检查是否为管理员
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: '需要管理员权限' 
    });
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  isAdmin
};