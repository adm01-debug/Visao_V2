import { Camera, Check, Clock, Eye, EyeOff, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AlertRecord, ViewMode } from './AlertTypes';
import { severityConfig, typeConfig } from './AlertTypes';

interface AlertItemProps {
  alert: AlertRecord;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onView: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  viewMode: ViewMode;
}

const severityBorderMap: Record<string, string> = {
  critical: 'border-l-severity-critical',
  high: 'border-l-severity-high',
  medium: 'border-l-severity-medium',
  low: 'border-l-primary/40',
};

const severityBadgeBg: Record<string, string> = {
  critical:
    'bg-severity-critical/12 text-severity-critical-soft border border-severity-critical/20',
  high: 'bg-severity-high/12 text-severity-high border border-severity-high/20',
  medium: 'bg-severity-medium/12 text-severity-medium border border-severity-medium/20',
  low: 'bg-severity-low/10 text-severity-low border border-severity-low/15',
};

export function AlertItem({
  alert,
  isSelected,
  onSelect,
  onView,
  onMarkRead,
  onDelete,
  viewMode,
}: AlertItemProps) {
  const severity =
    severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
  const type = typeConfig[alert.type as keyof typeof typeConfig] || typeConfig.security;
  const TypeIcon = type.icon;
  const timeAgo = formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true, locale: ptBR });
  const borderClass = severityBorderMap[alert.severity] ?? 'border-l-primary/40';
  const badgeBg = severityBadgeBg[alert.severity] || severityBadgeBg.low;

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'group flex items-center gap-4 p-4 rounded-xl border bg-card transition-all duration-200 cursor-pointer',
          'hover:bg-accent/5 hover:shadow-sm hover:-translate-y-0.5',
          'active:scale-[0.99] active:translate-y-0',
          'border-l-[3px]',
          borderClass,
          !alert.is_read && 'border-border/60',
          alert.is_read && 'opacity-70 hover:opacity-100 border-border/30',
          isSelected && 'ring-2 ring-primary/40 ring-offset-1 ring-offset-background'
        )}
        onClick={onView}
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={isSelected ? 'Desmarcar alerta' : 'Selecionar alerta'}
        />
        {!alert.is_read && (
          <div className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'p-1 rounded-md',
                type.color.includes('destructive') ? 'bg-destructive/10' : 'bg-primary/10'
              )}
            >
              <TypeIcon className={cn('w-3.5 h-3.5 shrink-0', type.color)} />
            </div>
            <span
              className={cn(
                'font-medium truncate text-sm',
                !alert.is_read ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {alert.message}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <Camera className="w-3 h-3 shrink-0" />
            <span className="truncate">{alert.camera_name}</span>
            <span className="text-border">·</span>
            <Clock className="w-3 h-3 shrink-0" />
            <span>{timeAgo}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={cn('text-[11px] font-medium border-border/40', type.color)}
          >
            {type.label}
          </Badge>
          <Badge className={cn('text-[11px] font-semibold border-0', badgeBg)}>
            {severity.label}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              aria-label="Ações do alerta"
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
            >
              {alert.is_read ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Marcar como não lido
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Marcar como lido
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive-soft"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 border-t-[3px] overflow-hidden',
        borderClass.replace('border-l-', 'border-t-'),
        'hover:shadow-md hover:-translate-y-1',
        'active:scale-[0.98] active:translate-y-0',
        !alert.is_read && 'bg-card',
        alert.is_read && 'opacity-70 hover:opacity-100',
        isSelected && 'ring-2 ring-primary/40 ring-offset-1 ring-offset-background'
      )}
      onClick={onView}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              aria-label={isSelected ? 'Desmarcar alerta' : 'Selecionar alerta'}
            />
            <div
              className={cn(
                'p-1.5 rounded-lg',
                type.color.includes('destructive') ? 'bg-destructive/10' : 'bg-primary/10'
              )}
            >
              <TypeIcon className={cn('w-4 h-4', type.color)} />
            </div>
            <Badge variant="outline" className={cn('text-[11px] border-border/40', type.color)}>
              {type.label}
            </Badge>
          </div>
          <Badge className={cn('text-[11px] font-semibold border-0', badgeBg)}>
            {severity.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {alert.thumbnail && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img
              src={alert.thumbnail}
              alt="Snapshot"
              loading="lazy"
              className="w-full h-32 object-cover"
            />
          </div>
        )}
        <p className="font-medium text-sm line-clamp-2 mb-2">{alert.message}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Camera className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{alert.camera_name}</span>
          </div>
          <span>{timeAgo}</span>
        </div>
      </CardContent>
    </Card>
  );
}
