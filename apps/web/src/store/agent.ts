import { create } from 'zustand';
import { api } from '@/lib/api';
import type { AgentInfo, AgentCategory } from '@chatbutler/shared';

interface AgentState {
  agents: AgentInfo[];
  categories: AgentCategory[];
  currentAgent: AgentInfo | null;
  loading: boolean;
  loadAgents: () => Promise<void>;
  loadCategories: () => Promise<void>;
  selectAgent: (agent: AgentInfo) => void;
  toggleFavorite: (agentId: string) => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  categories: [],
  currentAgent: null,
  loading: false,

  loadAgents: async () => {
    set({ loading: true });
    try {
      const agents = await api.get<AgentInfo[]>('/api/agents');
      set({ agents });
    } finally {
      set({ loading: false });
    }
  },

  loadCategories: async () => {
    const categories = await api.get<AgentCategory[]>('/api/agents/categories');
    set({ categories });
  },

  selectAgent: (agent) => set({ currentAgent: agent }),

  toggleFavorite: async (agentId) => {
    await api.post(`/api/agents/${agentId}/favorite`);
    const { agents } = get();
    set({
      agents: agents.map((a) =>
        a.id === agentId ? { ...a, isFavorite: !a.isFavorite } : a,
      ),
    });
  },
}));
