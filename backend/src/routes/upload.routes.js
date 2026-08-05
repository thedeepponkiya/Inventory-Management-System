const express = require('express');
const { uploadProductImage } = require('../controllers/upload.controller');

const router = express.Router();

router.post('/product-image', uploadProductImage);

module.exports = router;
