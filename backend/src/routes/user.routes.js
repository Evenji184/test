const express = require('express');
const { body } = require('express-validator');
const { listUsers, updateUser } = require('../controllers/user.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate, isAdmin);

router.get('/', listUsers);

router.put(
  '/:id',
  [body('role').isIn(['user', 'admin']).withMessage('角色必须为 user 或 admin')],
  updateUser
);

module.exports = router;
