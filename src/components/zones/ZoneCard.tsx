import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal, Eye, Edit, ToggleLeft, Trash2, Camera, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { zoneTypeConfig, type ZoneType, type DbZone, type ZoneStats } from './zonesConfig';

interface ZoneCardProps {
  zone: DbZone;
  stats?: ZoneStats;
  cameraName: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onView: () => void;
}

export function ZoneCard({ zone, stats, cameraName, onEdit, onDelete, onToggle, onView }: ZoneCardProps) {
  const typeConfig = zoneTypeConfig[zone.type as ZoneType] || zoneTypeConfig.custom;
  const TypeIcon = typeConfig.icon as LucideIcon;

  return (
    <Card className={cn('transition-all hover:shadow-md cursor-pointer group border-border/40 bg-card/60', !zone.is_active && 'opacity-60')} onClick={onView}>
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: zone.color || 'hsl(217, 91%, 60%)' }} />
            <div>
              <h3 className="font-semibold text-base">{zone.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn('text-xs', typeConfig.color)}>
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {typeConfig.label}
                </Badge>
                {!zone.is_active && <Badge variant="outline" className="text-xs">Desativada</Badge>}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}><Eye className="w-4 h-4 mr-2" />Visualizar</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggle(); }}><ToggleLeft className="w-4 h-4 mr-2" />{zone.is_active ? 'Desativar' : 'Ativar'}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-4 pt-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
          <Camera className="w-3 h-3" />{cameraName}
        </p>
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {(zone.type === 'counting' || zone.type === 'tripwire' || zone.type === 'occupancy') && (
              <>
                <div className="p-2 bg-muted rounded"><p className="text-lg font-bold text-success">{stats.countIn}</p><p className="text-[10px] text-muted-foreground">Entrada</p></div>
                <div className="p-2 bg-muted rounded"><p className="text-lg font-bold text-destructive">{stats.countOut}</p><p className="text-[10px] text-muted-foreground">Saída</p></div>
                <div className="p-2 bg-muted rounded"><p className="text-lg font-bold">{stats.currentOccupancy}</p><p className="text-[10px] text-muted-foreground">Atual</p></div>
              </>
            )}
            {zone.type === 'dwell' && (
              <>
                <div className="p-2 bg-muted rounded col-span-2"><p className="text-lg font-bold">{Math.round(stats.avgDwellTime)}s</p><p className="text-[10px] text-muted-foreground">Tempo médio</p></div>
                <div className="p-2 bg-muted rounded"><p className="text-lg font-bold text-warning">{stats.alertsToday}</p><p className="text-[10px] text-muted-foreground">Alertas</p></div>
              </>
            )}
            {(zone.type === 'restricted' || zone.type === 'safety') && (
              <div className="p-2 bg-muted rounded col-span-3"><p className="text-lg font-bold text-destructive">{stats.alertsToday}</p><p className="text-[10px] text-muted-foreground">Alertas hoje</p></div>
            )}
          </div>
        )}
        {stats?.lastEvent && (
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Último evento: {formatDistanceToNow(new Date(stats.lastEvent), { addSuffix: true, locale: ptBR })}
          </p>
        )}
      </div>
    </Card>
  );
}
