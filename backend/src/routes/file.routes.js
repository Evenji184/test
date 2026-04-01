const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { upload } = require('../config/multer.config');
const {
  uploadFiles,
  getFiles,
  downloadFile,
  deleteFile
} = require('../controllers/file.controller');

const router = express.Router();

router.get('/', authenticate, getFiles);
router.post('/upload', authenticate, upload.array('files', 5), uploadFiles);
router.get('/:id/download', authenticate, downloadFile);
router.delete('/:id', authenticate, deleteFile);

module.exports = router;
