const CrmStageModel = require('../models/crmStage.model');

async function getStages(req, res) {
  try {
    const stages = await CrmStageModel.getAll();
    res.json({ status: true, message: 'Stages fetched successfully', data: stages });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createStage(req, res) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ status: false, message: 'name is required', data: null });
    }

    const duplicate = await CrmStageModel.findByName(name);
    if (duplicate) {
      return res.status(409).json({ status: false, message: 'Stage already exists', data: null });
    }

    const created = await CrmStageModel.create({
      name,
      sortOrder: req.body.sortOrder ?? 0,
      color: req.body.color || '#64748B',
      isClosed: req.body.isClosed ?? false,
      outcome: req.body.outcome || 'open',
      status: req.body.status || 'Active',
    });
    res.status(201).json({ status: true, message: 'Stage created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updateStage(req, res) {
  try {
    const { id } = req.params;
    const existing = await CrmStageModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Stage not found', data: null });
    }

    const { name } = req.body;
    if (name) {
      const duplicate = await CrmStageModel.findByName(name);
      if (duplicate && String(duplicate.id) !== String(id)) {
        return res.status(409).json({ status: false, message: 'Stage already exists', data: null });
      }
    }

    const updated = await CrmStageModel.update(id, {
      name: name ?? existing.name,
      sortOrder: req.body.sortOrder ?? existing.sortOrder,
      color: req.body.color ?? existing.color,
      isClosed: req.body.isClosed ?? existing.isClosed,
      outcome: req.body.outcome ?? existing.outcome,
      status: req.body.status ?? existing.status,
    });
    res.json({ status: true, message: 'Stage updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function deleteStage(req, res) {
  try {
    const { id } = req.params;
    const existing = await CrmStageModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Stage not found', data: null });
    }

    await CrmStageModel.remove(id);
    res.json({ status: true, message: 'Stage deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getStages, createStage, updateStage, deleteStage };
