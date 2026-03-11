'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, RefreshCw, Edit2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelConfig {
  modelId?: string;
  id?: string;
  name: string;
  memberTier: string;
  inputPrice?: number;
  outputPrice?: number;
  isEnabled: boolean;
}

interface Provider {
  id: string;
  slug: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  isEnabled: boolean;
  models: ModelConfig[];
}

interface HealthResult {
  success: boolean;
  latency?: number;
  error?: string;
}

export default function ModelsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, HealthResult>>({});
  const [healthLoading, setHealthLoading] = useState<Record<string, boolean>>({});
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ apiKey: '', baseUrl: '' });

  const load = async () => {
    try {
      const data = await api.get<Provider[]>('/api/admin/llm/providers');
      setProviders(data);
    } catch {
      toast.error('加载模型配置失败');
    }
  };

  useEffect(() => { load(); }, []);

  const checkHealth = async (slug: string) => {
    setHealthLoading((p) => ({ ...p, [slug]: true }));
    try {
      const res = await api.get<HealthResult>(`/api/admin/llm/providers/${slug}/health`);
      setHealth((p) => ({ ...p, [slug]: res }));
    } catch {
      setHealth((p) => ({ ...p, [slug]: { success: false, error: '请求失败' } }));
    } finally {
      setHealthLoading((p) => ({ ...p, [slug]: false }));
    }
  };

  const toggleProvider = async (slug: string, current: boolean) => {
    try {
      await api.patch(`/api/admin/llm/providers/${slug}`, { isEnabled: !current });
      toast.success(current ? '已禁用' : '已启用');
      load();
    } catch {
      toast.error('操作失败');
    }
  };

  const toggleModel = async (slug: string, modelId: string) => {
    try {
      await api.post(`/api/admin/llm/providers/${slug}/models/${encodeURIComponent(modelId)}/toggle`);
      toast.success('模型状态已切换');
      load();
    } catch {
      toast.error('操作失败');
    }
  };

  const saveEdit = async () => {
    if (!editSlug) return;
    try {
      await api.patch(`/api/admin/llm/providers/${editSlug}`, {
        ...(editForm.apiKey && { apiKey: editForm.apiKey }),
        ...(editForm.baseUrl && { baseUrl: editForm.baseUrl }),
      });
      toast.success('配置已保存，将自动重载');
      setEditSlug(null);
      load();
    } catch {
      toast.error('保存失败');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">模型配置</h2>
          <p className="text-sm text-slate-500 mt-1">管理 LLM 供应商和模型</p>
        </div>
      </div>

      <div className="space-y-3">
        {providers.map((p) => {
          const h = health[p.slug];
          const isExpanded = expanded === p.slug;
          const isChecking = healthLoading[p.slug];

          return (
            <div key={p.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              {/* Provider 头部 */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{p.name}</span>
                    <span className="text-xs text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">{p.slug}</span>
                    {!p.isEnabled && (
                      <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">已禁用</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">{p.baseUrl}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* 健康检测 */}
                  {h && (
                    <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full', h.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                      {h.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {h.success ? `${h.latency}ms` : h.error}
                    </div>
                  )}
                  <button
                    onClick={() => checkHealth(p.slug)}
                    disabled={isChecking}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={cn('inline mr-1', isChecking && 'animate-spin')} />
                    健康检测
                  </button>
                  <button
                    onClick={() => { setEditSlug(p.slug); setEditForm({ apiKey: '', baseUrl: p.baseUrl }); }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 size={12} className="inline mr-1" />
                    编辑
                  </button>
                  {/* 启用/禁用 toggle */}
                  <button
                    onClick={() => toggleProvider(p.slug, p.isEnabled)}
                    className={cn('relative inline-flex h-5 w-9 rounded-full transition-colors', p.isEnabled ? 'bg-primary-600' : 'bg-slate-200')}
                  >
                    <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5', p.isEnabled ? 'translate-x-4' : 'translate-x-0.5')} />
                  </button>
                  {/* 展开/收起 */}
                  <button onClick={() => setExpanded(isExpanded ? null : p.slug)} className="p-1 hover:bg-slate-50 rounded-lg">
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>
                </div>
              </div>

              {/* 模型列表 */}
              {isExpanded && (
                <div className="border-t border-slate-50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs">模型 ID</th>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">名称</th>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">最低 Tier</th>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">输入 ¥/1K</th>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">输出 ¥/1K</th>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {p.models.map((m) => {
                        const mid = m.modelId || m.id || m.name;
                        return (
                          <tr key={mid} className="hover:bg-slate-50">
                            <td className="px-5 py-2.5 font-mono text-xs text-slate-600">{mid}</td>
                            <td className="px-4 py-2.5 text-slate-700">{m.name}</td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">{m.memberTier}</td>
                            <td className="px-4 py-2.5 text-slate-500">{m.inputPrice ?? '—'}</td>
                            <td className="px-4 py-2.5 text-slate-500">{m.outputPrice ?? '—'}</td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => toggleModel(p.slug, mid)}
                                className={cn('relative inline-flex h-5 w-9 rounded-full transition-colors', m.isEnabled ? 'bg-primary-600' : 'bg-slate-200')}
                              >
                                <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5', m.isEnabled ? 'translate-x-4' : 'translate-x-0.5')} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 编辑弹窗 */}
      {editSlug && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">编辑供应商配置</h3>
              <button onClick={() => setEditSlug(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
              <input
                value={editForm.baseUrl}
                onChange={(e) => setEditForm((f) => ({ ...f, baseUrl: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">API Key（留空则不修改）</label>
              <input
                type="password"
                value={editForm.apiKey}
                onChange={(e) => setEditForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditSlug(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
              <button onClick={saveEdit} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
