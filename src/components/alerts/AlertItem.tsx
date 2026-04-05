import { Camera, Check, Clock, Eye, EyeOff, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

export function AlertItem({ alert, isSelected, onSelect, onView, onMarkRead, onDelete, viewMode }: AlertItemProps) {
  const severity = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
  const type = typeConfig[alert.type as keyof typeof typeConfig] || typeConfig.security;
  const TypeIcon = type.icon;
  const timeAgo = formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true, locale: ptBR });

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'group flex items-center gap-4 p-4 rounded-lg border bg-card transition-all duration-200 cursor-pointer',
          'hover:bg-accent/5 hover:border-border/80 hover:shadow-sm',
          'border-l-[3px]',
          severity.borderColor,
          !alert.is_read && 'bg-card/80',
          alert.is_read && 'opacity-75 hover:opacity-100',
          isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
        )}
        onClick={onView}
      >
        <Checkbox checked={isSelected} onCheckedChange={onSelect} onClick={(e) => e.stopPropagation()} />
        {!alert.is_read && (
          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TypeIcon className={cn('w-4 h-4 shrink-0', type.color)} />
            <span className={cn('font-medium truncate text-sm', !alert.is_read && 'text-foreground', alert.is_read && 'text-muted-foreground')}>
              {alert.message}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Camera className="w-3 h-3 shrink-0" /><span className="truncate">{alert.camera_name}</span>
            <span className="text-border">•</span>
            <Clock className="w-3 h-3 shrink-0" /><span>{timeAgo}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={cn('text-[11px] font-medium', type.color)}>{type.label}</Badge>
          <Badge className={cn('text-[11px] font-semibold text-white border-0', severity.color)}>{severity.label}</Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button aria-label="Ações do alerta" variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}><Eye className="w-4 h-4 mr-2" />Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMarkRead(); }}>
              {alert.is_read ? <><EyeOff className="w-4 h-4 mr-2" />Marcar como não lido</> : <><Check className="w-4 h-4 mr-2" />Marcar como lido</>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Card className={cn(
      'cursor-pointer transition-all duration-200 border-t-[3px]',
      severity.borderColor,
      'hover:shadow-md hover:border-border/80',
      !alert.is_read && 'bg-card',
      alert.is_read && 'opacity-75 hover:opacity-100',
      isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
    )} onClick={onView}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Checkbox checked={isSelected} onCheckedChange={onSelect} onClick={(e) => e.stopPropagation()} />
            <TypeIcon className={cn('w-4 h-4', type.color)} />
            <Badge variant="outline" className={cn('text-[11px]', type.color)}>{type.label}</Badge>
          </div>
          <Badge className={cn('text-[11px] font-semibold text-white border-0', severity.color)}>{severity.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {alert.thumbnail && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img src={alert.thumbnail} alt="Snapshot" className="w-full h-32 object-cover" />
          </div>
        )}
        <p className="font-medium text-sm line-clamp-2 mb-2">{alert.message}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><Camera className="w-3 h-3" /><span className="truncate max-w-[100px]">{alert.camera_name}</span></div>
          <span>{timeAgo}</span>
        </div>
      </CardContent>
    </Card>
  );
}
