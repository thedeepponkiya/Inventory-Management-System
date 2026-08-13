const { sendServerError } = require('../utils/errorResponse');
const CrmCampaignModel = require('../models/crmCampaign.model');

async function getCampaigns(req, res) {
  try {
    const campaigns = await CrmCampaignModel.getAll();
    res.json({ status: true, message: 'Campaigns fetched successfully', data: campaigns });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createCampaign(req, res) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ status: false, message: 'name is required', data: null });
    }

    const duplicate = await CrmCampaignModel.findByName(name);
    if (duplicate) {
      return res.status(409).json({ status: false, message: 'Campaign already exists', data: null });
    }

    const created = await CrmCampaignModel.create({
      name,
      sourceId: req.body.sourceId || null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      budget: req.body.budget || 0,
      status: req.body.status || 'Active',
    });
    res.status(201).json({ status: true, message: 'Campaign created successfully', data: created });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function updateCampaign(req, res) {
  try {
    const { id } = req.params;
    const existing = await CrmCampaignModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Campaign not found', data: null });
    }

    const { name } = req.body;
    if (name) {
      const duplicate = await CrmCampaignModel.findByName(name);
      if (duplicate && String(duplicate.id) !== String(id)) {
        return res.status(409).json({ status: false, message: 'Campaign already exists', data: null });
      }
    }

    const updated = await CrmCampaignModel.update(id, {
      name: name ?? existing.name,
      sourceId: req.body.sourceId ?? existing.sourceId,
      startDate: req.body.startDate ?? existing.startDate,
      endDate: req.body.endDate ?? existing.endDate,
      budget: req.body.budget ?? existing.budget,
      status: req.body.status ?? existing.status,
    });
    res.json({ status: true, message: 'Campaign updated successfully', data: updated });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deleteCampaign(req, res) {
  try {
    const { id } = req.params;
    const existing = await CrmCampaignModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Campaign not found', data: null });
    }

    await CrmCampaignModel.remove(id);
    res.json({ status: true, message: 'Campaign deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getCampaigns, createCampaign, updateCampaign, deleteCampaign };
