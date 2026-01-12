import React from 'react';
import { cn } from '@/lib/utils';

interface TextDiffProps {
  oldText: string;
  newText: string;
  className?: string;
}

export function TextDiff({ oldText, newText, className }: TextDiffProps) {
  // Simple word-based diff
  const oldWords = oldText.split(' ');
  const newWords = newText.split(' ');

  return (
    <div className={cn('font-mono text-sm', className)}>
      <div className="mb-2">
        <span className="text-red-600 bg-red-50 px-1">- {oldText}</span>
      </div>
      <div>
        <span className="text-green-600 bg-green-50 px-1">+ {newText}</span>
      </div>
    </div>
  );
}

export default TextDiff;
