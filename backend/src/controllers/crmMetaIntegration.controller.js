const { sendServerError } = require('../utils/errorResponse');
const MetaIntegrationModel = require('../models/crmMetaIntegration.model');
const metaApi = require('../services/metaApi.service');
const metaCrypto = require('../utils/metaCrypto');
const { syncLeadsForConnection, syncCampaignsForConnection } = require('../services/metaSync.service');

// Never include pageAccessTokenEnc (or a decrypted token) in any response - this is the only
// shape the frontend ever sees for a connection.
function toSafeConnection(connection) {
  if (!connection) return null;
  return {
    id: connection.id,
    pageId: connection.pageId,
    pageName: connection.pageName,
    adAccountId: connection.adAccountId,
    adAccountName: connection.adAccountName,
    tokenExpiresAt: connection.tokenExpiresAt,
    lastLeadSyncAt: connection.lastLeadSyncAt,
    lastCampaignSyncAt: connection.lastCampaignSyncAt,
    status: connection.status,
    connectedBy: connection.connectedBy,
    createdAt: connection.createdAt,
  };
}

async function getStatus(req, res) {
  try {
    const connection = await MetaIntegrationModel.getConnection();
    res.json({ status: true, message: 'Meta integration status fetched successfully', data: toSafeConnection(connection) });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function connect(req, res) {
  try {
    const { pageAccessToken, pageId, adAccountId } = req.body;
    if (!pageAccessToken || !pageId) {
      return res.status(400).json({ status: false, message: 'pageAccessToken and pageId are required', data: null });
    }

    // Verify the token actually works and belongs to this Page before saving anything -
    // fails fast with Meta's own error message rather than silently storing a bad token.
    const page = await metaApi.verifyPageToken(pageAccessToken, pageId);

    let adAccountName = null;
    if (adAccountId) {
      adAccountName = await metaApi.getAdAccountName(adAccountId, pageAccessToken);
    }

    const pageAccessTokenEnc = metaCrypto.encrypt(pageAccessToken);
    const connection = await MetaIntegrationModel.upsertConnection({
      pageId: page.id,
      pageName: page.name,
      pageAccessTokenEnc,
      adAccountId: adAccountId || null,
      adAccountName,
      tokenExpiresAt: null,
      // Whoever is actually connecting this integration, from the authenticated session -
      // not trusted from the request body.
      connectedBy: req.user.userName,
    });

    res.status(201).json({ status: true, message: 'Meta account connected successfully', data: toSafeConnection(connection) });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message, data: null });
  }
}

async function disconnect(req, res) {
  try {
    await MetaIntegrationModel.disconnect();
    res.json({ status: true, message: 'Meta account disconnected successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function syncLeads(req, res) {
  try {
    const connection = await MetaIntegrationModel.getConnection();
    if (!connection) {
      return res.status(400).json({ status: false, message: 'No Meta account connected', data: null });
    }
    const summary = await syncLeadsForConnection(connection);
    await MetaIntegrationModel.updateLastLeadSync(connection.id);
    res.json({ status: true, message: `Synced ${summary.created} new lead(s)`, data: summary });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function syncCampaigns(req, res) {
  try {
    const connection = await MetaIntegrationModel.getConnection();
    if (!connection) {
      return res.status(400).json({ status: false, message: 'No Meta account connected', data: null });
    }
    const summary = await syncCampaignsForConnection(connection);
    await MetaIntegrationModel.updateLastCampaignSync(connection.id);
    res.json({ status: true, message: `Synced ${summary.created + summary.updated} campaign(s)`, data: summary });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getStatus, connect, disconnect, syncLeads, syncCampaigns };
