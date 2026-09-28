import { api } from './api';
import { AdminUser } from '../types/auth';

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'editor' | 'superadmin';
  isActive: boolean;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'editor' | 'superadmin';
  isActive?: boolean;
}

export interface UsersResponse {
  success: boolean;
  count: number;
  data: AdminUser[];
  message?: string;
}

export interface SingleUserResponse {
  success: boolean;
  data: AdminUser;
  message?: string;
}

export const userApi = {
  getUsers: async (): Promise<AdminUser[]> => {
    const res = await api.get<UsersResponse>('/admin/users');
    return res.data.data;
  },

  getUserById: async (id: string): Promise<AdminUser> => {
    const res = await api.get<SingleUserResponse>(`/admin/users/${id}`);
    return res.data.data;
  },

  createUser: async (data: CreateUserData): Promise<AdminUser> => {
    const res = await api.post<SingleUserResponse>('/admin/users', data);
    return res.data.data;
  },

  updateUser: async (id: string, data: UpdateUserData): Promise<AdminUser> => {
    const res = await api.put<SingleUserResponse>(`/admin/users/${id}`, data);
    return res.data.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  toggleUserStatus: async (id: string, isActive?: boolean): Promise<AdminUser> => {
    const res = await api.patch<SingleUserResponse>(`/admin/users/${id}/status`, { isActive });
    return res.data.data;
  },
};
