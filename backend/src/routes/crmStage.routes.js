const express = require('express');
const { getStages, createStage, updateStage, deleteStage } = require('../controllers/crmStage.controller');

const router = express.Router();

router.get('/', getStages);
router.post('/', createStage);
router.put('/:id', updateStage);
router.delete('/:id', deleteStage);

module.exports = router;
