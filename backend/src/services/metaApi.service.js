const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

// Every Graph API call goes through here so error shape is consistent - Meta returns errors
// as `{ error: { message, type, code } }` with a 400/401/etc status, not a generic 500.
async function graphGet(path, params) {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(body.error?.message || `Meta API request failed (${response.status})`);
  }
  return body;
}

async function verifyPageToken(pageAccessToken, pageId) {
  const data = await graphGet(`/${pageId}`, { fields: 'id,name', access_token: pageAccessToken });
  return { id: data.id, name: data.name };
}

async function getAdAccountName(adAccountId, accessToken) {
  const data = await graphGet(`/${adAccountId}`, { fields: 'name', access_token: accessToken });
  return data.name;
}

async function getPageLeadForms(pageId, accessToken) {
  const data = await graphGet(`/${pageId}/leadgen_forms`, { fields: 'id,name', access_token: accessToken });
  return data.data || [];
}

// `sinceUnixTs` (seconds) is omitted on a form's first-ever sync to pull all historical leads.
async function getFormLeads(formId, accessToken, sinceUnixTs) {
  const params = { fields: 'id,created_time,field_data,ad_id,campaign_id', access_token: accessToken };
  if (sinceUnixTs) {
    params.filtering = JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: sinceUnixTs }]);
  }
  const data = await graphGet(`/${formId}/leads`, params);
  return data.data || [];
}

async function getAdAccountCampaigns(adAccountId, accessToken) {
  const data = await graphGet(`/${adAccountId}/campaigns`, {
    fields: 'id,name,status,daily_budget,lifetime_budget,start_time,stop_time',
    access_token: accessToken,
  });
  return data.data || [];
}

// Insights are only available once a campaign has delivery data - callers should treat a
// missing/empty result as "no spend yet", not an error.
async function getCampaignInsights(campaignId, accessToken) {
  const data = await graphGet(`/${campaignId}/insights`, { fields: 'spend,impressions,clicks,reach', access_token: accessToken });
  return data.data?.[0] || null;
}

module.exports = {
  verifyPageToken,
  getAdAccountName,
  getPageLeadForms,
  getFormLeads,
  getAdAccountCampaigns,
  getCampaignInsights,
};
