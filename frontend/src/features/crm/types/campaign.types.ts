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
