import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { AdminUser, LoginCredentials, AuthResponse } from '../types/auth';

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (emailOrCredentials: string | LoginCredentials, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: AdminUser) => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem('admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return !!localStorage.getItem('admin_token');
  });
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<AuthResponse>('/auth/me', { timeout: 12000 });
      if (res.data.success && res.data.data?.admin) {
        if (res.data.data.admin.isActive === false) {
          // Deactivated user detected on auth check
          setUser(null);
          localStorage.removeItem('admin_user');
          localStorage.removeItem('admin_token');
          window.location.href = '/login?deactivated=true';
          return;
        }
        setUser(res.data.data.admin);
        localStorage.setItem('admin_user', JSON.stringify(res.data.data.admin));
      } else {
        setUser(null);
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_token');
      }
    } catch (err: any) {
      const isDeactivated =
        err?.response?.data?.code === 'ACCOUNT_DEACTIVATED' ||
        err?.response?.status === 403 ||
        (typeof err?.response?.data?.message === 'string' &&
          err.response.data.message.toLowerCase().includes('deactivated'));

      if (isDeactivated) {
        setUser(null);
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_token');
        window.location.href = '/login?deactivated=true';
        return;
      }

      const hasCachedUser = !!localStorage.getItem('admin_user');
      if (!hasCachedUser || err?.response?.status === 401) {
        setUser(null);
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_token');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Real-time instantaneous logout listener when Super Admin deactivates this account
  useEffect(() => {
    const handleUserDeactivated = (e: Event) => {
      const customEvt = e as CustomEvent<{ userId: string }>;
      const targetId = customEvt.detail?.userId;

      const stored = localStorage.getItem('admin_user');
      let currentStoredId: string | null = null;
      try {
        if (stored) {
          const parsed = JSON.parse(stored);
          currentStoredId = parsed?.id || parsed?._id;
        }
      } catch {
        // Ignore parse error
      }

      const currentUserId = user?.id || (user as any)?._id || currentStoredId;

      if (targetId && currentUserId && String(targetId) === String(currentUserId)) {
        // Immediate on-the-spot session revocation & logout
        setUser(null);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login?deactivated=true';
      }
    };

    window.addEventListener('admin_user_deactivated', handleUserDeactivated);
    return () => {
      window.removeEventListener('admin_user_deactivated', handleUserDeactivated);
    };
  }, [user]);

  // Periodic active-session security heartbeat & tab focus verification
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth();
      }
    };

    const interval = setInterval(() => {
      checkAuth();
    }, 15000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [user]);

  const login = async (emailOrCredentials: string | LoginCredentials, password?: string) => {
    setError(null);
    const credentials: LoginCredentials =
      typeof emailOrCredentials === 'string'
        ? { email: emailOrCredentials, password: password || '' }
        : emailOrCredentials;

    try {
      const res = await api.post<AuthResponse>('/auth/login', credentials);
      if (res.data.success && res.data.data?.admin) {
        setUser(res.data.data.admin);
        localStorage.setItem('admin_user', JSON.stringify(res.data.data.admin));
        if (res.data.data.token) {
          localStorage.setItem('admin_token', res.data.data.token);
        }
      } else {
        throw new Error(res.data.message || 'Login failed');
      }
    } catch (err: unknown) {
      const message =
        axiosError(err) || (err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    }
  };

  const updateUser = (updatedUser: AdminUser) => {
    setUser(updatedUser);
    localStorage.setItem('admin_user', JSON.stringify(updatedUser));
  };

  const clearError = () => setError(null);

  function axiosError(err: unknown): string | null {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const resp = (err as { response?: { data?: { message?: string } } }).response;
      if (resp?.data?.message) return resp.data.message;
    }
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        updateUser,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
