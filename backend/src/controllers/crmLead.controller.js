const { sendServerError } = require('../utils/errorResponse');
const { isCrmAdmin, canEditLead, leadScopeUserId } = require('../utils/crmPermissions.util');
const CrmLeadModel = require('../models/crmLead.model');
const CustomFieldService = require('../services/customField.service');

const VALID_STATUSES = ['Active', 'Archived'];
const VALID_PRIORITIES = ['High', 'Medium', 'Low'];

async function getLeads(req, res) {
  try {
    const leads = await CrmLeadModel.getAll(leadScopeUserId(req));
    res.json({ status: true, message: 'Leads fetched successfully', data: leads });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function getNextLeadCode(req, res) {
  try {
    const leadCode = await CrmLeadModel.getNextLeadCode();
    res.json({ status: true, message: 'Next lead code fetched successfully', data: { leadCode } });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createLead(req, res) {
  try {
    if (!isCrmAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to create leads', data: null });
    }
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ status: false, message: 'name is required', data: null });
    }

    const status = req.body.status || 'Active';
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ status: false, message: `status must be one of ${VALID_STATUSES.join(', ')}`, data: null });
    }

    const priority = req.body.priority || 'Medium';
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ status: false, message: `priority must be one of ${VALID_PRIORITIES.join(', ')}`, data: null });
    }

    const stageId = req.body.stageId || null;
    const leadCode = await CrmLeadModel.getNextLeadCode();
    const sortOrder = await CrmLeadModel.getNextSortOrder(stageId);
    const created = await CrmLeadModel.create(leadCode, {
      name,
      phone: req.body.phone || null,
      email: req.body.email || null,
      company: req.body.company || null,
      stageId,
      sourceId: req.body.sourceId || null,
      assignedTo: req.body.assignedTo || null,
      value: req.body.value || 0,
      status,
      priority,
      isStarred: req.body.isStarred ?? false,
      sortOrder,
    });
    await CustomFieldService.saveValues('crmLead', created.id, req.body.customFields);
    const withCustomFields = await CrmLeadModel.findById(created.id);
    res.status(201).json({ status: true, message: 'Lead created successfully', data: withCustomFields });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function updateLead(req, res) {
  try {
    if (!canEditLead(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to edit leads', data: null });
    }
    const { id } = req.params;
    const existing = await CrmLeadModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Lead not found', data: null });
    }

    const body = req.body;
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return res.status(400).json({ status: false, message: `status must be one of ${VALID_STATUSES.join(', ')}`, data: null });
    }
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return res.status(400).json({ status: false, message: `priority must be one of ${VALID_PRIORITIES.join(', ')}`, data: null });
    }

    // Nullable relationship fields use `'key' in body` rather than `??` - a lead form
    // submission can legitimately send an explicit `null` to clear a showClear dropdown,
    // which `??` would otherwise silently discard by falling back to the existing value.
    // Fields never explicitly nulled by the UI keep `??`.
    await CrmLeadModel.update(id, {
      name: body.name ?? existing.name,
      phone: body.phone ?? existing.phone,
      email: body.email ?? existing.email,
      company: body.company ?? existing.company,
      stageId: 'stageId' in body ? body.stageId : existing.stageId,
      sourceId: 'sourceId' in body ? body.sourceId : existing.sourceId,
      assignedTo: 'assignedTo' in body ? body.assignedTo : existing.assignedTo,
      value: body.value ?? existing.value,
      status: body.status ?? existing.status,
      priority: body.priority ?? existing.priority,
      isStarred: body.isStarred ?? existing.isStarred,
    });
    await CustomFieldService.saveValues('crmLead', id, body.customFields);
    const withCustomFields = await CrmLeadModel.findById(id);
    res.json({ status: true, message: 'Lead updated successfully', data: withCustomFields });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function reorderLeads(req, res) {
  try {
    const { stageId, orderedLeadIds } = req.body;
    if (!Array.isArray(orderedLeadIds) || orderedLeadIds.length === 0) {
      return res.status(400).json({ status: false, message: 'orderedLeadIds must be a non-empty array', data: null });
    }

    await CrmLeadModel.reorderStage(stageId ?? null, orderedLeadIds);
    const leads = await CrmLeadModel.getAll();
    res.json({ status: true, message: 'Leads reordered successfully', data: leads });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deleteLead(req, res) {
  try {
    if (!isCrmAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to delete leads', data: null });
    }
    const { id } = req.params;
    const existing = await CrmLeadModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Lead not found', data: null });
    }

    await CrmLeadModel.remove(id);
    res.json({ status: true, message: 'Lead deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getLeads, getNextLeadCode, createLead, updateLead, reorderLeads, deleteLead };
