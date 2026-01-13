import React from 'react';
import { cn } from '@/lib/utils';

interface InputWithLabelProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export function InputWithLabel({ 
  label, 
  error, 
  required, 
  className, 
  ...props 
}: InputWithLabelProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        className={cn(
          'w-full px-3 py-2 border rounded-lg',
          error && 'border-red-500'
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default InputWithLabel;
