const { sendServerError } = require('../utils/errorResponse');
const { isCrmAdmin } = require('../utils/crmPermissions.util');
const CrmSourceModel = require('../models/crmSource.model');
const CrmLeadModel = require('../models/crmLead.model');

async function getSources(req, res) {
  try {
    const sources = await CrmSourceModel.getAll();
    res.json({ status: true, message: 'Sources fetched successfully', data: sources });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createSource(req, res) {
  try {
    if (!isCrmAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to create sources', data: null });
    }
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ status: false, message: 'name is required', data: null });
    }

    const duplicate = await CrmSourceModel.findByName(name);
    if (duplicate) {
      return res.status(409).json({ status: false, message: 'Source already exists', data: null });
    }

    const created = await CrmSourceModel.create({
      name,
      type: req.body.type || 'Manual',
      status: req.body.status || 'Active',
    });
    res.status(201).json({ status: true, message: 'Source created successfully', data: created });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function updateSource(req, res) {
  try {
    const { id } = req.params;
    const existing = await CrmSourceModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Source not found', data: null });
    }

    const { name } = req.body;
    if (name) {
      const duplicate = await CrmSourceModel.findByName(name);
      if (duplicate && String(duplicate.id) !== String(id)) {
        return res.status(409).json({ status: false, message: 'Source already exists', data: null });
      }
    }

    const updated = await CrmSourceModel.update(id, {
      name: name ?? existing.name,
      type: req.body.type ?? existing.type,
      status: req.body.status ?? existing.status,
    });
    res.json({ status: true, message: 'Source updated successfully', data: updated });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deleteSource(req, res) {
  try {
    if (!isCrmAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to delete sources', data: null });
    }
    const { id } = req.params;
    const existing = await CrmSourceModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Source not found', data: null });
    }

    // crm_leads."sourceId" references this table with no ON DELETE clause (default RESTRICT), so
    // deleting a source still attached to a lead would otherwise throw a raw Postgres
    // FK-violation (23503) that sendServerError scrubs down to a generic "Something went wrong",
    // hiding the real cause - same guard/reasoning as deletePurchaseOrder's Material Inward check.
    const leadCount = await CrmLeadModel.countBySource(id);
    if (leadCount > 0) {
      return res.status(400).json({ status: false, message: `Cannot delete this source - ${leadCount} lead(s) are currently using it. Move or reassign them first.`, data: null });
    }

    await CrmSourceModel.remove(id);
    res.json({ status: true, message: 'Source deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getSources, createSource, updateSource, deleteSource };
