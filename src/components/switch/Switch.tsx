import React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: { track: 'w-8 h-4', thumb: 'h-3 w-3', translate: 'translate-x-4' },
  md: { track: 'w-11 h-6', thumb: 'h-5 w-5', translate: 'translate-x-5' },
  lg: { track: 'w-14 h-7', thumb: 'h-6 w-6', translate: 'translate-x-7' },
};

export function Switch({ checked, onChange, disabled = false, size = 'md', className }: SwitchProps) {
  const config = sizeConfig[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        config.track,
        checked ? 'bg-primary' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <span className={cn(
        'inline-block rounded-full bg-white shadow transform transition-transform',
        config.thumb,
        checked ? config.translate : 'translate-x-0.5'
      )} />
    </button>
  );
}

export default Switch;
