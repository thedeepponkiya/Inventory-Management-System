const express = require('express');
const { getProductTypes, createProductType, updateProductType, deleteProductType } = require('../controllers/productType.controller');

const router = express.Router();

router.get('/', getProductTypes);
router.post('/', createProductType);
router.put('/:id', updateProductType);
router.delete('/:id', deleteProductType);

module.exports = router;
