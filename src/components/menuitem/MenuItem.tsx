import React from 'react';
import { cn } from '@/lib/utils';

interface MenuItemProps {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MenuItem({ label, icon, shortcut, disabled = false, danger = false, onClick, className }: MenuItemProps) {
  return (
    <button disabled={disabled} onClick={onClick}
      className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent',
        danger && 'text-destructive hover:bg-destructive/10',
        className)}>
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <kbd className="text-xs text-muted-foreground">{shortcut}</kbd>}
    </button>
  );
}

export default MenuItem;
