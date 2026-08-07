import crmAxiosClient from './crmAxiosClient';
import type { CrmStage, CrmStagePayload } from '../types/stage.types';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

export async function getStages(): Promise<CrmStage[]> {
    const { data } = await crmAxiosClient.get<ApiResponse<CrmStage[]>>('/stages');
    return data.data;
}

export async function createStage(payload: Partial<CrmStagePayload>): Promise<CrmStage> {
    const { data } = await crmAxiosClient.post<ApiResponse<CrmStage>>('/stages', payload);
    return data.data;
}

export async function updateStage(id: string, payload: Partial<CrmStagePayload>): Promise<CrmStage> {
    const { data } = await crmAxiosClient.put<ApiResponse<CrmStage>>(`/stages/${id}`, payload);
    return data.data;
}

export async function deleteStage(id: string): Promise<void> {
    await crmAxiosClient.delete<ApiResponse<null>>(`/stages/${id}`);
}
