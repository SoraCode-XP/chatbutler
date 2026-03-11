import { create } from 'zustand';
import { api } from '@/lib/api';

interface AdminUser {
  id: string;
  email: string;
  nickname?: string;
  role: string;
}

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('admin_accessToken', accessToken);
  localStorage.setItem('admin_refreshToken', refreshToken);
  document.cookie = `admin_accessToken=${accessToken}; path=/; max-age=900; SameSite=Lax`;
}

function clearTokens() {
  localStorage.removeItem('admin_accessToken');
  localStorage.removeItem('admin_refreshToken');
  document.cookie = 'admin_accessToken=; path=/; max-age=0';
}

export const useAdminAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await api.post<{ accessToken: string; refreshToken: string }>(
      '/api/auth/login',
      { email, password },
    );
    // Temporarily set token to fetch profile
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_accessToken', res.accessToken);
    }
    const user = await api.get<AdminUser>('/api/user/profile');
    if (user.role !== 'admin') {
      localStorage.removeItem('admin_accessToken');
      throw new Error('非管理员账号，请使用普通用户登录入口');
    }
    setTokens(res.accessToken, res.refreshToken);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem('admin_accessToken');
      if (!token) return;
      const user = await api.get<AdminUser>('/api/user/profile');
      if (user.role !== 'admin') {
        clearTokens();
        set({ user: null, isAuthenticated: false });
        return;
      }
      set({ user, isAuthenticated: true });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },
}));
