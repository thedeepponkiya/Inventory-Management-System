const MetaIntegrationModel = require('../models/crmMetaIntegration.model');
const { syncLeadsForConnection, syncCampaignsForConnection } = require('../services/metaSync.service');

const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes - simple in-process interval, no job-queue dependency

// Runs the same sync logic the manual "Sync Now" buttons use (crmMetaIntegration.controller.js),
// so a single backend process keeps CRM leads/campaigns fresh without the admin having to
// click anything. A no-op if nothing is connected. Only appropriate for a single backend
// process - would need a real distributed lock/job queue if this app is ever scaled out.
function startMetaSyncScheduler() {
  setInterval(async () => {
    let connection;
    try {
      connection = await MetaIntegrationModel.getConnection();
    } catch (err) {
      console.error('[meta-sync] failed to load connection:', err.message);
      return;
    }
    if (!connection || connection.status !== 'Active') return;

    try {
      const leadsSummary = await syncLeadsForConnection(connection);
      await MetaIntegrationModel.updateLastLeadSync(connection.id);
      if (leadsSummary.created) console.log(`[meta-sync] created ${leadsSummary.created} lead(s)`);
    } catch (err) {
      console.error('[meta-sync] leads sync failed:', err.message);
    }

    try {
      const campaignsSummary = await syncCampaignsForConnection(connection);
      await MetaIntegrationModel.updateLastCampaignSync(connection.id);
      if (campaignsSummary.created || campaignsSummary.updated) {
        console.log(`[meta-sync] synced ${campaignsSummary.created + campaignsSummary.updated} campaign(s)`);
      }
    } catch (err) {
      console.error('[meta-sync] campaigns sync failed:', err.message);
    }
  }, INTERVAL_MS);
}

module.exports = { startMetaSyncScheduler };
