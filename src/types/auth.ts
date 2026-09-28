export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'editor';
  isActive: boolean;
  lastLogin?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    admin: AdminUser;
    token?: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}
