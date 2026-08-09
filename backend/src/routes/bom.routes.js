const express = require('express');
const { getBoms, getNextBomCode, createBom, updateBom, revertBomToProcess, completeBom, deleteBom } = require('../controllers/bom.controller');

const router = express.Router();

router.get('/', getBoms);
router.get('/next-code', getNextBomCode);
router.post('/', createBom);
router.put('/:id', updateBom);
router.put('/:id/revert', revertBomToProcess);
router.put('/:id/complete', completeBom);
router.delete('/:id', deleteBom);

module.exports = router;
