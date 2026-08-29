const express = require('express');
const { getRawSkus, getNextSkuCode, createRawSku, updateRawSku, adjustRawSkuStock, deleteRawSku } = require('../controllers/rawSku.controller');

const router = express.Router();

router.get('/', getRawSkus);
router.get('/next-code', getNextSkuCode);
router.post('/', createRawSku);
router.put('/:id', updateRawSku);
router.put('/:id/adjust-stock', adjustRawSkuStock);
router.delete('/:id', deleteRawSku);

module.exports = router;
