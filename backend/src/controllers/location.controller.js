const LocationModel = require('../models/location.model');

async function getLocations(req, res) {
  try {
    const locations = await LocationModel.getAll();
    res.json({ status: true, message: 'Locations fetched successfully', data: locations });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createLocation(req, res) {
  try {
    const { location, status } = req.body;
    if (!location) {
      return res.status(400).json({ status: false, message: 'location is required', data: null });
    }

    const duplicate = await LocationModel.findByLocation(location);
    if (duplicate) {
      return res.status(409).json({ status: false, message: 'Location already exists', data: null });
    }

    const created = await LocationModel.create(location, status || 'Active', req.body.description || null);
    res.status(201).json({ status: true, message: 'Location created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updateLocation(req, res) {
  try {
    const { id } = req.params;
    const { location, status } = req.body;

    const existing = await LocationModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Location not found', data: null });
    }

    if (location) {
      const duplicate = await LocationModel.findByLocation(location);
      if (duplicate && String(duplicate.id) !== String(id)) {
        return res.status(409).json({ status: false, message: 'Location already exists', data: null });
      }
    }

    const updated = await LocationModel.update(
      id,
      location ?? existing.location,
      status ?? existing.status,
      req.body.description ?? existing.description
    );
    res.json({ status: true, message: 'Location updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function deleteLocation(req, res) {
  try {
    const { id } = req.params;

    const existing = await LocationModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Location not found', data: null });
    }

    await LocationModel.remove(id);
    res.json({ status: true, message: 'Location deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getLocations, createLocation, updateLocation, deleteLocation };
