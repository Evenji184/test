const User = require('../models/user.model');

const initDefaultAdmin = async () => {
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'evenji@example.com';

  const existingUser = await User.findOne({ where: { username: 'evenji' } });

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

  if (existingUser.role !== 'admin') {
    existingUser.role = 'admin';
    await existingUser.save();
    console.log('✅ 已将 evenji 账号提升为管理员');
  }
};

module.exports = {
  initDefaultAdmin
};
