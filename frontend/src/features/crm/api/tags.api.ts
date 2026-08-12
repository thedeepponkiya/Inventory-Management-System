import crmAxiosClient from './crmAxiosClient';
import type { CrmTag } from '../types/tag.types';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

export async function getLeadTags(leadId: string): Promise<CrmTag[]> {
    const { data } = await crmAxiosClient.get<ApiResponse<CrmTag[]>>('/tags', { params: { leadId } });
    return data.data;
}

export async function addLeadTag(leadId: string, name: string): Promise<CrmTag> {
    const { data } = await crmAxiosClient.post<ApiResponse<CrmTag>>('/tags', { leadId, name });
    return data.data;
}

export async function removeLeadTag(leadId: string, tagId: string): Promise<void> {
    await crmAxiosClient.delete<ApiResponse<null>>(`/tags/${tagId}`, { params: { leadId } });
}
