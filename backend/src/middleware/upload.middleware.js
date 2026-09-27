const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const originalExt = path.extname(file.originalname || '').toLowerCase();
    const ext = ALLOWED_EXTENSIONS.includes(originalExt) ? originalExt : '.bin';
    // userId is only available because `authenticate` runs before this middleware
    const owner = req.user?.id || 'anon';
    const stamp = Date.now();
    const rand = Math.round(Math.random() * 1e9).toString(36);
    cb(null, `${owner}-${stamp}-${rand}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const error = new Error('Only PDF, JPG, PNG or WEBP files are allowed');
    error.status = 400;
    return cb(error);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 20 }
});

// Turns multer's own errors into the standard { success, message } envelope
const handleUploadErrors = (err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large. Maximum size is 5 MB'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Unexpected file field'
          : `Upload failed: ${err.message}`;
    return res.status(400).json({ success: false, message });
  }

  return res.status(err.status || 400).json({
    success: false,
    message: err.message || 'Upload failed'
  });
};

exports.UPLOAD_DIR = UPLOAD_DIR;
exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
exports.ALLOWED_MIME_TYPES = ALLOWED_MIME_TYPES;
exports.handleUploadErrors = handleUploadErrors;
exports.uploadSingleFile = (req, res, next) =>
  upload.single('file')(req, res, (err) => handleUploadErrors(err, req, res, next));
