'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chat';
import { useAgentStore } from '@/store/agent';
import { MessageBubble } from './MessageBubble';
import { InputBar } from './InputBar';

export function ChatArea() {
  const { currentAgent } = useAgentStore();
  const { messages, streamingContent, isStreaming } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  if (!currentAgent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg">选择一个智能体开始对话</p>
          <p className="text-sm mt-1">从左侧选择您需要的 AI 助手</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* 顶部栏 */}
      <header className="h-14 px-6 flex items-center border-b border-gray-200 bg-white">
        <div>
          <h2 className="font-semibold text-gray-900">{currentAgent.name}</h2>
          <p className="text-xs text-gray-500">{currentAgent.description}</p>
        </div>
      </header>

      {/* 消息列表 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{ id: 'streaming', role: 'assistant', content: streamingContent, createdAt: '' }}
            isStreaming
          />
        )}
      </div>

      {/* 输入栏 */}
      <InputBar />
    </div>
  );
}
