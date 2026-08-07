const express = require('express');
const { getUnits, createUnit, updateUnit, deleteUnit } = require('../controllers/unit.controller');

const router = express.Router();

router.get('/', getUnits);
router.post('/', createUnit);
router.put('/:id', updateUnit);
router.delete('/:id', deleteUnit);

module.exports = router;
