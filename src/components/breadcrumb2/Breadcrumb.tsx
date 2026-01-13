import React from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'lucide-react';

interface BreadcrumbItem { label: string; href?: string; }
interface BreadcrumbProps { items: BreadcrumbItem[]; className?: string; }

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-2 text-sm', className)}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-muted-foreground">/</span>}
          {item.href ? <a href={item.href} className="text-muted-foreground hover:text-foreground">{item.label}</a> : <span className="font-medium">{item.label}</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default Breadcrumb;
