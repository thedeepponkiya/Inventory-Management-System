const API_BASE_URL = 'http://localhost:5000/api/v1';

export interface Category {
    id: number;
    category: string;
    status: 'Active' | 'Inactive';
}

export interface CategoryPayload {
    category: string;
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

export async function getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/categories`);
    return parseResponse<Category[]>(response);
}

export async function createCategory(payload: CategoryPayload): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<Category>(response);
}

export async function updateCategory(id: number, payload: Partial<CategoryPayload>): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<Category>(response);
}

export async function deleteCategory(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
