const User = require('../models/user.model');

const initDefaultAdmin = async () => {
  const adminCount = await User.count({ where: { role: 'admin' } });
  if (adminCount > 0) {
    return;
  }

  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';
  const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'evenji@example.com';
  const defaultUsername = 'evenji';

  const existingUser = await User.scope('withPassword').findOne({
    where: { [require('sequelize').Op.or]: [{ username: defaultUsername }, { email: defaultEmail }] }
  });

  if (existingUser) {
    existingUser.role = 'admin';
    await existingUser.save();
    console.log(`✅ 已将用户 "${existingUser.username}" 提升为管理员（无其他管理员存在）`);
    return;
  }

  await User.create({
    username: defaultUsername,
    email: defaultEmail,
    password: defaultPassword,
    role: 'admin'
  });
  console.log(`✅ 已创建默认管理员账号: ${defaultUsername}`);
};

module.exports = {
  initDefaultAdmin
};
