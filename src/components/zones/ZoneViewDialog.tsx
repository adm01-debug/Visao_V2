import type { LucideIcon } from 'lucide-react';
import { Camera, Clock, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
import { zoneTypeConfig, parsePointsData, type ZoneType, type DbZone, type ZoneStats, type ZoneEvent } from './zonesConfig';

interface CameraData {
  id: string;
  name: string;
  stream_url?: string | null;
  stream_protocol?: string;
  thumbnail?: string | null;
}

interface ZoneViewDialogProps {
  zone: DbZone | null;
  camera: any;
  stats?: ZoneStats;
  events: ZoneEvent[];
  isOpen: boolean;
  onClose: () => void;
}

export function ZoneViewDialog({ zone, camera, stats, events, isOpen, onClose }: ZoneViewDialogProps) {
  if (!zone) return null;
  const typeConfig = zoneTypeConfig[zone.type as ZoneType] || zoneTypeConfig.custom;
  const TypeIcon = typeConfig.icon;
  const pointsData = parsePointsData(zone.points);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: zone.color || '#3B82F6' }} />
            {zone.name}
            <Badge variant="secondary" className={cn('text-xs ml-2', typeConfig.color)}><TypeIcon className="w-3 h-3 mr-1" />{typeConfig.label}</Badge>
          </DialogTitle>
          <DialogDescription>Câmera: {camera?.name}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="preview" className="flex-1 overflow-hidden">
          <TabsList>
            <TabsTrigger value="preview">Visualização</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="events">Eventos{events.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{events.length}</Badge>}</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="preview" className="m-0">
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                {camera?.stream_url ? (
                  <VideoStreamPlayer cameraId={camera.id} streamUrl={camera.stream_url} protocol={camera.stream_protocol || 'hls'} cameraName={camera.name} />
                ) : camera?.thumbnail ? (
                  <img src={camera.thumbnail} alt={camera.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted"><Camera className="w-12 h-12 text-muted-foreground" /></div>
                )}
                {pointsData && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {pointsData.shape === 'line' ? (
                      <line x1={`${pointsData.coordinates[0]?.x}%`} y1={`${pointsData.coordinates[0]?.y}%`} x2={`${pointsData.coordinates[1]?.x}%`} y2={`${pointsData.coordinates[1]?.y}%`} stroke={zone.color || '#3B82F6'} strokeWidth="3" strokeDasharray="5,5" />
                    ) : (
                      <polygon points={pointsData.coordinates.map(p => `${p.x}%,${p.y}%`).join(' ')} fill={zone.color || '#3B82F6'} fillOpacity={pointsData.opacity || 0.3} stroke={zone.color || '#3B82F6'} strokeWidth="2" />
                    )}
                  </svg>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div><Label className="text-xs text-muted-foreground">Tipo</Label><p className="font-medium">{typeConfig.label}</p></div>
                <div><Label className="text-xs text-muted-foreground">Status</Label><p className={cn('font-medium', zone.is_active ? 'text-green-500' : 'text-gray-500')}>{zone.is_active ? 'Ativa' : 'Desativada'}</p></div>
              </div>
            </TabsContent>
            <TabsContent value="stats" className="m-0">
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-green-500">{stats.countIn}</p><p className="text-sm text-muted-foreground">Entradas</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-red-500">{stats.countOut}</p><p className="text-sm text-muted-foreground">Saídas</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{stats.currentOccupancy}</p><p className="text-sm text-muted-foreground">Ocupação Atual</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-yellow-500">{stats.alertsToday}</p><p className="text-sm text-muted-foreground">Alertas Hoje</p></CardContent></Card>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground"><Activity className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>Sem estatísticas disponíveis</p></div>
              )}
            </TabsContent>
            <TabsContent value="events" className="m-0">
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Clock className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>Nenhum evento registrado</p></div>
              ) : (
                <div className="space-y-2">
                  {events.map(event => (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className={cn('w-2 h-2 rounded-full', event.event_type.includes('enter') ? 'bg-green-500' : event.event_type.includes('exit') ? 'bg-red-500' : event.event_type.includes('dwell') ? 'bg-orange-500' : 'bg-blue-500')} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.event_type}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(event.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
