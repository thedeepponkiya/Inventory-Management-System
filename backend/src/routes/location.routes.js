const express = require('express');
const { getLocations, createLocation, updateLocation, deleteLocation } = require('../controllers/location.controller');

const router = express.Router();

router.get('/', getLocations);
router.post('/', createLocation);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

module.exports = router;
