import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ChipProps {
  label: string;
  onRemove?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary text-secondary-foreground',
};

const sizeClasses = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1' };

export function Chip({ label, onRemove, variant = 'default', size = 'md', className }: ChipProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {label}
      {onRemove && (
        <button onClick={onRemove} className="hover:bg-black/10 rounded-full p-0.5">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export default Chip;
