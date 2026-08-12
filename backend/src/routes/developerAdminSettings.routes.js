const express = require('express');
const { getSetting, updateSetting } = require('../controllers/developerAdminSettings.controller');

const router = express.Router();

router.get('/:key', getSetting);
router.put('/:key', updateSetting);

module.exports = router;
