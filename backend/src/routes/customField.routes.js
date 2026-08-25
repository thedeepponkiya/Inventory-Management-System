const express = require('express');
const {
  getEntities,
  getDefinitions,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  getBuiltInFields,
  setBuiltInFieldLabel,
  resetBuiltInFieldLabel,
} = require('../controllers/customField.controller');

const router = express.Router();

router.get('/entities', getEntities);
// Must be registered before '/:id' - otherwise Express would match "built-in" as an :id param
// and route it to the definitions handlers instead (same reasoning as crmLead.routes.js's
// '/reorder').
router.get('/built-in', getBuiltInFields);
router.put('/built-in', setBuiltInFieldLabel);
router.delete('/built-in', resetBuiltInFieldLabel);
router.get('/', getDefinitions);
router.post('/', createDefinition);
router.put('/:id', updateDefinition);
router.delete('/:id', deleteDefinition);

module.exports = router;
