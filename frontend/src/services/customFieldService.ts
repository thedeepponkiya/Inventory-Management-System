import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';

const BASE = `${API_BASE_URL}/developer-admin/custom-fields`;

export type CustomFieldType = 'text' | 'textarea' | 'number' | 'date' | 'dropdown' | 'checkbox';

export interface CustomFieldEntity {
    key: string;
    label: string;
}

export interface CustomFieldTypeOption {
    key: CustomFieldType;
    label: string;
}

export interface CustomFieldDefinition {
    id: number;
    entityKey: string;
    columnName: string;
    label: string;
    fieldType: CustomFieldType;
    options: string[] | null;
    required: boolean;
    // Toggling this off (see updateCustomField) hides the field from real forms/tables (they
    // fetch with includeInactive left at its default false) without dropping its column or
    // any data already stored in it - unlike Delete, it's fully reversible.
    active: boolean;
    sortOrder: number;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string | null;
}

export interface CustomFieldPayload {
    entityKey: string;
    label: string;
    fieldType: CustomFieldType;
    options?: string[];
    required?: boolean;
    active?: boolean;
}

export interface BuiltInField {
    entityKey: string;
    fieldKey: string;
    defaultLabel: string;
    // Current display label - the override if one's been set, otherwise defaultLabel. This is
    // the value every form's own header/label text should actually show (see
    // useFieldLabels.ts), never defaultLabel directly.
    label: string;
    isOverridden: boolean;
}

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

async function parseResponse<T>(response: Response): Promise<T> {
    const result: ApiResponse<T> = await response.json();
    if (!response.ok || !result.status) {
        throw new Error(result.message ?? 'Request failed');
    }
    return result.data;
}

export async function getCustomFieldEntities(): Promise<{ entities: CustomFieldEntity[]; fieldTypes: CustomFieldTypeOption[] }> {
    const response = await authFetch(`${BASE}/entities`);
    return parseResponse(response);
}

// Shared by every entity service's own normalize function (see bomService.ts's normalizeBom
// for the pattern this generalizes): the backend returns a plain `SELECT *`, so any "cf_*"
// column Developer Admin has added shows up as a flat top-level key on the raw row - this
// pulls those out into their own object so callers never need to know which custom fields
// exist to type against them, and no raw `cf_*` key leaks into the typed interface itself.
export function extractCustomFields(raw: Record<string, unknown>): Record<string, unknown> {
    const customFields: Record<string, unknown> = {};
    for (const key of Object.keys(raw)) {
        if (key.startsWith('cf_')) customFields[key] = raw[key];
    }
    return customFields;
}

// Omit entityKey to fetch every definition across every form (used by Developer Admin's own
// list view); pass it to scope to just the form actually rendering (used by every real form's
// CustomFieldsSection). `includeInactive` defaults to false so real forms only ever see fields
// still switched on - CustomFieldsPanel passes true so admins can also see and re-enable ones
// they've turned off.
export async function getCustomFieldDefinitions(entityKey?: string, includeInactive = false): Promise<CustomFieldDefinition[]> {
    const params = new URLSearchParams();
    if (entityKey) params.set('entityKey', entityKey);
    if (includeInactive) params.set('includeInactive', 'true');
    const query = params.toString();
    const response = await authFetch(query ? `${BASE}?${query}` : BASE);
    return parseResponse(response);
}

export async function createCustomField(payload: CustomFieldPayload): Promise<CustomFieldDefinition> {
    const response = await authFetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse(response);
}

export async function updateCustomField(id: number, payload: Pick<CustomFieldPayload, 'label' | 'options' | 'required' | 'active'>): Promise<CustomFieldDefinition> {
    const response = await authFetch(`${BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse(response);
}

// `confirm` must be the literal phrase "DELETE FIELD" - deleting a field drops its real
// database column (see customField.service.js's deleteDefinition), permanently losing any
// data already entered against it.
export async function deleteCustomField(id: number, confirm: string): Promise<void> {
    const response = await authFetch(`${BASE}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm }),
    });
    await parseResponse(response);
}

// Every built-in (already-existing) field for this form, each carrying whatever label it
// currently shows - see customField.service.js's listBuiltInFields.
export async function getBuiltInFields(entityKey: string): Promise<BuiltInField[]> {
    const response = await authFetch(`${BASE}/built-in?entityKey=${encodeURIComponent(entityKey)}`);
    return parseResponse(response);
}

// Renames how an existing field is displayed - never touches real data, so there's no
// confirm-phrase step here unlike deleteCustomField.
export async function setBuiltInFieldLabel(entityKey: string, fieldKey: string, label: string): Promise<BuiltInField[]> {
    const response = await authFetch(`${BASE}/built-in`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityKey, fieldKey, label }),
    });
    return parseResponse(response);
}

export async function resetBuiltInFieldLabel(entityKey: string, fieldKey: string): Promise<BuiltInField[]> {
    const response = await authFetch(`${BASE}/built-in`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityKey, fieldKey }),
    });
    return parseResponse(response);
}
