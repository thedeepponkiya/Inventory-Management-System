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
    // Populated from whatever "cf_*" columns exist on crm_followups right now - see
    // bomService.ts's identical Bom.customFields comment for the full explanation.
    customFields: Record<string, unknown>;
}

export interface CrmFollowupPayload {
    leadId: string;
    dueAt: string;
    type: CrmFollowupType;
    notes: string | null;
    // Keyed by columnName (e.g. "cf_warrantyPeriod") - see CustomFieldsSection.tsx.
    customFields?: Record<string, unknown>;
}
