const express = require('express');
const { getBoms, getNextBomCode, createBom, updateBom, dispatchBom, revertBomToProcess, deleteBom } = require('../controllers/bom.controller');

const router = express.Router();

router.get('/', getBoms);
router.get('/next-code', getNextBomCode);
router.post('/', createBom);
router.put('/:id', updateBom);
router.put('/:id/dispatch', dispatchBom);
router.put('/:id/revert', revertBomToProcess);
router.delete('/:id', deleteBom);

module.exports = router;
