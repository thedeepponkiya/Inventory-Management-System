import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';
import { extractCustomFields } from './customFieldService';

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
    // Populated from whatever "cf_*" columns exist on the users table right now - merged in
    // by the backend separately from its own safe column list (see user.controller.js /
    // customField.service.js's getCustomFieldValues(Map), which never leak passwordHash or
    // isHidden) - see bomService.ts's identical Bom.customFields comment for the full
    // explanation of the shape itself.
    customFields: Record<string, unknown>;
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
    // Keyed by columnName (e.g. "cf_warrantyPeriod") - see CustomFieldsSection.tsx.
    customFields?: Record<string, unknown>;
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

function normalizeUser(user: User): User {
    return { ...user, customFields: extractCustomFields(user as unknown as Record<string, unknown>) };
}

export async function getUsers(): Promise<User[]> {
    const response = await authFetch(`${API_BASE_URL}/users`);
    const data = await parseResponse<User[]>(response);
    return data.map(normalizeUser);
}

export async function createUser(payload: UserPayload): Promise<User> {
    const response = await authFetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeUser(await parseResponse<User>(response));
}

export async function updateUser(id: number, payload: Partial<UserPayload>): Promise<User> {
    const response = await authFetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeUser(await parseResponse<User>(response));
}

export async function deleteUser(id: number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}

export async function uploadUserImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await authFetch(`${API_BASE_URL}/uploads/user-image`, {
        method: 'POST',
        body: formData,
    });
    const data = await parseResponse<{ path: string }>(response);
    return data.path;
}
