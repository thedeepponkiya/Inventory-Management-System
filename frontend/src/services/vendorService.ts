import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';

export interface Vendor {
    id: number;
    vendorName: string;
    email: string;
    phoneNumber: string;
    address: string;
    city: string;
    zipCode: string;
    createdAt: string;
}

export interface VendorPayload {
    vendorName: string;
    email: string;
    phoneNumber: string;
    address: string;
    city: string;
    zipCode: string;
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

export async function getVendors(): Promise<Vendor[]> {
    const response = await authFetch(`${API_BASE_URL}/vendors`);
    return parseResponse<Vendor[]>(response);
}

export async function createVendor(payload: VendorPayload): Promise<Vendor> {
    const response = await authFetch(`${API_BASE_URL}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<Vendor>(response);
}

export async function updateVendor(id: number, payload: Partial<VendorPayload>): Promise<Vendor> {
    const response = await authFetch(`${API_BASE_URL}/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<Vendor>(response);
}

export async function deleteVendor(id: number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/vendors/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
