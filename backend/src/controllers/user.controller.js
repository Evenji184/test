const { validationResult } = require('express-validator');
const User = require('../models/user.model');

const listUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    if (user.username === 'evenji' && req.body.role && req.body.role !== 'admin') {
      return res.status(400).json({ success: false, error: '默认管理员账号不能取消管理员权限' });
    }

    user.role = req.body.role;
    await user.save();

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  updateUser
};
