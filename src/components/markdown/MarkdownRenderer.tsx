import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps { content: string; className?: string; }

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-muted rounded text-sm font-mono">$1</code>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/\n/g, '<br/>');
  };

  return <div className={cn('prose prose-sm max-w-none', className)} dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />;
}

export default MarkdownRenderer;
