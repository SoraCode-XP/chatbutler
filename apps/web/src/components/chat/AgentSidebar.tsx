'use client';

import { useAgentStore } from '@/store/agent';
import { cn } from '@/lib/utils';
import { Star, MessageSquare } from 'lucide-react';

export function AgentSidebar() {
  const { agents, categories, currentAgent, selectAgent, toggleFavorite } = useAgentStore();

  const favoriteAgents = agents.filter((a) => a.isFavorite);

  return (
    <aside className="w-72 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Chat<span className="text-primary-600">Butler</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 收藏智能体 */}
        {favoriteAgents.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">
              收藏
            </h3>
            {favoriteAgents.map((agent) => (
              <AgentItem
                key={agent.id}
                agent={agent}
                active={currentAgent?.id === agent.id}
                onSelect={() => selectAgent(agent)}
                onToggleFavorite={() => toggleFavorite(agent.id)}
              />
            ))}
          </div>
        )}

        {/* 按分类显示 */}
        {categories.map((cat) => {
          const catAgents = agents.filter((a) => a.categoryId === cat.id);
          if (catAgents.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">
                {cat.name}
              </h3>
              {catAgents.map((agent) => (
                <AgentItem
                  key={agent.id}
                  agent={agent}
                  active={currentAgent?.id === agent.id}
                  onSelect={() => selectAgent(agent)}
                  onToggleFavorite={() => toggleFavorite(agent.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function AgentItem({
  agent,
  active,
  onSelect,
  onToggleFavorite,
}: {
  agent: any;
  active: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group transition-colors',
        active ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700',
      )}
    >
      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm">
        <MessageSquare size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{agent.name}</div>
        <div className="text-xs text-gray-500 truncate">{agent.description}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Star
          size={14}
          className={agent.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
        />
      </button>
    </div>
  );
}
