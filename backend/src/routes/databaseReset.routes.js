const express = require('express');
const { resetDatabase } = require('../controllers/databaseReset.controller');

const router = express.Router();

router.post('/', resetDatabase);

module.exports = router;
