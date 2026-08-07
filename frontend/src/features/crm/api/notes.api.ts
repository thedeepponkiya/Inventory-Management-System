import crmAxiosClient from './crmAxiosClient';
import type { CrmNote, CrmNotePayload } from '../types/note.types';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

export async function getNotes(leadId: string): Promise<CrmNote[]> {
    const { data } = await crmAxiosClient.get<ApiResponse<CrmNote[]>>('/notes', { params: { leadId } });
    return data.data;
}

export async function createNote(payload: CrmNotePayload): Promise<CrmNote> {
    const { data } = await crmAxiosClient.post<ApiResponse<CrmNote>>('/notes', payload);
    return data.data;
}

export async function deleteNote(id: string): Promise<void> {
    await crmAxiosClient.delete<ApiResponse<null>>(`/notes/${id}`);
}
