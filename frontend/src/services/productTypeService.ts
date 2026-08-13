import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';

export interface ProductType {
    id: number;
    productType: string;
    description: string | null;
    status: 'Active' | 'Inactive';
    createdAt: string;
}

export interface ProductTypePayload {
    productType: string;
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

export async function getProductTypes(): Promise<ProductType[]> {
    const response = await authFetch(`${API_BASE_URL}/product-types`);
    return parseResponse<ProductType[]>(response);
}

export async function createProductType(payload: ProductTypePayload): Promise<ProductType> {
    const response = await authFetch(`${API_BASE_URL}/product-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<ProductType>(response);
}

export async function updateProductType(id: number, payload: Partial<ProductTypePayload>): Promise<ProductType> {
    const response = await authFetch(`${API_BASE_URL}/product-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<ProductType>(response);
}

export async function deleteProductType(id: number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/product-types/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
