const { sendServerError } = require('../utils/errorResponse');
const DeveloperAdminSettingsModel = require('../models/developerAdminSettings.model');

async function getSetting(req, res) {
  try {
    const { key } = req.params;
    const value = await DeveloperAdminSettingsModel.getByKey(key, {});
    res.json({ status: true, message: 'Setting fetched successfully', data: value });
  } catch (err) {
    sendServerError(res, err);
  }
}

// getSetting stays open to any authenticated user - e.g. 'ui-visibility' is read by every
// user on every page load (see AppContext.tsx's fetchUiVisibility, called unconditionally for
// any authenticated session) to know which sidebar items/quick actions to hide for THEM, so
// restricting the read would break the app for everyone. Only WRITES are Developer Admin-only,
// same isHidden gate as databaseReset.controller.js - without it, any authenticated user could
// rewrite this shared, centrally-applied settings store for every other user.
async function updateSetting(req, res) {
  try {
    if (!req.user?.isHidden) {
      return res.status(403).json({ status: false, message: 'Not authorized to change Developer Admin settings', data: null });
    }
    const { key } = req.params;
    const value = req.body.value ?? {};
    const updated = await DeveloperAdminSettingsModel.upsertByKey(key, value);
    res.json({ status: true, message: 'Setting updated successfully', data: updated });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getSetting, updateSetting };
