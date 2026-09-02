const multer = require('multer');
const path = require('path');
const fs = require('fs');

// UPLOAD DIRECTORY

const uploadDirectory = path.join(process.cwd(), 'uploads', 'loyalty');

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

// STORAGE

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName = `loyalty-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    cb(null, uniqueName);
  },
});

// FILE VALIDATION

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/webp',
];

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();

  const isExtensionValid = allowedExtensions.includes(extension);
  const isMimeTypeValid =
    allowedMimeTypes.includes(mimeType) ||
    (mimeType === 'application/octet-stream' && isExtensionValid);

  if (!isExtensionValid || !isMimeTypeValid) {
    const error = new Error('Only JPG, JPEG, PNG and WEBP images are allowed.');
    error.status = 400;
    error.statusCode = 400;
    return cb(error);
  }

  cb(null, true);
};

// MULTER

const uploadLoyaltyImage = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// EXPORT

module.exports = uploadLoyaltyImage;

