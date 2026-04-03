const sequelize = require('./database.config');

const ensureColumn = async (tableName, columnName, definition) => {
  const [columns] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ${sequelize.escape(columnName)}`);

  if (Array.isArray(columns) && columns.length > 0) {
    return false;
  }

  await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  return true;
};

const ensureFileTableColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableExists = await queryInterface
    .describeTable('files')
    .then(() => true)
    .catch(() => false);

  if (!tableExists) {
    return;
  }

  const addedColumns = [];

  if (await ensureColumn('files', 'spaceType', "ENUM('personal', 'public') NOT NULL DEFAULT 'personal' AFTER `uploadedBy`")) {
    addedColumns.push('spaceType');
  }

  if (await ensureColumn('files', 'isPublic', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `spaceType`')) {
    addedColumns.push('isPublic');
  }

  if (addedColumns.length > 0) {
    console.log(`⚠️ 已自动补齐 files 表缺失字段: ${addedColumns.join(', ')}`);
  }
};

module.exports = {
  ensureFileTableColumns
};
