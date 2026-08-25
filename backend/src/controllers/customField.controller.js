const { sendServerError } = require('../utils/errorResponse');
const { CUSTOM_FIELD_ENTITIES } = require('../utils/customFieldEntities.util');
const { FIELD_TYPES } = require('../utils/customFieldTypes.util');
const CustomFieldService = require('../services/customField.service');

// Reads (list entities, list definitions) stay open to any authenticated user - every form
// that has custom fields needs to fetch its own definitions just to render them, same
// reasoning as developerAdminSettings.controller.js's getSetting. Only writes (create/update/
// delete a field definition) are Developer Admin-only, since those run real ALTER TABLE DDL.
function isCallerAdmin(req) {
  return Boolean(req.user?.isHidden) || req.user?.roleId === 'Admin';
}

async function getEntities(req, res) {
  const entities = Object.entries(CUSTOM_FIELD_ENTITIES).map(([key, { label }]) => ({ key, label }));
  const fieldTypes = Object.entries(FIELD_TYPES).map(([key, { label }]) => ({ key, label }));
  res.json({ status: true, message: 'Custom field entities fetched successfully', data: { entities, fieldTypes } });
}

async function getDefinitions(req, res) {
  try {
    const { entityKey, includeInactive } = req.query;
    const definitions = entityKey
      ? await CustomFieldService.listDefinitionsForEntity(entityKey, { includeInactive: includeInactive === 'true' })
      : await CustomFieldService.listAllDefinitions();
    res.json({ status: true, message: 'Custom field definitions fetched successfully', data: definitions });
  } catch (err) {
    if (err instanceof CustomFieldService.CustomFieldError) {
      return res.status(err.statusCode).json({ status: false, message: err.message, data: null });
    }
    sendServerError(res, err);
  }
}

async function createDefinition(req, res) {
  try {
    if (!isCallerAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to create custom fields', data: null });
    }
    const { entityKey, label, fieldType, options, required, active } = req.body;
    const created = await CustomFieldService.createDefinition({
      entityKey,
      label,
      fieldType,
      options,
      required,
      active,
      createdBy: req.user.userName,
    });
    res.status(201).json({ status: true, message: 'Custom field created successfully', data: created });
  } catch (err) {
    if (err instanceof CustomFieldService.CustomFieldError) {
      return res.status(err.statusCode).json({ status: false, message: err.message, data: null });
    }
    sendServerError(res, err);
  }
}

async function updateDefinition(req, res) {
  try {
    if (!isCallerAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to update custom fields', data: null });
    }
    const { id } = req.params;
    const { label, options, required, active } = req.body;
    const updated = await CustomFieldService.updateDefinition(id, { label, options, required, active });
    res.json({ status: true, message: 'Custom field updated successfully', data: updated });
  } catch (err) {
    if (err instanceof CustomFieldService.CustomFieldError) {
      return res.status(err.statusCode).json({ status: false, message: err.message, data: null });
    }
    sendServerError(res, err);
  }
}

async function deleteDefinition(req, res) {
  try {
    if (!isCallerAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to delete custom fields', data: null });
    }
    const { id } = req.params;
    const result = await CustomFieldService.deleteDefinition(id, req.body?.confirm);
    res.json({ status: true, message: `Custom field deleted successfully. Backup saved as ${result.backupFile}.`, data: null });
  } catch (err) {
    if (err instanceof CustomFieldService.CustomFieldError) {
      return res.status(err.statusCode).json({ status: false, message: err.message, data: null });
    }
    sendServerError(res, err);
  }
}

// Reads stay open to any authenticated user - every form needs its own built-in field labels
// just to render its column headers/form labels correctly (see useFieldLabels.ts). Only
// setting/resetting an override is Developer Admin-only.
async function getBuiltInFields(req, res) {
  try {
    const { entityKey } = req.query;
    if (!entityKey) {
      return res.status(400).json({ status: false, message: 'entityKey is required', data: null });
    }
    const fields = await CustomFieldService.listBuiltInFields(entityKey);
    res.json({ status: true, message: 'Built-in fields fetched successfully', data: fields });
  } catch (err) {
    if (err instanceof CustomFieldService.CustomFieldError) {
      return res.status(err.statusCode).json({ status: false, message: err.message, data: null });
    }
    sendServerError(res, err);
  }
}

async function setBuiltInFieldLabel(req, res) {
  try {
    if (!isCallerAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to rename fields', data: null });
    }
    const { entityKey, fieldKey, label } = req.body;
    await CustomFieldService.setLabelOverride(entityKey, fieldKey, label, req.user.userName);
    const fields = await CustomFieldService.listBuiltInFields(entityKey);
    res.json({ status: true, message: 'Field label updated successfully', data: fields });
  } catch (err) {
    if (err instanceof CustomFieldService.CustomFieldError) {
      return res.status(err.statusCode).json({ status: false, message: err.message, data: null });
    }
    sendServerError(res, err);
  }
}

async function resetBuiltInFieldLabel(req, res) {
  try {
    if (!isCallerAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to rename fields', data: null });
    }
    const { entityKey, fieldKey } = req.body;
    await CustomFieldService.resetLabelOverride(entityKey, fieldKey);
    const fields = await CustomFieldService.listBuiltInFields(entityKey);
    res.json({ status: true, message: 'Field label reset to default successfully', data: fields });
  } catch (err) {
    if (err instanceof CustomFieldService.CustomFieldError) {
      return res.status(err.statusCode).json({ status: false, message: err.message, data: null });
    }
    sendServerError(res, err);
  }
}

module.exports = {
  getEntities,
  getDefinitions,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  getBuiltInFields,
  setBuiltInFieldLabel,
  resetBuiltInFieldLabel,
};
