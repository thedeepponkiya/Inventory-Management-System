const UnitModel = require('../models/unit.model');

async function getUnits(req, res) {
  try {
    const units = await UnitModel.getAll();
    res.json({ status: true, message: 'Units fetched successfully', data: units });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createUnit(req, res) {
  try {
    const { unit, status } = req.body;
    if (!unit) {
      return res.status(400).json({ status: false, message: 'unit is required', data: null });
    }

    const duplicate = await UnitModel.findByUnit(unit);
    if (duplicate) {
      return res.status(409).json({ status: false, message: 'Unit already exists', data: null });
    }

    const created = await UnitModel.create(unit, status || 'Active');
    res.status(201).json({ status: true, message: 'Unit created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updateUnit(req, res) {
  try {
    const { id } = req.params;
    const { unit, status } = req.body;

    const existing = await UnitModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Unit not found', data: null });
    }

    if (unit) {
      const duplicate = await UnitModel.findByUnit(unit);
      if (duplicate && String(duplicate.id) !== String(id)) {
        return res.status(409).json({ status: false, message: 'Unit already exists', data: null });
      }
    }

    const updated = await UnitModel.update(
      id,
      unit ?? existing.unit,
      status ?? existing.status
    );
    res.json({ status: true, message: 'Unit updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function deleteUnit(req, res) {
  try {
    const { id } = req.params;

    const existing = await UnitModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Unit not found', data: null });
    }

    await UnitModel.remove(id);
    res.json({ status: true, message: 'Unit deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getUnits, createUnit, updateUnit, deleteUnit };
