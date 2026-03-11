'use client';

import { useEffect } from 'react';
import { AgentSidebar } from './AgentSidebar';
import { ChatArea } from './ChatArea';
import { useAuthStore } from '@/store/auth';
import { useAgentStore } from '@/store/agent';

export default function ChatLayout() {
  const { loadUser, isAuthenticated } = useAuthStore();
  const { loadAgents, loadCategories } = useAgentStore();

  useEffect(() => {
    loadUser();
    loadAgents();
    loadCategories();
  }, [loadUser, loadAgents, loadCategories]);

  return (
    <div className="flex h-full">
      <AgentSidebar />
      <ChatArea />
    </div>
  );
}
