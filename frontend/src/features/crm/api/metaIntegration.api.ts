import crmAxiosClient from './crmAxiosClient';
import type { CrmMetaConnectPayload, CrmMetaConnection, CrmMetaSyncSummary } from '../types/metaIntegration.types';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

export async function getMetaStatus(): Promise<CrmMetaConnection | null> {
    const { data } = await crmAxiosClient.get<ApiResponse<CrmMetaConnection | null>>('/meta/status');
    return data.data;
}

export async function connectMeta(payload: CrmMetaConnectPayload): Promise<CrmMetaConnection> {
    const { data } = await crmAxiosClient.post<ApiResponse<CrmMetaConnection>>('/meta/connect', payload);
    return data.data;
}

export async function disconnectMeta(): Promise<void> {
    await crmAxiosClient.delete<ApiResponse<null>>('/meta/disconnect');
}

export async function syncMetaLeads(): Promise<CrmMetaSyncSummary> {
    const { data } = await crmAxiosClient.post<ApiResponse<CrmMetaSyncSummary>>('/meta/sync-leads');
    return data.data;
}

export async function syncMetaCampaigns(): Promise<CrmMetaSyncSummary> {
    const { data } = await crmAxiosClient.post<ApiResponse<CrmMetaSyncSummary>>('/meta/sync-campaigns');
    return data.data;
}
