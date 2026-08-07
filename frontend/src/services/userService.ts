const API_BASE_URL = 'http://localhost:5000/api/v1';

export interface User {
    id: number;
    userCode: string;
    fullName: string;
    email: string;
    phone: string | null;
    roleId: string | null;
    departmentId: string | null;
    profileImage: string | null;
    status: 'Active' | 'Inactive';
    lastLogin: string | null;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string | null;
}

export interface UserPayload {
    fullName: string;
    email: string;
    phone?: string | null;
    // Required when creating a user; omit on edit to keep the existing password unchanged.
    password?: string;
    roleId?: string | null;
    departmentId?: string | null;
    profileImage?: string | null;
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

export async function getUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users`);
    return parseResponse<User[]>(response);
}

export async function createUser(payload: UserPayload): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<User>(response);
}

export async function updateUser(id: number, payload: Partial<UserPayload>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseResponse<User>(response);
}

export async function deleteUser(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}

export async function uploadUserImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE_URL}/uploads/user-image`, {
        method: 'POST',
        body: formData,
    });
    const data = await parseResponse<{ path: string }>(response);
    return data.path;
}
