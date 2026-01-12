import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ListItem({ title, subtitle, leftIcon, rightIcon, showChevron = false, onClick, className }: ListItemProps) {
  return (
    <div onClick={onClick} className={cn('flex items-center gap-3 px-4 py-3 border-b last:border-b-0', onClick && 'cursor-pointer hover:bg-accent/50', className)}>
      {leftIcon && <div className="text-muted-foreground">{leftIcon}</div>}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {rightIcon && <div>{rightIcon}</div>}
      {showChevron && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </div>
  );
}

export default ListItem;
