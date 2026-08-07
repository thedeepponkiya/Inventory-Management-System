import crmAxiosClient from './crmAxiosClient';
import type { CrmFollowup, CrmFollowupPayload } from '../types/followup.types';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

export async function getFollowups(leadId?: string): Promise<CrmFollowup[]> {
    const { data } = await crmAxiosClient.get<ApiResponse<CrmFollowup[]>>('/followups', { params: leadId ? { leadId } : {} });
    return data.data;
}

export async function createFollowup(payload: CrmFollowupPayload): Promise<CrmFollowup> {
    const { data } = await crmAxiosClient.post<ApiResponse<CrmFollowup>>('/followups', payload);
    return data.data;
}

export async function updateFollowup(id: string, payload: Partial<CrmFollowupPayload> & { status?: 'Pending' | 'Completed' }): Promise<CrmFollowup> {
    const { data } = await crmAxiosClient.put<ApiResponse<CrmFollowup>>(`/followups/${id}`, payload);
    return data.data;
}

export async function deleteFollowup(id: string): Promise<void> {
    await crmAxiosClient.delete<ApiResponse<null>>(`/followups/${id}`);
}
