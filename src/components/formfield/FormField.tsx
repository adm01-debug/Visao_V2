import React from 'react';
import { cn } from '@/lib/utils';
import { InfoTip } from '@/components/infotip/InfoTip';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  tooltip?: string;
  className?: string;
}

export function FormField({ label, children, error, hint, required, tooltip, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="flex items-center gap-1.5 text-sm font-medium">
        {label}
        {required && <span className="text-destructive">*</span>}
        {tooltip && <InfoTip content={tooltip} iconSize={14} className="text-muted-foreground" />}
      </label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default FormField;
