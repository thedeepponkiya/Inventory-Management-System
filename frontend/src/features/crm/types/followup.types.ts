export type CrmFollowupType = 'Call' | 'Email' | 'WhatsApp' | 'Meeting' | 'Other';
export type CrmFollowupStatus = 'Pending' | 'Completed';

export interface CrmFollowup {
    id: string;
    leadId: string;
    dueAt: string;
    type: CrmFollowupType;
    notes: string | null;
    status: CrmFollowupStatus;
    completedAt: string | null;
    createdBy: number | null;
    createdByName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CrmFollowupPayload {
    leadId: string;
    dueAt: string;
    type: CrmFollowupType;
    notes: string | null;
}
