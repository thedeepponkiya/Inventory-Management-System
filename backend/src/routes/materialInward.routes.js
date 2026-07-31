const express = require('express');
const { getMaterialInwards, createMaterialInward, updateMaterialInward, deleteMaterialInward } = require('../controllers/materialInward.controller');

const router = express.Router();

router.get('/', getMaterialInwards);
router.post('/', createMaterialInward);
router.put('/:id', updateMaterialInward);
router.delete('/:id', deleteMaterialInward);

module.exports = router;
