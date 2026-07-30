const express = require('express');
const { getVendors, createVendor, updateVendor, deleteVendor } = require('../controllers/vendor.controller');

const router = express.Router();

router.get('/', getVendors);
router.post('/', createVendor);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

module.exports = router;
