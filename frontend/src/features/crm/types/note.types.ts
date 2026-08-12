export interface CrmNote {
    id: string;
    leadId: string;
    body: string;
    createdBy: number | null;
    createdByName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CrmNotePayload {
    leadId: string;
    body: string;
}
