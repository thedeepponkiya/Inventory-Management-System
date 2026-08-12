export interface CrmMetaConnection {
    id: string;
    pageId: string;
    pageName: string | null;
    adAccountId: string | null;
    adAccountName: string | null;
    tokenExpiresAt: string | null;
    lastLeadSyncAt: string | null;
    lastCampaignSyncAt: string | null;
    status: 'Active' | 'Inactive';
    connectedBy: string | null;
    createdAt: string;
}

export interface CrmMetaConnectPayload {
    pageAccessToken: string;
    pageId: string;
    adAccountId?: string;
}

export interface CrmMetaSyncSummary {
    created: number;
    updated?: number;
    skipped?: number;
    errors: string[];
}
