const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const PRODUCTS_DIR = path.join(__dirname, '../../uploads/products');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PRODUCTS_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

function imageFileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');

// Saves the uploaded file to disk (backend/uploads/products) and returns just its relative
// path - the DB (ims_inventories.images JSONB array) and frontend only ever store/reference
// this path, never the file's binary content.
function uploadProductImage(req, res) {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: false, message: err.message, data: null });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'No image file provided', data: null });
    }
    const relativePath = `/uploads/products/${req.file.filename}`;
    res.status(201).json({ status: true, message: 'Image uploaded successfully', data: { path: relativePath } });
  });
}

module.exports = { uploadProductImage };
