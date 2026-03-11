'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { formatNumber, formatCost } from '@/lib/utils';
import { Radio } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  requests: number;
}

interface TimeseriesRow {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requests: number;
}

interface ModelRow {
  modelId: string;
  providerId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requests: number;
}

interface UserRow {
  userId: string;
  email: string;
  nickname: string | null;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requests: number;
  costShare: number;
}

// ─── Presets ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '7天', days: 7 },
  { label: '30天', days: 30 },
  { label: '90天', days: 90 },
];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}

function getGranularity(start: string, end: string): 'hour' | 'day' {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400_000;
  return diff <= 7 ? 'hour' : 'day';
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today);
  const [preset, setPreset] = useState<number | null>(30);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesRow[]>([]);
  const [byModel, setByModel] = useState<ModelRow[]>([]);
  const [byUser, setByUser] = useState<UserRow[]>([]);
  const [activeSessions, setActiveSessions] = useState(0);
  const [modelTab, setModelTab] = useState<'model' | 'time'>('model');

  const load = useCallback(async () => {
    const gran = getGranularity(startDate, endDate);
    const qs = `start=${startDate}T00:00:00.000Z&end=${endDate}T23:59:59.999Z`;

    const [s, ts, m, u] = await Promise.allSettled([
      api.get<Summary>(`/api/admin/usage/summary?${qs}`),
      api.get<TimeseriesRow[]>(`/api/admin/usage/timeseries?${qs}&granularity=${gran}`),
      api.get<ModelRow[]>(`/api/admin/usage/by-model?${qs}`),
      api.get<UserRow[]>(`/api/admin/usage/by-user?${qs}&limit=20`),
    ]);

    if (s.status === 'fulfilled') setSummary(s.value);
    if (ts.status === 'fulfilled') setTimeseries(ts.value);
    if (m.status === 'fulfilled') setByModel(m.value);
    if (u.status === 'fulfilled') setByUser(u.value);
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const fetch = () =>
      api
        .get<{ activeSessions: number }>('/api/admin/usage/active-sessions')
        .then((d) => setActiveSessions(d.activeSessions))
        .catch(() => {});
    fetch();
    const t = setInterval(fetch, 5000);
    return () => clearInterval(t);
  }, []);

  const applyPreset = (days: number) => {
    setPreset(days);
    setStartDate(daysAgo(days));
    setEndDate(today);
  };

  // Chart data
  const gran = getGranularity(startDate, endDate);
  const tokenChartData = timeseries.map((r) => ({
    date: gran === 'hour'
      ? new Date(r.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : new Date(r.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    Input: r.inputTokens,
    Output: r.outputTokens,
  }));

  const costChartData = timeseries.map((r) => ({
    date: gran === 'hour'
      ? new Date(r.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : new Date(r.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    花费: Number(r.cost.toFixed(6)),
  }));

  return (
    <div className="space-y-5">
      {/* 标题 + 时间选择器 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">用量分析</h2>
          <p className="text-sm text-slate-500 mt-1">模型调用统计与费用明细</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 快速预设 */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {PRESETS.map(({ label, days }) => (
              <button
                key={days}
                onClick={() => applyPreset(days)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  preset === days
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 自定义日期范围 */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => { setStartDate(e.target.value); setPreset(null); }}
              className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => { setEndDate(e.target.value); setPreset(null); }}
              className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          {/* 在线会话 */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm">
            <Radio size={13} className={activeSessions > 0 ? 'text-green-500' : 'text-slate-300'} />
            <span className="text-slate-500">在线</span>
            <strong className={activeSessions > 0 ? 'text-green-600' : 'text-slate-400'}>
              {activeSessions}
            </strong>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Input Tokens"
          value={summary ? formatNumber(summary.inputTokens) : '—'}
          sub="提示词 Tokens"
        />
        <StatCard
          label="Output Tokens"
          value={summary ? formatNumber(summary.outputTokens) : '—'}
          sub="生成 Tokens"
        />
        <StatCard
          label="总花费"
          value={summary ? formatCost(summary.cost) : '—'}
          sub={`共 ${summary ? formatNumber(summary.totalTokens) : '—'} Tokens`}
        />
        <StatCard
          label="请求次数"
          value={summary ? formatNumber(summary.requests) : '—'}
          sub="API 调用总次数"
        />
      </div>

      {/* 图表行 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Token 趋势 AreaChart */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="font-medium text-slate-900 mb-4 text-sm">
            Token 消耗趋势
            <span className="ml-2 text-xs text-slate-400">
              {gran === 'hour' ? '按小时' : '按天'}
            </span>
          </div>
          {tokenChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={tokenChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="og" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={formatNumber} width={48} />
                <Tooltip
                  formatter={(v: number, name: string) => [formatNumber(v), `${name} Tokens`]}
                  contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Input" stroke="#3b82f6" fill="url(#ig)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="Output" stroke="#10b981" fill="url(#og)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 花费 BarChart */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="font-medium text-slate-900 mb-4 text-sm">
            花费趋势
            <span className="ml-2 text-xs text-slate-400">
              {gran === 'hour' ? '按小时' : '按天'}
            </span>
          </div>
          {costChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={costChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v) => `¥${v.toFixed(4)}`}
                  width={64}
                />
                <Tooltip
                  formatter={(v: number) => [`¥ ${v.toFixed(6)}`, '花费']}
                  contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="花费" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 明细表格行 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 按模型 */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-3">
            <button
              onClick={() => setModelTab('model')}
              className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${modelTab === 'model' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              按模型消耗
            </button>
            <button
              onClick={() => setModelTab('time')}
              className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${modelTab === 'time' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              按时段请求数
            </button>
          </div>

          {modelTab === 'model' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="text-left px-5 py-2.5 font-medium">模型</th>
                  <th className="text-right px-4 py-2.5 font-medium">请求</th>
                  <th className="text-right px-4 py-2.5 font-medium">Tokens</th>
                  <th className="text-right px-4 py-2.5 font-medium">花费</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {byModel.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">暂无数据</td></tr>
                ) : byModel.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs text-slate-700">{m.modelId}</div>
                      <div className="text-xs text-slate-400">{m.providerId}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{m.requests.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(m.inputTokens + m.outputTokens)}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">{formatCost(m.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="text-left px-5 py-2.5 font-medium">时段</th>
                  <th className="text-right px-4 py-2.5 font-medium">请求数</th>
                  <th className="text-right px-4 py-2.5 font-medium">Output Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {timeseries.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-10 text-slate-400 text-sm">暂无数据</td></tr>
                ) : timeseries.slice(0, 20).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-700 text-xs font-mono">
                      {new Date(r.date).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: gran === 'hour' ? '2-digit' : undefined })}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{r.requests.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(r.outputTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 按用户 Top N */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50">
            <span className="text-sm font-medium text-slate-900">按用户消耗排行</span>
            <span className="ml-2 text-xs text-slate-400">Top 20</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="text-left px-5 py-2.5 font-medium">用户</th>
                <th className="text-right px-4 py-2.5 font-medium">请求</th>
                <th className="text-right px-4 py-2.5 font-medium">Tokens</th>
                <th className="text-right px-4 py-2.5 font-medium">花费</th>
                <th className="text-right px-4 py-2.5 font-medium">占比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {byUser.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">暂无数据</td></tr>
              ) : byUser.map((u, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-xs font-medium text-slate-900">{u.nickname || '—'}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[140px]">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{u.requests.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatNumber(u.inputTokens + u.outputTokens)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-amber-600">{formatCost(u.cost)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${Math.min(100, u.costShare)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">
                        {u.costShare.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
