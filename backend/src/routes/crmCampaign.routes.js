const express = require('express');
const { getCampaigns, createCampaign, updateCampaign, deleteCampaign } = require('../controllers/crmCampaign.controller');

const router = express.Router();

router.get('/', getCampaigns);
router.post('/', createCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

module.exports = router;
