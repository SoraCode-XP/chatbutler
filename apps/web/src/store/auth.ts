import { create } from 'zustand';
import { api } from '@/lib/api';

interface AuthState {
  user: { id: string; email: string; nickname?: string; role: string } | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname?: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await api.post<{ accessToken: string; refreshToken: string }>('/api/auth/login', {
      email,
      password,
    });
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    set({ isAuthenticated: true });
    // 加载用户信息
    const user = await api.get<AuthState['user']>('/api/user/profile');
    set({ user });
  },

  register: async (email, password, nickname) => {
    const res = await api.post<{ accessToken: string; refreshToken: string }>('/api/auth/register', {
      email,
      password,
      nickname,
    });
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    set({ isAuthenticated: true });
    const user = await api.get<AuthState['user']>('/api/user/profile');
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const user = await api.get<AuthState['user']>('/api/user/profile');
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
