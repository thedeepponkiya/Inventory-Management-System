export type CrmLeadStatus = 'Active' | 'Archived';
export type CrmLeadPriority = 'High' | 'Medium' | 'Low';

export interface CrmLead {
    id: string;
    leadCode: string;
    name: string;
    phone: string | null;
    email: string | null;
    company: string | null;
    stageId: string | null;
    sourceId: string | null;
    assignedTo: number | null;
    value: number;
    status: CrmLeadStatus;
    priority: CrmLeadPriority;
    isStarred: boolean;
    // Manual position within its stage's Kanban column - see reorderLeadsInStage.
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    // Joined display-only fields (see backend crmLead.model.js's SELECT_WITH_JOINS)
    stageName: string | null;
    stageColor: string | null;
    sourceName: string | null;
    assignedToName: string | null;
    // Populated from whatever "cf_*" columns exist on crm_leads right now - see
    // bomService.ts's identical Bom.customFields comment for the full explanation.
    customFields: Record<string, unknown>;
}

export interface CrmLeadPayload {
    name: string;
    phone: string | null;
    email: string | null;
    company: string | null;
    stageId: string | null;
    sourceId: string | null;
    assignedTo: number | null;
    value: number;
    status: CrmLeadStatus;
    priority: CrmLeadPriority;
    isStarred: boolean;
    // Keyed by columnName (e.g. "cf_warrantyPeriod") - see CustomFieldsSection.tsx.
    customFields?: Record<string, unknown>;
}
