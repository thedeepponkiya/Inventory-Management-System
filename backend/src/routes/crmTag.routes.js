const express = require('express');
const { getLeadTags, addLeadTag, removeLeadTag } = require('../controllers/crmTag.controller');

const router = express.Router();

router.get('/', getLeadTags);
router.post('/', addLeadTag);
router.delete('/:tagId', removeLeadTag);

module.exports = router;
