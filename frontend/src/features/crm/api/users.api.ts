import crmAxiosClient from './crmAxiosClient';
import type { CrmAssignableUser } from '../types/user.types';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

export async function getAssignableUsers(): Promise<CrmAssignableUser[]> {
    const { data } = await crmAxiosClient.get<ApiResponse<CrmAssignableUser[]>>('/users');
    return data.data;
}
