const express = require('express');
const { getLeads, getNextLeadCode, createLead, updateLead, reorderLeads, deleteLead } = require('../controllers/crmLead.controller');

const router = express.Router();

router.get('/', getLeads);
router.get('/next-code', getNextLeadCode);
router.post('/', createLead);
// Must be registered before '/:id' - otherwise Express would match this path's "reorder"
// segment as an :id param and route it to updateLead instead.
router.put('/reorder', reorderLeads);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

module.exports = router;
