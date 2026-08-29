const express = require('express');
const { getBoms, getNextBomCode, createBom, updateBom, completeBomItem, revertBomItem, deleteBom } = require('../controllers/bom.controller');

const router = express.Router();

router.get('/', getBoms);
router.get('/next-code', getNextBomCode);
router.post('/', createBom);
router.put('/:id', updateBom);
router.put('/:id/items/:skuId/complete', completeBomItem);
router.put('/:id/items/:skuId/revert', revertBomItem);
router.delete('/:id', deleteBom);

module.exports = router;
