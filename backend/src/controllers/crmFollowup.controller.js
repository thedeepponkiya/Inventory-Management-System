const { sendServerError } = require('../utils/errorResponse');
const { isCrmAdmin } = require('../utils/crmPermissions.util');
const CrmFollowupModel = require('../models/crmFollowup.model');

const VALID_TYPES = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Other'];
const VALID_STATUSES = ['Pending', 'Completed'];

async function getFollowups(req, res) {
  try {
    const { leadId } = req.query;
    const followups = await CrmFollowupModel.getAll(leadId);
    res.json({ status: true, message: 'Follow-ups fetched successfully', data: followups });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createFollowup(req, res) {
  try {
    const { leadId, dueAt } = req.body;
    if (!leadId || !dueAt) {
      return res.status(400).json({ status: false, message: 'leadId and dueAt are required', data: null });
    }

    const type = req.body.type || 'Call';
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ status: false, message: `type must be one of ${VALID_TYPES.join(', ')}`, data: null });
    }

    const created = await CrmFollowupModel.create({
      leadId,
      dueAt,
      type,
      notes: req.body.notes || null,
      createdBy: null,
    });
    res.status(201).json({ status: true, message: 'Follow-up created successfully', data: created });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function updateFollowup(req, res) {
  try {
    const { id } = req.params;
    const existing = await CrmFollowupModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Follow-up not found', data: null });
    }

    const body = req.body;
    if (body.type && !VALID_TYPES.includes(body.type)) {
      return res.status(400).json({ status: false, message: `type must be one of ${VALID_TYPES.join(', ')}`, data: null });
    }
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return res.status(400).json({ status: false, message: `status must be one of ${VALID_STATUSES.join(', ')}`, data: null });
    }

    const status = body.status ?? existing.status;
    let completedAt = existing.completedAt;
    if (status === 'Completed' && !existing.completedAt) {
      completedAt = new Date().toISOString();
    } else if (status === 'Pending') {
      completedAt = null;
    }

    const updated = await CrmFollowupModel.update(id, {
      dueAt: body.dueAt ?? existing.dueAt,
      type: body.type ?? existing.type,
      notes: body.notes ?? existing.notes,
      status,
      completedAt,
    });
    res.json({ status: true, message: 'Follow-up updated successfully', data: updated });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deleteFollowup(req, res) {
  try {
    if (!isCrmAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to delete follow-ups', data: null });
    }
    const { id } = req.params;
    const existing = await CrmFollowupModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Follow-up not found', data: null });
    }
    await CrmFollowupModel.remove(id);
    res.json({ status: true, message: 'Follow-up deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getFollowups, createFollowup, updateFollowup, deleteFollowup };
