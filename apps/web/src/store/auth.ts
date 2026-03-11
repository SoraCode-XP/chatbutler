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

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  // 同步写 cookie，供 Next.js middleware 服务端读取（15分钟，与JWT一致）
  document.cookie = `accessToken=${accessToken}; path=/; max-age=900; SameSite=Lax`;
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  document.cookie = 'accessToken=; path=/; max-age=0';
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await api.post<{ accessToken: string; refreshToken: string }>('/api/auth/login', {
      email,
      password,
    });
    setTokens(res.accessToken, res.refreshToken);
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
    setTokens(res.accessToken, res.refreshToken);
    set({ isAuthenticated: true });
    const user = await api.get<AuthState['user']>('/api/user/profile');
    set({ user });
  },

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const user = await api.get<AuthState['user']>('/api/user/profile');
      set({ user, isAuthenticated: true });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },
}));
