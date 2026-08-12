export type CrmStageOutcome = 'open' | 'won' | 'lost';

export interface CrmStage {
    id: string;
    name: string;
    sortOrder: number;
    color: string;
    isClosed: boolean;
    outcome: CrmStageOutcome;
    status: 'Active' | 'Inactive';
    createdAt: string;
    updatedAt: string;
}

export interface CrmStagePayload {
    name: string;
    sortOrder: number;
    color: string;
    isClosed: boolean;
    outcome: CrmStageOutcome;
    status: 'Active' | 'Inactive';
}
