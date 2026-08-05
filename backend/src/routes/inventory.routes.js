const express = require('express');
const { getInventories, getNextSkuId, createInventory, updateInventory, deleteInventory } = require('../controllers/inventory.controller');

const router = express.Router();

router.get('/', getInventories);
router.get('/next-sku-id', getNextSkuId);
router.post('/', createInventory);
router.put('/:id', updateInventory);
router.delete('/:id', deleteInventory);

module.exports = router;
