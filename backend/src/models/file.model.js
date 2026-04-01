const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, '文件名是必需的']
  },
  originalName: {
    type: String,
    required: [true, '原始文件名是必需的']
  },
  mimetype: {
    type: String,
    required: [true, '文件类型是必需的']
  },
  size: {
    type: Number,
    required: [true, '文件大小是必需的']
  },
  path: {
    type: String,
    required: [true, '文件路径是必需的']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '上传者信息是必需的']
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downloads: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    maxlength: [500, '描述最多500个字符']
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
fileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 虚拟属性：文件URL
fileSchema.virtual('url').get(function() {
  return `/uploads/${this.filename}`;
});

// 格式化文件大小
fileSchema.methods.getFormattedSize = function() {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.size === 0) return '0 Bytes';
  const i = Math.floor(Math.log(this.size) / Math.log(1024));
  return Math.round(this.size / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// JSON序列化
fileSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.url = this.url;
  obj.formattedSize = this.getFormattedSize();
  delete obj.__v;
  delete obj.path;
  return obj;
};

module.exports = mongoose.model('File', fileSchema);