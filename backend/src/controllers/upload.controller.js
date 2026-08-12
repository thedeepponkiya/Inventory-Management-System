const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const PRODUCTS_DIR = path.join(__dirname, '../../uploads/products');
const USERS_DIR = path.join(__dirname, '../../uploads/users');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Year_<yyyy>/<Mon>", e.g. "Year_2026/Aug" - read fresh from the clock on every single
// upload (never cached), so the very next upload after a month/year boundary automatically
// lands in a newly-created folder with no manual step.
function currentYearMonthSegment() {
  const now = new Date();
  return `Year_${now.getFullYear()}/${MONTH_NAMES[now.getMonth()]}`;
}

function imageFileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
}

// `dated: true` nests uploads under Year_<yyyy>/<Mon> beneath `destinationRoot` (product
// images); user images stay flat as before. The resolved subfolder (e.g. "Year_2026/Aug", or
// '' when not dated) is stashed on `req` so the response handler below can build the matching
// relative URL/DB path without recomputing "now" a second time (which could theoretically
// land in a different month if a request straddled midnight on the last day of the month).
function makeUpload(destinationRoot, { dated = false } = {}) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const subPath = dated ? currentYearMonthSegment() : '';
      const fullDir = path.join(destinationRoot, subPath);
      // Multer does not create destination folders itself - required the first time a given
      // month/year is uploaded to; a harmless no-op every later upload in that same month.
      fs.mkdirSync(fullDir, { recursive: true });
      req.uploadSubPath = subPath;
      cb(null, fullDir);
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
  return multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }).single('image');
}

const uploadProduct = makeUpload(PRODUCTS_DIR, { dated: true });
const uploadUser = makeUpload(USERS_DIR);

// Saves the uploaded file to disk (backend/uploads/products/Year_<yyyy>/<Mon>) and returns
// just its relative path - the DB (ims_inventories.images JSONB array) and frontend only ever
// store/reference this path, never the file's binary content.
function uploadProductImage(req, res) {
  uploadProduct(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: false, message: err.message, data: null });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'No image file provided', data: null });
    }
    const subPath = req.uploadSubPath ? `${req.uploadSubPath}/` : '';
    const relativePath = `/uploads/products/${subPath}${req.file.filename}`;
    res.status(201).json({ status: true, message: 'Image uploaded successfully', data: { path: relativePath } });
  });
}

// Same pattern as uploadProductImage, saving to backend/uploads/users instead - backs the
// User Management profile picture field (users."profileImage").
function uploadUserImage(req, res) {
  uploadUser(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: false, message: err.message, data: null });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'No image file provided', data: null });
    }
    const relativePath = `/uploads/users/${req.file.filename}`;
    res.status(201).json({ status: true, message: 'Image uploaded successfully', data: { path: relativePath } });
  });
}

module.exports = { uploadProductImage, uploadUserImage };
