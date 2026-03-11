'use client';

import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';
import type { Message } from '@chatbutler/shared';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isUser ? 'bg-primary-100 text-primary-600' : 'bg-gray-200 text-gray-600',
        )}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-primary-600 text-white rounded-tr-sm'
            : 'bg-white text-gray-900 border border-gray-100 rounded-tl-sm shadow-sm',
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreaming && <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse ml-0.5" />}
          </div>
        )}
      </div>
    </div>
  );
}
