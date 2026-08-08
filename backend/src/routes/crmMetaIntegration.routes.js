const express = require('express');
const { getStatus, connect, disconnect, syncLeads, syncCampaigns } = require('../controllers/crmMetaIntegration.controller');

const router = express.Router();

router.get('/status', getStatus);
router.post('/connect', connect);
router.delete('/disconnect', disconnect);
router.post('/sync-leads', syncLeads);
router.post('/sync-campaigns', syncCampaigns);

module.exports = router;
