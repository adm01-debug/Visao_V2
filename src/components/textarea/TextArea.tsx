import React from 'react';
import { cn } from '@/lib/utils';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  showCount?: boolean;
  maxLength?: number;
}

export function TextArea({ error, showCount, maxLength, className, value, ...props }: TextAreaProps) {
  const length = typeof value === 'string' ? value.length : 0;

  return (
    <div className="relative">
      <textarea
        value={value}
        maxLength={maxLength}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary',
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {showCount && maxLength && (
        <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {length}/{maxLength}
        </span>
      )}
    </div>
  );
}

export default TextArea;
