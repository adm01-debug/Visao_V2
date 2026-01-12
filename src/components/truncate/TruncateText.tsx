import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface TruncateTextProps {
  text: string;
  maxLength?: number;
  showMore?: boolean;
  className?: string;
}

export function TruncateText({ text, maxLength = 100, showMore = true, className }: TruncateTextProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = text.length > maxLength;

  if (!shouldTruncate) return <span className={className}>{text}</span>;

  const displayText = expanded ? text : text.slice(0, maxLength) + '...';

  return (
    <span className={className}>
      {displayText}
      {showMore && (
        <button onClick={() => setExpanded(!expanded)} className="ml-1 text-primary hover:underline text-sm">
          {expanded ? 'ver menos' : 'ver mais'}
        </button>
      )}
    </span>
  );
}

export default TruncateText;
