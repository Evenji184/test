const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { upload } = require('../config/multer.config');
const {
  initUpload,
  uploadChunk,
  mergeChunks,
  cancelUpload,
  uploadFiles,
  getFiles,
  downloadFile,
  deleteFile
} = require('../controllers/file.controller');

const router = express.Router();

router.get('/', authenticate, getFiles);
router.post('/upload/init', authenticate, initUpload);
router.post('/upload/chunk', authenticate, upload.single('chunk'), uploadChunk);
router.post('/upload/merge', authenticate, mergeChunks);
router.delete('/upload/:uploadId', authenticate, cancelUpload);
router.post('/upload', authenticate, upload.array('files', 20), uploadFiles);
router.get('/:id/download', authenticate, downloadFile);
router.delete('/:id', authenticate, deleteFile);

module.exports = router;
