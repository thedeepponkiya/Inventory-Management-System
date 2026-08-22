const express = require('express');
const { previewDatabaseUpdate, updateDatabase } = require('../controllers/databaseUpdate.controller');

const router = express.Router();

router.get('/preview', previewDatabaseUpdate);
router.post('/', updateDatabase);

module.exports = router;
