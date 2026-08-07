const express = require('express');
const { getSources, createSource, updateSource, deleteSource } = require('../controllers/crmSource.controller');

const router = express.Router();

router.get('/', getSources);
router.post('/', createSource);
router.put('/:id', updateSource);
router.delete('/:id', deleteSource);

module.exports = router;
