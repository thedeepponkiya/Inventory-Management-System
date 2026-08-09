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

// Single source of truth for Source Type - both SourceFormDialog.tsx's Add/Edit dropdown and
// CrmSourcesPage.tsx's Type column filter dropdown import this, so they can't drift apart.
// Lives here (not in SourceFormDialog.tsx) because exporting a plain constant alongside a
// component from the same file breaks React Fast Refresh.
export const SOURCE_TYPE_OPTIONS = ['Meta', 'WebForm', 'Manual', 'GoogleAds', 'WhatsApp', 'Referral', 'IndiaMART', 'Justdial'];
