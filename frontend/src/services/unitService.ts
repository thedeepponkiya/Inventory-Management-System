import { authFetch } from './httpClient';
const API_BASE_URL = 'http://localhost:5000/api/v1';

export interface Unit {
    id: number;
    unit: string;
    description: string | null;
    status: 'Active' | 'Inactive';
    createdAt: string;
}

export interface UnitPayload {
    unit: string;
    description: string | null;
    status: 'Active' | 'Inactive';
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

export async function getUnits(): Promise<Unit[]> {
    const response = await authFetch(`${API_BASE_URL}/units`);
    return parseResponse<Unit[]>(response);
}

export async function createUnit(payload: UnitPayload): Promise<Unit> {
    const response = await authFetch(`${API_BASE_URL}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<Unit>(response);
}

export async function updateUnit(id: number, payload: Partial<UnitPayload>): Promise<Unit> {
    const response = await authFetch(`${API_BASE_URL}/units/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<Unit>(response);
}

export async function deleteUnit(id: number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/units/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
