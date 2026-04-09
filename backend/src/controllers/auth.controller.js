const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const User = require('../models/user.model');

const normalizeEmail = (email) => email?.trim().toLowerCase();
const normalizeUsername = (username) => username?.trim();

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const existingUsers = await User.findAll({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUsers.length > 0) {
      const duplicatedUsername = existingUsers.some((item) => item.username === username);
      const duplicatedEmail = existingUsers.some((item) => item.email === email);

      if (duplicatedUsername && duplicatedEmail) {
        return res.status(400).json({ success: false, error: '用户名和邮箱均已存在' });
      }

      if (duplicatedUsername) {
        return res.status(400).json({ success: false, error: '用户名已存在' });
      }

      if (duplicatedEmail) {
        return res.status(400).json({ success: false, error: '邮箱已存在' });
      }
    }

    const user = await User.create({ username, email, password });
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    console.log('[Auth] 登录请求', { email });

    const user = await User.scope('withPassword').findOne({ where: { email } });
    if (!user) {
      console.warn('[Auth] 登录失败 - 用户不存在或邮箱错误', { email });
      return res.status(401).json({ success: false, error: '邮箱或密码错误' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn('[Auth] 登录失败 - 密码错误', { email, userId: user.id });
      return res.status(401).json({ success: false, error: '邮箱或密码错误' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user.id, user.role);

    console.log('[Auth] 登录成功', {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
};

const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { oldPassword, newPassword } = req.body;
    const user = await User.scope('withPassword').findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: '旧密码错误' });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  changePassword
};
