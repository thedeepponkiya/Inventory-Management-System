const { sendServerError } = require('../utils/errorResponse');
const { isCrmAdmin } = require('../utils/crmPermissions.util');
const CrmStageModel = require('../models/crmStage.model');
const CrmLeadModel = require('../models/crmLead.model');

async function getStages(req, res) {
  try {
    const stages = await CrmStageModel.getAll();
    res.json({ status: true, message: 'Stages fetched successfully', data: stages });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createStage(req, res) {
  try {
    if (!isCrmAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to create stages', data: null });
    }
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
    sendServerError(res, err);
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
    sendServerError(res, err);
  }
}

async function deleteStage(req, res) {
  try {
    if (!isCrmAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to delete stages', data: null });
    }
    const { id } = req.params;
    const existing = await CrmStageModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Stage not found', data: null });
    }

    // crm_leads."stageId" references this table with no ON DELETE clause (default RESTRICT), so
    // deleting a stage that still has leads in it would otherwise throw a raw Postgres
    // FK-violation (23503) that sendServerError scrubs down to a generic "Something went wrong",
    // hiding the real cause - same guard/reasoning as deletePurchaseOrder's Material Inward check.
    const leadCount = await CrmLeadModel.countByStage(id);
    if (leadCount > 0) {
      return res.status(400).json({ status: false, message: `Cannot delete this stage - ${leadCount} lead(s) are currently in it. Move or reassign them first.`, data: null });
    }

    await CrmStageModel.remove(id);
    res.json({ status: true, message: 'Stage deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getStages, createStage, updateStage, deleteStage };
