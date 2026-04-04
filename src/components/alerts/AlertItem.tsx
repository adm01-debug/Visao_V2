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
          'flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer',
          !alert.is_read && 'border-l-4 border-l-primary',
          isSelected && 'ring-2 ring-primary'
        )}
        onClick={onView}
      >
        <Checkbox checked={isSelected} onCheckedChange={onSelect} onClick={(e) => e.stopPropagation()} />
        <div className={cn('w-2 h-2 rounded-full', severity.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TypeIcon className={cn('w-4 h-4', type.color)} />
            <span className="font-medium truncate">{alert.message}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Camera className="w-3 h-3" /><span>{alert.camera_name}</span>
            <span>•</span>
            <Clock className="w-3 h-3" /><span>{timeAgo}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={type.color}>{type.label}</Badge>
          <Badge className={cn('text-white', severity.color)}>{severity.label}</Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button aria-label="Ações do alerta" variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
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
    <Card className={cn('cursor-pointer hover:shadow-md transition-shadow', !alert.is_read && 'ring-2 ring-primary/20', isSelected && 'ring-2 ring-primary')} onClick={onView}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Checkbox checked={isSelected} onCheckedChange={onSelect} onClick={(e) => e.stopPropagation()} />
            <div className={cn('w-3 h-3 rounded-full', severity.color)} />
            <Badge variant="outline" className={cn('text-xs', type.color)}>{type.label}</Badge>
          </div>
          <Badge className={cn('text-white text-xs', severity.color)}>{severity.label}</Badge>
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
