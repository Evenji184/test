const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database.config');

class File extends Model {
  getFormattedSize() {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (this.size === 0) return '0 Bytes';
    const i = Math.floor(Math.log(this.size) / Math.log(1024));
    return `${Math.round((this.size / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  }

  toJSON() {
    const values = { ...this.get() };
    values.url = `/uploads/${this.filename}`;
    values.formattedSize = this.getFormattedSize();
    delete values.path;
    return values;
  }
}

File.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    mimetype: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sharedWith: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    downloads: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  },
  {
    sequelize,
    modelName: 'File',
    tableName: 'files',
    timestamps: true
  }
);

module.exports = File;
