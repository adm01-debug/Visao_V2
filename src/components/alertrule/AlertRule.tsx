import React from 'react';
import { cn } from '@/lib/utils';
import { Bell, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AlertRuleProps {
  id: string;
  name: string;
  description?: string;
  conditions: string[];
  actions: string[];
  enabled: boolean;
  onToggle?: (id: string, enabled: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function AlertRule({ id, name, description, conditions, actions, enabled, onToggle, onEdit, onDelete, className }: AlertRuleProps) {
  return (
    <div className={cn('p-4 rounded-lg border', enabled ? 'bg-card' : 'bg-muted/50', className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Bell className={cn('h-5 w-5', enabled ? 'text-primary' : 'text-muted-foreground')} />
          <div>
            <p className={cn('font-medium', !enabled && 'text-muted-foreground')}>{name}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onToggle && <Button variant="ghost" size="sm" onClick={() => onToggle(id, !enabled)}>
            {enabled ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5" />}
          </Button>}
          {onEdit && <Button variant="ghost" size="sm" onClick={() => onEdit(id)}><Edit className="h-4 w-4" /></Button>}
          {onDelete && <Button variant="ghost" size="sm" onClick={() => onDelete(id)}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div><span className="text-xs text-muted-foreground">Condições:</span>
          <div className="flex flex-wrap gap-1 mt-1">{conditions.map((c, i) => <Badge key={i} variant="outline" className="text-xs">{c}</Badge>)}</div>
        </div>
        <div><span className="text-xs text-muted-foreground">Ações:</span>
          <div className="flex flex-wrap gap-1 mt-1">{actions.map((a, i) => <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>)}</div>
        </div>
      </div>
    </div>
  );
}

export default AlertRule;
