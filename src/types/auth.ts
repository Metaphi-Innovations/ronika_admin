export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'editor';
  lastLogin?: string;
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
