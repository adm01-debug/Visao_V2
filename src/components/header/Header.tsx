import React from 'react';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title?: string;
  logo?: React.ReactNode;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  onMenuClick?: () => void;
  className?: string;
}

export function Header({ title, logo, leftContent, rightContent, onMenuClick, className }: HeaderProps) {
  return (
    <header className={cn('sticky top-0 z-40 bg-background border-b', className)}>
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          {logo}
          {title && <h1 className="text-lg font-semibold">{title}</h1>}
          {leftContent}
        </div>
        {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
      </div>
    </header>
  );
}

export default Header;
