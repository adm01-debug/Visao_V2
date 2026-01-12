import React from 'react';
import { cn } from '@/lib/utils';

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  className?: string;
}

const variantClasses = {
  default: 'hover:bg-accent',
  primary: 'hover:bg-primary/10 text-primary',
  danger: 'hover:bg-destructive/10 text-destructive',
};

export function QuickAction({ icon, label, description, onClick, variant = 'default', disabled = false, className }: QuickActionProps) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn('flex items-center gap-3 p-3 rounded-lg transition-colors w-full text-left',
        disabled ? 'opacity-50 cursor-not-allowed' : variantClasses[variant], className)}>
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </button>
  );
}

export default QuickAction;
