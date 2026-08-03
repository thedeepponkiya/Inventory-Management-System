const express = require('express');
const { getRawSkus, createRawSku, updateRawSku, deleteRawSku } = require('../controllers/rawSku.controller');

const router = express.Router();

router.get('/', getRawSkus);
router.post('/', createRawSku);
router.put('/:id', updateRawSku);
router.delete('/:id', deleteRawSku);

module.exports = router;
