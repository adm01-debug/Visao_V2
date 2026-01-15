import React from 'react';
import { cn } from '@/lib/utils';

interface HighlightProps { children: string; search: string; className?: string; highlightClass?: string; }

export function Highlight({ children, search, className, highlightClass = 'bg-yellow-200' }: HighlightProps) {
  if (!search) return <span className={className}>{children}</span>;

  const parts = children.split(new RegExp(`(${search})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, i) => part.toLowerCase() === search.toLowerCase()
        ? <mark key={i} className={highlightClass}>{part}</mark>
        : part)}
    </span>
  );
}

export default Highlight;
