import React from 'react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  content: string;
  timestamp?: string;
  isOwn?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  className?: string;
}

export function MessageBubble({ content, timestamp, isOwn = false, status, className }: MessageBubbleProps) {
  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start', className)}>
      <div className={cn('max-w-[70%] rounded-2xl px-4 py-2', isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm')}>
        <p className="text-sm">{content}</p>
        {(timestamp || status) && (
          <div className={cn('flex items-center gap-1 mt-1 text-xs', isOwn ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground')}>
            {timestamp}
            {status === 'read' && <span>✓✓</span>}
            {status === 'delivered' && <span>✓</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
