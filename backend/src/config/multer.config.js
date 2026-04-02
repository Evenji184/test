const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.doc', '.docx']);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(path.basename(file.originalname || '')).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '';
    const safeName = `${Date.now()}-${crypto.randomUUID()}${safeExt}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(path.basename(file.originalname || '')).toLowerCase();
  const isAllowedMime = ALLOWED_MIME_TYPES.has(file.mimetype);
  const isAllowedExt = ALLOWED_EXTENSIONS.has(ext);

  if (!isAllowedMime || !isAllowedExt) {
    return cb(new Error('不支持的文件类型，仅允许上传图片、PDF、TXT、DOC、DOCX 文件'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 20
  }
});

module.exports = {
  upload,
  uploadDir
};
