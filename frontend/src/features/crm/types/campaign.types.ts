export type CrmCampaignStatus = 'Active' | 'Inactive';

export interface CrmCampaign {
    id: string;
    name: string;
    sourceId: string | null;
    sourceName: string | null;
    startDate: string | null;
    endDate: string | null;
    budget: number;
    status: CrmCampaignStatus;
    // Populated only for campaigns pulled in from Meta (metaCampaignId non-null) - see
    // metaSync.service.js on the backend. Null for manually-created campaigns.
    metaCampaignId: string | null;
    metaStatus: string | null;
    spend: number | null;
    impressions: number | null;
    clicks: number | null;
    lastSyncedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CrmCampaignPayload {
    name: string;
    sourceId: string | null;
    startDate: string | null;
    endDate: string | null;
    budget: number;
    status: CrmCampaignStatus;
}
