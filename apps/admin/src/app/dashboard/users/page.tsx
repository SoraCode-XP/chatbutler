'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: string;
  email: string;
  nickname: string | null;
  role: string;
  createdAt: string;
  membership: { level: string; resourcePoints: number } | null;
}

interface UserListResponse {
  total: number;
  page: number;
  limit: number;
  users: User[];
}

const ROLES = ['user', 'admin'];
const LEVELS = ['free', 'basic', 'pro', 'enterprise'];

const LEVEL_LABELS: Record<string, string> = {
  free: '免费',
  basic: '基础',
  pro: '专业',
  enterprise: '企业',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-50 text-red-700 border-red-100',
  user: 'bg-slate-50 text-slate-600 border-slate-100',
};

export default function UsersPage() {
  const [data, setData] = useState<UserListResponse | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      const res = await api.get<UserListResponse>(`/api/admin/users?${params}`);
      setData(res);
    } catch {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRole = async (userId: string, role: string) => {
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role });
      toast.success('角色已更新');
      load();
    } catch {
      toast.error('更新失败');
    }
  };

  const updateMembership = async (userId: string, level: string) => {
    try {
      await api.patch(`/api/admin/users/${userId}/membership`, { level });
      toast.success('会员等级已更新');
      load();
    } catch {
      toast.error('更新失败');
    }
  };

  const totalPages = data ? Math.ceil(data.total / 15) : 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">用户管理</h2>
          <p className="text-sm text-slate-500 mt-1">共 {data?.total ?? '—'} 名用户</p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜索邮箱或昵称"
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none w-56"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-500">用户</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">角色</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">会员等级</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">积分</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">注册时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">加载中...</td>
              </tr>
            )}
            {!loading && data?.users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{u.nickname || '—'}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer bg-transparent ${ROLE_COLORS[u.role] || ROLE_COLORS.user}`}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.membership?.level || 'free'}
                    onChange={(e) => updateMembership(u.id, e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white cursor-pointer"
                  >
                    {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {(u.membership?.resourcePoints ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                </td>
              </tr>
            ))}
            {!loading && data?.users.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">暂无数据</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-sm text-slate-500">第 {page} / {totalPages} 页</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
