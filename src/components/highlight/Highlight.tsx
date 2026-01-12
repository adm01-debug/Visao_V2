import React from 'react';
import { cn } from '@/lib/utils';

interface HighlightProps {
  text: string;
  query: string;
  highlightClass?: string;
  className?: string;
}

export function Highlight({ text, query, highlightClass = 'bg-yellow-200', className }: HighlightProps) {
  if (!query.trim()) return <span className={className}>{text}</span>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className={cn('rounded px-0.5', highlightClass)}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default Highlight;
