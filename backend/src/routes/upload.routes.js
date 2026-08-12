const express = require('express');
const { uploadProductImage, uploadUserImage } = require('../controllers/upload.controller');

const router = express.Router();

router.post('/product-image', uploadProductImage);
router.post('/user-image', uploadUserImage);

module.exports = router;
