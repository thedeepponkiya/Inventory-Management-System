import crmAxiosClient from './crmAxiosClient';
import type { CrmLead, CrmLeadPayload } from '../types/lead.types';
import { extractCustomFields } from '../../../services/customFieldService';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

// Postgres NUMERIC columns (here: "value") come back as strings over the wire - same
// coercion every other service in this app already applies for its own NUMERIC columns
// (e.g. rawSkuService.ts, purchaseOrderService.ts).
function normalizeLead(lead: CrmLead): CrmLead {
    return { ...lead, value: Number(lead.value), customFields: extractCustomFields(lead as unknown as Record<string, unknown>) };
}

export async function getLeads(): Promise<CrmLead[]> {
    const { data } = await crmAxiosClient.get<ApiResponse<CrmLead[]>>('/leads');
    return data.data.map(normalizeLead);
}

export async function getNextLeadCode(): Promise<string> {
    const { data } = await crmAxiosClient.get<ApiResponse<{ leadCode: string }>>('/leads/next-code');
    return data.data.leadCode;
}

export async function createLead(payload: Partial<CrmLeadPayload>): Promise<CrmLead> {
    const { data } = await crmAxiosClient.post<ApiResponse<CrmLead>>('/leads', payload);
    return normalizeLead(data.data);
}

export async function updateLead(id: string, payload: Partial<CrmLeadPayload>): Promise<CrmLead> {
    const { data } = await crmAxiosClient.put<ApiResponse<CrmLead>>(`/leads/${id}`, payload);
    return normalizeLead(data.data);
}

export async function deleteLead(id: string): Promise<void> {
    await crmAxiosClient.delete<ApiResponse<null>>(`/leads/${id}`);
}

// orderedLeadIds is the target stage's FULL final card order (including the moved lead in its
// new spot) - the backend rewrites sortOrder for every id in the array to match its index.
export async function reorderLeadsInStage(stageId: string | null, orderedLeadIds: string[]): Promise<CrmLead[]> {
    const { data } = await crmAxiosClient.put<ApiResponse<CrmLead[]>>('/leads/reorder', { stageId, orderedLeadIds });
    return data.data.map(normalizeLead);
}
