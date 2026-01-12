import React from 'react';
import { cn } from '@/lib/utils';
import { MoreVertical, Maximize2, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onRefresh?: () => void;
  onMaximize?: () => void;
  onRemove?: () => void;
  loading?: boolean;
  className?: string;
}

export function DashboardWidget({ title, children, actions, onRefresh, onMaximize, onRemove, loading, className }: DashboardWidgetProps) {
  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <h3 className="font-medium text-sm">{title}</h3>
        <div className="flex items-center gap-1">
          {actions}
          {onRefresh && <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></Button>}
          {onMaximize && <Button variant="ghost" size="sm" onClick={onMaximize}><Maximize2 className="h-4 w-4" /></Button>}
          {onRemove && <Button variant="ghost" size="sm" onClick={onRemove}><X className="h-4 w-4" /></Button>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default DashboardWidget;
