import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';

export interface Customer {
    id: number;
    customerName: string;
    email: string;
    phoneNumber: string;
    address: string;
    city: string;
    zipCode: string;
    gstNo: string | null;
    createdAt: string;
}

export interface CustomerPayload {
    customerName: string;
    email: string;
    phoneNumber: string;
    address: string;
    city: string;
    zipCode: string;
    gstNo: string;
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

export async function getCustomers(): Promise<Customer[]> {
    const response = await authFetch(`${API_BASE_URL}/customers`);
    return parseResponse<Customer[]>(response);
}

export async function createCustomer(payload: CustomerPayload): Promise<Customer> {
    const response = await authFetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<Customer>(response);
}

export async function updateCustomer(id: number, payload: Partial<CustomerPayload>): Promise<Customer> {
    const response = await authFetch(`${API_BASE_URL}/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<Customer>(response);
}

export async function deleteCustomer(id: number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/customers/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
