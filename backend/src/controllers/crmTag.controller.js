const { sendServerError } = require('../utils/errorResponse');
const CrmTagModel = require('../models/crmTag.model');

async function getLeadTags(req, res) {
  try {
    const { leadId } = req.query;
    if (!leadId) {
      return res.status(400).json({ status: false, message: 'leadId query param is required', data: null });
    }
    const tags = await CrmTagModel.getByLead(leadId);
    res.json({ status: true, message: 'Tags fetched successfully', data: tags });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function addLeadTag(req, res) {
  try {
    const { leadId, name } = req.body;
    if (!leadId || !name) {
      return res.status(400).json({ status: false, message: 'leadId and name are required', data: null });
    }
    const tag = await CrmTagModel.findOrCreateByName(name.trim());
    await CrmTagModel.attachToLead(leadId, tag.id);
    res.status(201).json({ status: true, message: 'Tag added successfully', data: tag });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function removeLeadTag(req, res) {
  try {
    const { tagId } = req.params;
    const { leadId } = req.query;
    if (!leadId) {
      return res.status(400).json({ status: false, message: 'leadId query param is required', data: null });
    }
    await CrmTagModel.detachFromLead(leadId, tagId);
    res.json({ status: true, message: 'Tag removed successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getLeadTags, addLeadTag, removeLeadTag };
