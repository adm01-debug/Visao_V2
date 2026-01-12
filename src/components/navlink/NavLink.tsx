import React from 'react';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function NavLink({ href, children, active = false, icon, className }: NavLinkProps) {
  return (
    <a href={href} className={cn('flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent', className)}>
      {icon}
      {children}
    </a>
  );
}

export default NavLink;
