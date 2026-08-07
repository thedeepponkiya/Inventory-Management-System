import crmAxiosClient from './crmAxiosClient';
import type { CrmCampaign, CrmCampaignPayload } from '../types/campaign.types';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

// Postgres NUMERIC ("budget") comes back as a string over the wire - same coercion every
// other service in this app already applies for its own NUMERIC columns.
function normalizeCampaign(campaign: CrmCampaign): CrmCampaign {
    return { ...campaign, budget: Number(campaign.budget) };
}

export async function getCampaigns(): Promise<CrmCampaign[]> {
    const { data } = await crmAxiosClient.get<ApiResponse<CrmCampaign[]>>('/campaigns');
    return data.data.map(normalizeCampaign);
}

export async function createCampaign(payload: Partial<CrmCampaignPayload>): Promise<CrmCampaign> {
    const { data } = await crmAxiosClient.post<ApiResponse<CrmCampaign>>('/campaigns', payload);
    return normalizeCampaign(data.data);
}

export async function updateCampaign(id: string, payload: Partial<CrmCampaignPayload>): Promise<CrmCampaign> {
    const { data } = await crmAxiosClient.put<ApiResponse<CrmCampaign>>(`/campaigns/${id}`, payload);
    return normalizeCampaign(data.data);
}

export async function deleteCampaign(id: string): Promise<void> {
    await crmAxiosClient.delete<ApiResponse<null>>(`/campaigns/${id}`);
}
