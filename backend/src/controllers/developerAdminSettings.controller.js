const DeveloperAdminSettingsModel = require('../models/developerAdminSettings.model');

async function getSetting(req, res) {
  try {
    const { key } = req.params;
    const value = await DeveloperAdminSettingsModel.getByKey(key, {});
    res.json({ status: true, message: 'Setting fetched successfully', data: value });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updateSetting(req, res) {
  try {
    const { key } = req.params;
    const value = req.body.value ?? {};
    const updated = await DeveloperAdminSettingsModel.upsertByKey(key, value);
    res.json({ status: true, message: 'Setting updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getSetting, updateSetting };
