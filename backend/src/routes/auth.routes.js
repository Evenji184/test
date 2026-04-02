const express = require('express');
const { body } = require('express-validator');
const { register, login, getProfile, changePassword } = require('../controllers/auth.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post(
  '/register',
  authenticate,
  isAdmin,
  [
    body('username').isLength({ min: 3 }).withMessage('用户名至少 3 个字符'),
    body('email').isEmail().withMessage('请输入有效邮箱'),
    body('password').isLength({ min: 6 }).withMessage('密码至少 6 个字符')
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('请输入有效邮箱'),
    body('password').notEmpty().withMessage('密码不能为空')
  ],
  login
);

router.get('/me', authenticate, getProfile);

router.put(
  '/change-password',
  authenticate,
  [
    body('oldPassword').notEmpty().withMessage('请输入旧密码'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('新密码至少 6 个字符')
      .custom((value, { req }) => {
        if (value === req.body.oldPassword) {
          throw new Error('新密码不能与旧密码相同');
        }

        return true;
      })
  ],
  changePassword
);

module.exports = router;
