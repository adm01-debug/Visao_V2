import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
}

export function TextInput({ leftIcon, rightIcon, error, className, ...props }: TextInputProps) {
  return (
    <div className="relative">
      {leftIcon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{leftIcon}</div>}
      <Input className={cn(leftIcon && 'pl-10', rightIcon && 'pr-10', error && 'border-destructive', className)} {...props} />
      {rightIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{rightIcon}</div>}
    </div>
  );
}

export default TextInput;
