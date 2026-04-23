const sequelize = require('./database.config');

const ensureColumn = async (tableName, columnName, definition) => {
  const [columns] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ${sequelize.escape(columnName)}`);

  if (Array.isArray(columns) && columns.length > 0) {
    return false;
  }

  await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  return true;
};

const ensureColumnType = async (tableName, columnName, expectedType, definition) => {
  const [columns] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ${sequelize.escape(columnName)}`);

  if (!Array.isArray(columns) || columns.length === 0) {
    return false;
  }

  const currentType = String(columns[0].Type || '').toLowerCase();
  if (currentType.includes(expectedType.toLowerCase())) {
    return false;
  }

  await sequelize.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${columnName}\` ${definition}`);
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

  if (await ensureColumn('files', 'uploadId', 'VARCHAR(100) NULL AFTER `tags`')) {
    addedColumns.push('uploadId');
  }

  if (await ensureColumn('files', 'totalChunks', 'INT NULL AFTER `uploadId`')) {
    addedColumns.push('totalChunks');
  }

  if (await ensureColumn('files', 'uploadedChunks', 'JSON NULL AFTER `totalChunks`')) {
    addedColumns.push('uploadedChunks');
  }

  if (await ensureColumn('files', 'uploadStatus', "ENUM('uploading', 'completed', 'failed') NOT NULL DEFAULT 'completed' AFTER `uploadedChunks`")) {
    addedColumns.push('uploadStatus');
  }

  if (await ensureColumn('files', 'chunkSize', 'INT NULL AFTER `uploadStatus`')) {
    addedColumns.push('chunkSize');
  }

  const updatedColumns = [];

  if (await ensureColumnType('files', 'size', 'bigint', 'BIGINT NOT NULL')) {
    updatedColumns.push('size');
  }

  if (addedColumns.length > 0) {
    console.log(`⚠️ 已自动补齐 files 表缺失字段: ${addedColumns.join(', ')}`);
  }

  if (updatedColumns.length > 0) {
    console.log(`⚠️ 已自动修正 files 表字段类型: ${updatedColumns.join(', ')}`);
  }
};

module.exports = {
  ensureFileTableColumns
};
