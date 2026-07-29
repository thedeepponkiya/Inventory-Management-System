const API_BASE_URL = 'http://localhost:5000/api/v1';

export interface Location {
    id: number;
    location: string;
    status: 'Active' | 'Inactive';
}

export interface LocationPayload {
    location: string;
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

export async function getLocations(): Promise<Location[]> {
    const response = await fetch(`${API_BASE_URL}/locations`);
    return parseResponse<Location[]>(response);
}

export async function createLocation(payload: LocationPayload): Promise<Location> {
    const response = await fetch(`${API_BASE_URL}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<Location>(response);
}

export async function updateLocation(id: number, payload: Partial<LocationPayload>): Promise<Location> {
    const response = await fetch(`${API_BASE_URL}/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<Location>(response);
}

export async function deleteLocation(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/locations/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
