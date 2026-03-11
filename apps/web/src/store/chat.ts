import { create } from 'zustand';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { WS_EVENTS } from '@chatbutler/shared';
import type { Message, Conversation } from '@chatbutler/shared';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;

  loadConversations: (agentId?: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, agentId: string, conversationId?: string) => void;
  setCurrentConversation: (conv: Conversation | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  streamingContent: '',
  isStreaming: false,

  loadConversations: async (agentId) => {
    const url = agentId ? `/api/chat/conversations?agentId=${agentId}` : '/api/chat/conversations';
    const conversations = await api.get<Conversation[]>(url);
    set({ conversations });
  },

  loadMessages: async (conversationId) => {
    const messages = await api.get<Message[]>(`/api/chat/conversations/${conversationId}/messages`);
    set({ messages });
  },

  sendMessage: (content, agentId, conversationId) => {
    const socket = connectSocket();

    // 添加用户消息到列表
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      messages: [...state.messages, userMessage],
      streamingContent: '',
      isStreaming: true,
    }));

    socket.emit(WS_EVENTS.CHAT_SEND, {
      content,
      agentId,
      conversationId,
    });

    // 监听流式返回
    socket.off(WS_EVENTS.CHAT_CHUNK);
    socket.off(WS_EVENTS.CHAT_DONE);
    socket.off(WS_EVENTS.CHAT_ERROR);

    socket.on(WS_EVENTS.CHAT_CHUNK, (data: { content: string }) => {
      set((state) => ({
        streamingContent: state.streamingContent + data.content,
      }));
    });

    socket.on(WS_EVENTS.CHAT_DONE, (data: { conversationId: string; message: Message }) => {
      set((state) => ({
        messages: [...state.messages, data.message],
        streamingContent: '',
        isStreaming: false,
        currentConversation: state.currentConversation
          ? state.currentConversation
          : { id: data.conversationId } as Conversation,
      }));
    });

    socket.on(WS_EVENTS.CHAT_ERROR, (data: { error: string }) => {
      set({ isStreaming: false, streamingContent: '' });
      console.error('Chat error:', data.error);
    });
  },

  setCurrentConversation: (conv) => set({ currentConversation: conv, messages: [] }),
}));
