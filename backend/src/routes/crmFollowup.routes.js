const express = require('express');
const { getFollowups, createFollowup, updateFollowup, deleteFollowup } = require('../controllers/crmFollowup.controller');

const router = express.Router();

router.get('/', getFollowups);
router.post('/', createFollowup);
router.put('/:id', updateFollowup);
router.delete('/:id', deleteFollowup);

module.exports = router;
