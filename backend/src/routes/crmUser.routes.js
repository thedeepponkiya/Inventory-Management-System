const express = require('express');
const { getAssignableUsers } = require('../controllers/crmUser.controller');

const router = express.Router();

router.get('/', getAssignableUsers);

module.exports = router;
