import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backUrl?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, backUrl, onBack, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between py-4 border-b', className)}>
      <div className="flex items-center gap-3">
        {(backUrl || onBack) && (
          <Button variant="ghost" size="icon" onClick={onBack} asChild={!!backUrl}>
            {backUrl ? <a href={backUrl}><ChevronLeft className="h-5 w-5" /></a> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;
