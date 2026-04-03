const User = require('../models/user.model');
const { Op } = require('sequelize');

const initDefaultAdmin = async () => {
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';
  const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'evenji@example.com';

  const existingUser = await User.scope('withPassword').findOne({
    where: {
      [Op.or]: [{ username: 'evenji' }, { email: defaultEmail }]
    }
  });

  if (!existingUser) {
    await User.create({
      username: 'evenji',
      email: defaultEmail,
      password: defaultPassword,
      role: 'admin'
    });
    console.log('✅ 默认管理员账号已创建: evenji');
    return;
  }

  let shouldSave = false;

  if (existingUser.email !== defaultEmail) {
    existingUser.email = defaultEmail;
    shouldSave = true;
  }

  const passwordMatchesDefault = await existingUser.comparePassword(defaultPassword);
  if (!passwordMatchesDefault) {
    existingUser.password = defaultPassword;
    shouldSave = true;
  }

  if (existingUser.role !== 'admin') {
    existingUser.role = 'admin';
    shouldSave = true;
  }

  if (shouldSave) {
    await existingUser.save();
    console.log('✅ 已同步默认管理员账号信息');
  }
};

module.exports = {
  initDefaultAdmin
};
