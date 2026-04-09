const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Op } = require('sequelize');
const File = require('../models/file.model');
const User = require('../models/user.model');

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || './uploads');
const chunkRoot = path.join(uploadRoot, '.chunks');

if (!fs.existsSync(chunkRoot)) {
  fs.mkdirSync(chunkRoot, { recursive: true });
}

const isPathInsideUploadDir = (targetPath) => {
  const resolvedTargetPath = path.resolve(targetPath);
  const relativePath = path.relative(uploadRoot, resolvedTargetPath);

  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

const getFileAccessWhere = (user, space = 'public', keyword = '') => {
  const normalizedSpace = space === 'personal' ? 'personal' : 'public';
  const trimmedKeyword = keyword.trim();
  const searchConditions = trimmedKeyword
    ? [
        { originalName: { [Op.like]: `%${trimmedKeyword}%` } },
        { filename: { [Op.like]: `%${trimmedKeyword}%` } },
        { mimetype: { [Op.like]: `%${trimmedKeyword}%` } }
      ]
    : [];

  const where = {
    spaceType: normalizedSpace
  };

  if (normalizedSpace === 'personal' && user.role !== 'admin') {
    where.uploadedBy = user.id;
  }

  if (normalizedSpace === 'public') {
    where.isPublic = true;
  }

  if (searchConditions.length > 0) {
    where[Op.or] = searchConditions;
  }

  return where;
};

const canAccessFile = (file, user) => {
  if (user.role === 'admin') {
    return true;
  }

  if (file.spaceType === 'public' || file.isPublic) {
    return true;
  }

  return String(file.uploadedBy) === String(user.id);
};

const getChunkDir = (uploadId) => path.join(chunkRoot, uploadId);

const ensureChunkDir = (uploadId) => {
  const chunkDir = getChunkDir(uploadId);
  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
  }
  return chunkDir;
};

const normalizeUploadedChunks = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      return normalizeUploadedChunks(JSON.parse(value));
    } catch (error) {
      return [];
    }
  }

  return [];
};

const removeChunkDir = (uploadId) => {
  const chunkDir = getChunkDir(uploadId);
  if (fs.existsSync(chunkDir)) {
    fs.rmSync(chunkDir, { recursive: true, force: true });
  }
};

const initUpload = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: '请先登录后再上传文件' });
    }

    const { originalName, mimetype, size, totalChunks, chunkSize, spaceType, description = '' } = req.body;

    if (!originalName || !mimetype || !Number.isFinite(Number(size)) || !Number.isInteger(Number(totalChunks))) {
      return res.status(400).json({ success: false, error: '上传初始化参数不完整' });
    }

    const normalizedSpaceType = spaceType === 'public' ? 'public' : 'personal';
    const uploadId = crypto.randomUUID();

    console.log('[Upload] 初始化上传请求', {
      userId: req.userId,
      originalName,
      mimetype,
      size: Number(size),
      totalChunks: Number(totalChunks),
      chunkSize: Number(chunkSize) || null,
      spaceType: normalizedSpaceType
    });

    const file = await File.create({
      filename: `${Date.now()}-${uploadId}${path.extname(path.basename(originalName)).toLowerCase()}`,
      originalName,
      mimetype,
      size: Number(size),
      path: path.join(uploadRoot, `${Date.now()}-${uploadId}${path.extname(path.basename(originalName)).toLowerCase()}`),
      uploadedBy: req.userId,
      spaceType: normalizedSpaceType,
      isPublic: normalizedSpaceType === 'public',
      description,
      uploadId,
      totalChunks: Number(totalChunks),
      uploadedChunks: [],
      uploadStatus: 'uploading',
      chunkSize: Number(chunkSize) || null
    });

    ensureChunkDir(uploadId);

    res.status(201).json({
      success: true,
      data: {
        uploadId,
        fileId: file.id,
        uploadedChunks: [],
        totalChunks: file.totalChunks
      }
    });
  } catch (error) {
    next(error);
  }
};

const uploadChunk = async (req, res, next) => {
  try {
    const { uploadId, chunkIndex } = req.body;

    if (!uploadId || !req.file || !Number.isInteger(Number(chunkIndex))) {
      return res.status(400).json({ success: false, error: '分片上传参数不完整' });
    }

    const file = await File.findOne({ where: { uploadId, uploadedBy: req.userId } });
    if (!file) {
      return res.status(404).json({ success: false, error: '上传任务不存在' });
    }

    const normalizedChunkIndex = Number(chunkIndex);
    const chunkDir = ensureChunkDir(uploadId);
    const targetChunkPath = path.join(chunkDir, `${normalizedChunkIndex}.part`);

    fs.renameSync(req.file.path, targetChunkPath);

    const uploadedChunks = Array.from(new Set([...normalizeUploadedChunks(file.uploadedChunks), normalizedChunkIndex])).sort((a, b) => a - b);

    await file.update({
      uploadedChunks,
      uploadStatus: 'uploading'
    });

    res.json({
      success: true,
      data: {
        uploadId,
        uploadedChunks,
        uploadedCount: uploadedChunks.length,
        totalChunks: file.totalChunks
      }
    });
  } catch (error) {
    next(error);
  }
};

const mergeChunks = async (req, res, next) => {
  try {
    const { uploadId } = req.body;

    if (!uploadId) {
      return res.status(400).json({ success: false, error: '缺少 uploadId' });
    }

    const file = await File.findOne({ where: { uploadId, uploadedBy: req.userId } });
    if (!file) {
      return res.status(404).json({ success: false, error: '上传任务不存在' });
    }

    const uploadedChunks = normalizeUploadedChunks(file.uploadedChunks);
    if (uploadedChunks.length !== file.totalChunks) {
      return res.status(400).json({ success: false, error: '仍有分片未上传完成' });
    }

    const chunkDir = getChunkDir(uploadId);
    if (!fs.existsSync(chunkDir)) {
      return res.status(404).json({ success: false, error: '分片目录不存在' });
    }

    const writeStream = fs.createWriteStream(file.path);

    for (let index = 0; index < file.totalChunks; index += 1) {
      const chunkPath = path.join(chunkDir, `${index}.part`);
      if (!fs.existsSync(chunkPath)) {
        writeStream.close();
        return res.status(400).json({ success: false, error: `缺少第 ${index + 1} 个分片` });
      }

      const chunkBuffer = fs.readFileSync(chunkPath);
      writeStream.write(chunkBuffer);
    }

    writeStream.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const actualSize = fs.statSync(file.path).size;
    console.log('[Merge] 文件合并完成', {
      fileId: file.id,
      uploadId,
      originalName: file.originalName,
      databaseSize: file.size,
      actualSize,
      totalChunks: file.totalChunks,
      uploadedChunks: uploadedChunks.length
    });

    await file.update({
      uploadStatus: 'completed',
      size: actualSize
    });

    removeChunkDir(uploadId);

    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
};

const cancelUpload = async (req, res, next) => {
  try {
    const { uploadId } = req.params;

    console.log('[Upload] 终止上传请求', {
      uploadId,
      userId: req.userId
    });

    if (!uploadId) {
      return res.status(400).json({ success: false, error: '缺少 uploadId' });
    }

    const file = await File.findOne({ where: { uploadId, uploadedBy: req.userId } });
    if (!file) {
      console.warn('[Upload] 终止上传失败 - 上传任务不存在', {
        uploadId,
        userId: req.userId
      });
      return res.status(404).json({ success: false, error: '上传任务不存在' });
    }

    removeChunkDir(uploadId);

    if (file.path && fs.existsSync(file.path) && isPathInsideUploadDir(file.path)) {
      fs.rmSync(file.path, { force: true });
    }

    await file.destroy();

    console.log('[Upload] 上传任务已终止', {
      uploadId,
      fileId: file.id,
      originalName: file.originalName,
      userId: req.userId
    });

    res.json({ success: true, message: '上传任务已终止' });
  } catch (error) {
    next(error);
  }
};

const uploadFiles = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: '请先登录后再上传文件' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: '请选择要上传的文件' });
    }

    const spaceType = req.body.spaceType === 'public' ? 'public' : 'personal';

    const createdFiles = await Promise.all(
      req.files.map((file) =>
        File.create({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          uploadedBy: req.userId,
          spaceType,
          isPublic: spaceType === 'public',
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
    const where = getFileAccessWhere(req.user, req.query.space, String(req.query.keyword || ''));

    const files = await File.findAll({
      where,
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

    const canAccess = canAccessFile(file, req.user);
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

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    console.log('[Download] 下载请求', {
      fileId: file.id,
      originalName: file.originalName,
      databaseSize: file.size,
      actualSize: stat.size,
      rangeHeader: range || null
    });

    file.downloads += 1;
    await file.save();

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);

    if (!range) {
      res.setHeader('Content-Length', stat.size);
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const matches = /bytes=(\d*)-(\d*)/.exec(range);
    if (!matches) {
      return res.status(416).json({ success: false, error: '无效的 Range 请求' });
    }

    const start = matches[1] ? Number(matches[1]) : 0;
    const end = matches[2] ? Number(matches[2]) : stat.size - 1;

    if (start >= stat.size || end >= stat.size || start > end) {
      console.error('[Download] Range 超出文件范围', {
        fileId: file.id,
        originalName: file.originalName,
        databaseSize: file.size,
        actualSize: stat.size,
        requestedStart: start,
        requestedEnd: end,
        rangeHeader: range
      });
      return res.status(416).json({ success: false, error: 'Range 超出文件范围' });
    }

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', end - start + 1);
    fs.createReadStream(filePath, { start, end }).pipe(res);
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

    if (String(file.uploadedBy) !== String(req.userId) && req.user.role !== 'admin') {
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
  initUpload,
  uploadChunk,
  mergeChunks,
  cancelUpload,
  uploadFiles,
  getFiles,
  downloadFile,
  deleteFile
};
