const CrmLeadModel = require('../models/crmLead.model');
const CrmCampaignModel = require('../models/crmCampaign.model');
const CrmSourceModel = require('../models/crmSource.model');
const CrmStageModel = require('../models/crmStage.model');
const CrmNoteModel = require('../models/crmNote.model');
const metaCrypto = require('../utils/metaCrypto');
const metaApi = require('./metaApi.service');
const { mapLeadFields, formatUnmappedNote } = require('./metaLeadMapper');

const META_SOURCE_NAME = 'Meta Lead Ads';

// The seeded 'Meta Lead Ads' source row (schema.sql) always exists, but looked up fresh each
// sync rather than cached across process lifetime - it's one cheap query and avoids ever
// tagging a lead/campaign with a stale id if an admin ever recreates the source row.
async function getMetaSourceId() {
  const source = await CrmSourceModel.findByName(META_SOURCE_NAME);
  if (!source) throw new Error(`"${META_SOURCE_NAME}" CRM source is missing - it should have been seeded in schema.sql`);
  return source.id;
}

async function getDefaultStageId() {
  const stages = await CrmStageModel.getAll();
  return stages[0]?.id ?? null;
}

async function syncLeadsForConnection(connection) {
  const token = metaCrypto.decrypt(connection.pageAccessTokenEnc);
  const [sourceId, defaultStageId] = await Promise.all([getMetaSourceId(), getDefaultStageId()]);
  const sinceUnixTs = connection.lastLeadSyncAt ? Math.floor(new Date(connection.lastLeadSyncAt).getTime() / 1000) : undefined;

  const forms = await metaApi.getPageLeadForms(connection.pageId, token);
  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const form of forms) {
    let leads;
    try {
      leads = await metaApi.getFormLeads(form.id, token, sinceUnixTs);
    } catch (err) {
      errors.push(`Form "${form.name}": ${err.message}`);
      continue;
    }

    for (const lead of leads) {
      try {
        const existing = await CrmLeadModel.findByMetaLeadId(lead.id);
        if (existing) {
          skipped += 1;
          continue;
        }

        const { mapped, unmapped } = mapLeadFields(lead.field_data);
        const name = mapped.name || mapped.email || mapped.phone || `Meta Lead ${lead.id}`;

        let campaignId = null;
        if (lead.campaign_id) {
          const campaign = await CrmCampaignModel.findByMetaCampaignId(lead.campaign_id);
          campaignId = campaign?.id ?? null;
        }

        const leadCode = await CrmLeadModel.getNextLeadCode();
        const sortOrder = await CrmLeadModel.getNextSortOrder(defaultStageId);
        const createdLead = await CrmLeadModel.create(leadCode, {
          name,
          phone: mapped.phone,
          email: mapped.email,
          company: mapped.company,
          stageId: defaultStageId,
          sourceId,
          campaignId,
          assignedTo: null,
          value: 0,
          status: 'Active',
          priority: 'Medium',
          isStarred: false,
          sortOrder,
          metaLeadId: lead.id,
          metaFormId: form.id,
          metaFormName: form.name,
        });

        const noteBody = formatUnmappedNote(unmapped);
        if (noteBody) {
          await CrmNoteModel.create({ leadId: createdLead.id, body: noteBody, createdBy: null });
        }

        created += 1;
      } catch (err) {
        errors.push(`Lead ${lead.id}: ${err.message}`);
      }
    }
  }

  return { created, skipped, errors };
}

// Meta returns budget amounts in the ad account's smallest currency unit (e.g. cents for
// USD/INR paise) - divided by 100 to store as a normal decimal amount, matching how the
// rest of this app's `budget`/`value` columns are used.
function normalizeBudget(campaign) {
  const raw = campaign.daily_budget ?? campaign.lifetime_budget;
  return raw ? Number(raw) / 100 : 0;
}

async function syncCampaignsForConnection(connection) {
  if (!connection.adAccountId) {
    return { created: 0, updated: 0, errors: ['No Ad Account connected - campaign sync skipped'] };
  }

  const token = metaCrypto.decrypt(connection.pageAccessTokenEnc);
  const sourceId = await getMetaSourceId();
  const campaigns = await metaApi.getAdAccountCampaigns(connection.adAccountId, token);

  let created = 0;
  let updated = 0;
  const errors = [];

  for (const campaign of campaigns) {
    try {
      const wasExisting = Boolean(await CrmCampaignModel.findByMetaCampaignId(campaign.id));
      let insights = null;
      try {
        insights = await metaApi.getCampaignInsights(campaign.id, token);
      } catch {
        // No delivery data yet is expected for a brand-new campaign - not a real failure.
      }

      await CrmCampaignModel.upsertFromMeta({
        name: campaign.name,
        sourceId,
        budget: normalizeBudget(campaign),
        status: campaign.status === 'ACTIVE' ? 'Active' : 'Inactive',
        metaCampaignId: campaign.id,
        metaStatus: campaign.status,
        spend: insights?.spend ? Number(insights.spend) : null,
        impressions: insights?.impressions ? Number(insights.impressions) : null,
        clicks: insights?.clicks ? Number(insights.clicks) : null,
      });

      if (wasExisting) updated += 1;
      else created += 1;
    } catch (err) {
      errors.push(`Campaign "${campaign.name}": ${err.message}`);
    }
  }

  return { created, updated, errors };
}

module.exports = { syncLeadsForConnection, syncCampaignsForConnection };
