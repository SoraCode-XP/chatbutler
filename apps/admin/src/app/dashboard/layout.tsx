'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import {
  LayoutDashboard,
  Users,
  Cpu,
  BarChart2,
  LogOut,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: '数据看板', href: '/dashboard', icon: LayoutDashboard },
  { label: '用户管理', href: '/dashboard/users', icon: Users },
  { label: '模型配置', href: '/dashboard/models', icon: Cpu },
  { label: '用量分析', href: '/dashboard/usage', icon: BarChart2 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loadUser, logout } = useAdminAuthStore();
  const [activeSessions, setActiveSessions] = useState(0);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await api.get<{ activeSessions: number }>('/api/admin/usage/active-sessions');
        setActiveSessions(data.activeSessions);
      } catch {}
    };
    fetchSessions();
    const timer = setInterval(fetchSessions, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* 左侧导航 */}
      <aside className="w-60 bg-white border-r border-slate-100 flex flex-col shrink-0">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">管理后台</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <div className="px-3 py-2 rounded-lg bg-slate-50 mb-2">
            <div className="text-xs font-medium text-slate-900 truncate">
              {user?.nickname || user?.email}
            </div>
            <div className="text-xs text-slate-400 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="h-16 px-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <h1 className="text-sm font-medium text-slate-500">
            {NAV_ITEMS.find((n) => n.href === pathname || (n.href !== '/dashboard' && pathname.startsWith(n.href)))?.label || '管理后台'}
          </h1>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Radio size={14} className={activeSessions > 0 ? 'text-green-500' : 'text-slate-300'} />
            <span>
              在线会话{' '}
              <strong className={activeSessions > 0 ? 'text-green-600' : 'text-slate-400'}>
                {activeSessions}
              </strong>
            </span>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
