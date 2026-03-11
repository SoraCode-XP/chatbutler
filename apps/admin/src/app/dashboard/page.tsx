'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatNumber, formatCost } from '@/lib/utils';
import { Users, MessageSquare, Cpu, DollarSign, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DashboardStats {
  userCount: number;
  agentCount: number;
  conversationCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}

interface TimeseriesRow {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requests: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesRow[]>([]);
  const [activeSessions, setActiveSessions] = useState(0);

  useEffect(() => {
    api.get<DashboardStats>('/api/admin/dashboard').then(setStats).catch(() => {});

    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    api
      .get<TimeseriesRow[]>(`/api/admin/usage/timeseries?start=${start}&granularity=day`)
      .then(setTimeseries)
      .catch(() => {});

    const fetchSessions = () =>
      api
        .get<{ activeSessions: number }>('/api/admin/usage/active-sessions')
        .then((d) => setActiveSessions(d.activeSessions))
        .catch(() => {});
    fetchSessions();
    const timer = setInterval(fetchSessions, 5000);
    return () => clearInterval(timer);
  }, []);

  const chartData = timeseries.map((r) => ({
    date: new Date(r.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    Input: r.inputTokens,
    Output: r.outputTokens,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">数据看板</h2>
        <p className="text-sm text-slate-500 mt-1">系统整体运行概览</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="注册用户"
          value={stats ? formatNumber(stats.userCount) : '—'}
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="智能体数"
          value={stats ? formatNumber(stats.agentCount) : '—'}
          icon={Cpu}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          label="累计对话"
          value={stats ? formatNumber(stats.conversationCount) : '—'}
          icon={MessageSquare}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="累计花费"
          value={stats ? formatCost(stats.totalCost) : '—'}
          icon={DollarSign}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* 在线会话 */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <div
            className={`w-2 h-2 rounded-full ${activeSessions > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}
          />
          <span className="text-sm font-medium text-slate-700">当前在线会话</span>
        </div>
        <div className="text-4xl font-bold text-slate-900">{activeSessions}</div>
        <div className="text-sm text-slate-400 mt-1">实时更新（每 5 秒）</div>
      </div>

      {/* 近7日 Token 趋势 */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-primary-600" />
          <span className="font-medium text-slate-900">近 7 日 Token 消耗趋势</span>
        </div>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-slate-400">
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatNumber(value), name + ' Tokens']}
                labelStyle={{ color: '#475569' }}
                contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
              />
              <Legend />
              <Area type="monotone" dataKey="Input" stroke="#3b82f6" fill="url(#inputGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="Output" stroke="#10b981" fill="url(#outputGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
