export interface CrmSource {
    id: string;
    name: string;
    type: string;
    status: 'Active' | 'Inactive';
    createdAt: string;
    updatedAt: string;
}

export interface CrmSourcePayload {
    name: string;
    type: string;
    status: 'Active' | 'Inactive';
}
