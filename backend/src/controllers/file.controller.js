const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const File = require('../models/file.model');
const User = require('../models/user.model');

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || './uploads');

const isPathInsideUploadDir = (targetPath) => {
  const resolvedTargetPath = path.resolve(targetPath);
  const relativePath = path.relative(uploadRoot, resolvedTargetPath);

  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

const uploadFiles = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: '请先登录后再上传文件' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: '请选择要上传的文件' });
    }

    const createdFiles = await Promise.all(
      req.files.map((file) =>
        File.create({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          uploadedBy: req.userId,
          isPublic: req.body.isPublic === 'true',
          description: req.body.description || ''
        })
      )
    );

    res.status(201).json({
      success: true,
      data: createdFiles
    });
  } catch (error) {
    next(error);
  }
};

const getFiles = async (req, res, next) => {
  try {
    const files = await File.findAll({
      where: {
        [Op.or]: [{ uploadedBy: req.userId }, { isPublic: true }]
      },
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: files });
  } catch (error) {
    next(error);
  }
};

const downloadFile = async (req, res, next) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }

    const canAccess = file.isPublic || String(file.uploadedBy) === String(req.userId);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: '无权访问该文件' });
    }

    const filePath = path.resolve(file.path);
    if (!isPathInsideUploadDir(filePath)) {
      return res.status(403).json({ success: false, error: '非法的文件路径' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '文件内容不存在' });
    }

    file.downloads += 1;
    await file.save();

    res.download(filePath, file.originalName);
  } catch (error) {
    next(error);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }

    if (String(file.uploadedBy) !== String(req.userId)) {
      return res.status(403).json({ success: false, error: '只能删除自己上传的文件' });
    }

    const filePath = path.resolve(file.path);
    if (!isPathInsideUploadDir(filePath)) {
      return res.status(403).json({ success: false, error: '非法的文件路径' });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await file.destroy();

    res.json({ success: true, message: '文件删除成功' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFiles,
  getFiles,
  downloadFile,
  deleteFile
};
