const { sendServerError } = require('../utils/errorResponse');
const CrmNoteModel = require('../models/crmNote.model');

async function getNotes(req, res) {
  try {
    const { leadId } = req.query;
    if (!leadId) {
      return res.status(400).json({ status: false, message: 'leadId query param is required', data: null });
    }
    const notes = await CrmNoteModel.getByLead(leadId);
    res.json({ status: true, message: 'Notes fetched successfully', data: notes });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createNote(req, res) {
  try {
    const { leadId, body } = req.body;
    if (!leadId || !body) {
      return res.status(400).json({ status: false, message: 'leadId and body are required', data: null });
    }
    const created = await CrmNoteModel.create({ leadId, body, createdBy: null });
    res.status(201).json({ status: true, message: 'Note added successfully', data: created });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deleteNote(req, res) {
  try {
    const { id } = req.params;
    const existing = await CrmNoteModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Note not found', data: null });
    }
    await CrmNoteModel.remove(id);
    res.json({ status: true, message: 'Note deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getNotes, createNote, deleteNote };
