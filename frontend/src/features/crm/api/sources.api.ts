import crmAxiosClient from './crmAxiosClient';
import type { CrmSource, CrmSourcePayload } from '../types/source.types';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

export async function getSources(): Promise<CrmSource[]> {
    const { data } = await crmAxiosClient.get<ApiResponse<CrmSource[]>>('/sources');
    return data.data;
}

export async function createSource(payload: CrmSourcePayload): Promise<CrmSource> {
    const { data } = await crmAxiosClient.post<ApiResponse<CrmSource>>('/sources', payload);
    return data.data;
}

export async function updateSource(id: string, payload: Partial<CrmSourcePayload>): Promise<CrmSource> {
    const { data } = await crmAxiosClient.put<ApiResponse<CrmSource>>(`/sources/${id}`, payload);
    return data.data;
}

export async function deleteSource(id: string): Promise<void> {
    await crmAxiosClient.delete<ApiResponse<null>>(`/sources/${id}`);
}
