import { EmptyState, ErrorState, LoadingSpinner, StatusBadge, SeverityBadge, TimeAgo, ConfirmDialog } from "@/components";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Zonas de Interesse
 * 
 * Funcionalidades:
 * - Lista de zonas por câmera
 * - Editor visual para desenhar zonas
 * - Configuração de regras por zona
 * - Estatísticas em tempo real
 * - Histórico de eventos
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/contexts/i18n';
import {
  Target,
  Plus,
  Search,
  Camera,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  MoreHorizontal,
  Clock,
  Users,
  AlertTriangle,
  ArrowLeftRight,
  Timer,
  MapPin,
  Activity,
  ToggleLeft,
  LayoutGrid,
  List,
  X,
  Check,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCameras } from '@/hooks/useCameras';
import { ZoneEditor } from '@/components/ZoneEditor';
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// TIPOS
// ============================================

type ZoneType = 'restricted' | 'counting' | 'tripwire' | 'dwell' | 'occupancy' | 'parking' | 'queue' | 'safety' | 'custom';

// Use database types
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
type DbZone = Tables<'zones'>;
type DbZoneEvent = Tables<'zone_events'>;

// Extended zone points data structure (stored in points JSON)
interface ZonePointsData {
  shape: 'rectangle' | 'polygon' | 'line';
  coordinates: { x: number; y: number }[];
  opacity?: number;
  config?: Record<string, any>;
}

interface ZoneStats {
  currentOccupancy: number;
  countIn: number;
  countOut: number;
  avgDwellTime: number;
  alertsToday: number;
  lastEvent?: string;
}

interface ZoneEvent extends DbZoneEvent {
  zone_name?: string;
}

// Form data for creating/editing zones
interface ZoneFormData {
  name: string;
  type: ZoneType;
  color: string;
  is_active: boolean;
  pointsData: ZonePointsData | null;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const zoneTypeConfig: Record<ZoneType, { 
  label: string; 
  icon: any; 
  color: string;
  bgColor: string;
  description: string;
}> = {
  restricted: { 
    label: 'Área Restrita', 
    icon: AlertTriangle, 
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    description: 'Alerta quando alguém entra na área',
  },
  counting: { 
    label: 'Contagem', 
    icon: Users, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    description: 'Conta pessoas entrando e saindo',
  },
  tripwire: { 
    label: 'Linha de Contagem', 
    icon: ArrowLeftRight, 
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    description: 'Conta pessoas cruzando uma linha',
  },
  dwell: { 
    label: 'Tempo de Permanência', 
    icon: Timer, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    description: 'Monitora tempo na área',
  },
  occupancy: { 
    label: 'Ocupação', 
    icon: Users, 
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    description: 'Controla capacidade máxima',
  },
  parking: { 
    label: 'Estacionamento', 
    icon: MapPin, 
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500',
    description: 'Monitora vagas de estacionamento',
  },
  queue: { 
    label: 'Fila', 
    icon: Users, 
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    description: 'Monitora filas e tempo de espera',
  },
  safety: { 
    label: 'Segurança', 
    icon: AlertTriangle, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    description: 'Área de segurança do trabalho',
  },
  custom: { 
    label: 'Personalizada', 
    icon: Target, 
    color: 'text-gray-500',
    bgColor: 'bg-gray-500',
    description: 'Configuração personalizada',
  },
};

const defaultColors = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

// Helper to parse points JSON
function parsePointsData(points: any): ZonePointsData | null {
  if (!points) return null;
  try {
    if (typeof points === 'string') {
      return JSON.parse(points);
    }
    return points as ZonePointsData;
  } catch {
    return null;
  }
}

// ============================================
// COMPONENTE: Zone Card
// ============================================

interface ZoneCardProps {
  zone: DbZone;
  stats?: ZoneStats;
  cameraName: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onView: () => void;
}

function ZoneCard({ zone, stats, cameraName, onEdit, onDelete, onToggle, onView }: ZoneCardProps) {
  const typeConfig = zoneTypeConfig[zone.type as ZoneType] || zoneTypeConfig.custom;
  const TypeIcon = typeConfig.icon;

  return (
    <Card className={cn(
      'transition-all hover:shadow-md cursor-pointer group',
      !zone.is_active && 'opacity-60'
    )} onClick={onView}>
      <div className="p-4 pb-2">
        <div role="main" className="flex items-start justify-between">
          <div role="main" className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: zone.color || '#3B82F6' }}
            />
            <div>
              <h3 className="font-semibold text-base">{zone.name}</h3>
              <div role="main" className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn('text-xs', typeConfig.color)}>
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {typeConfig.label}
                </Badge>
                {!zone.is_active && (
                  <Badge variant="outline" className="text-xs">
                    Desativada
                  </Badge>
                )}
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
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                <ToggleLeft className="w-4 h-4 mr-2" />
                {zone.is_active ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-4 pt-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
          <Camera className="w-3 h-3" />
          {cameraName}
        </p>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {(zone.type === 'counting' || zone.type === 'tripwire' || zone.type === 'occupancy') && (
              <>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold text-green-500">{stats.countIn}</p>
                  <p className="text-[10px] text-muted-foreground"{t('zones.entry', 'Entrada')}</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold text-red-500">{stats.countOut}</p>
                  <p className="text-[10px] text-muted-foreground"{t('zones.exit', 'Saída')}</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold">{stats.currentOccupancy}</p>
                  <p className="text-[10px] text-muted-foreground"{t('zones.current', 'Atual')}</p>
                </div>
              </>
            )}
            {zone.type === 'dwell' && (
              <>
                <div className="p-2 bg-muted rounded col-span-2">
                  <p className="text-lg font-bold">{Math.round(stats.avgDwellTime)}s</p>
                  <p className="text-[10px] text-muted-foreground"{t('zones.avgTime', 'Tempo médio')}</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold text-yellow-500">{stats.alertsToday}</p>
                  <p className="text-[10px] text-muted-foreground"{t('zones.alerts', 'Alertas')}</p>
                </div>
              </>
            )}
            {(zone.type === 'restricted' || zone.type === 'safety') && (
              <div className="p-2 bg-muted rounded col-span-3">
                <p className="text-lg font-bold text-red-500">{stats.alertsToday}</p>
                <p className="text-[10px] text-muted-foreground"{t('zones.alertsToday', 'Alertas hoje')}</p>
              </div>
            )}
          </div>
        )}

        {stats?.lastEvent && (
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Último evento: {formatDistanceToNow(new Date(stats.lastEvent), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </p>
        )}
      </div>
    </Card>
  );
}

// ============================================
// COMPONENTE: Zone Editor Sheet
// ============================================

interface ZoneEditorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  camera: any;
  zone?: DbZone | null;
  onSave: (data: TablesInsert<'zones'> | TablesUpdate<'zones'>) => Promise<void>;
}

function ZoneEditorSheet({ isOpen, onClose, camera, zone, onSave }: ZoneEditorSheetProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ZoneFormData>({
    name: '',
    type: 'counting',
    color: defaultColors[0],
    is_active: true,
    pointsData: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'rectangle' | 'polygon' | 'line'>('rectangle');
  const [opacity, setOpacity] = useState(0.3);

  useEffect(() => {
    if (zone) {
      const pointsData = parsePointsData(zone.points);
      setFormData({
        name: zone.name,
        type: zone.type as ZoneType,
        color: zone.color || defaultColors[0],
        is_active: zone.is_active,
        pointsData,
      });
      setOpacity(pointsData?.opacity || 0.3);
    } else {
      setFormData({
        name: '',
        type: 'counting',
        color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
        is_active: true,
        pointsData: null,
      });
      setOpacity(0.3);
    }
  }, [zone, isOpen]);

  const handleZoneDrawn = useCallback((points: { x: number; y: number }[]) => {
    const shape = drawingMode === 'line' ? 'line' : 
                  drawingMode === 'rectangle' ? 'rectangle' : 'polygon';
    setFormData(f => ({
      ...f,
      pointsData: { shape, coordinates: points, opacity }
    }));
    toast.success(`Zona desenhada com ${points.length} pontos`);
  }, [drawingMode, opacity]);

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.pointsData || formData.pointsData.coordinates.length < 2) {
      toast.error('Desenhe a zona no vídeo');
      return;
    }
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);
    try {
      const pointsWithOpacity = { ...formData.pointsData, opacity };
      
      if (zone) {
        // Update
        await onSave({
          name: formData.name,
          type: formData.type,
          color: formData.color,
          is_active: formData.is_active,
          points: pointsWithOpacity as any,
        });
      } else {
        // Insert
        await onSave({
          name: formData.name,
          type: formData.type,
          color: formData.color,
          is_active: formData.is_active,
          points: pointsWithOpacity as any,
          camera_id: camera?.id,
          user_id: user.id,
        });
      }
      onClose();
      toast.success(zone ? 'Zona atualizada' : 'Zona criada');
    } catch (error) {
      toast.error('Erro ao salvar');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = zoneTypeConfig[formData.type];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{zone ? 'Editar Zona' : 'Criar Nova Zona'}</SheetTitle>
          <SheetDescription>
            Câmera: {camera?.name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Video com editor de zona */}
          <div className="space-y-2">
            <div role="main" className="flex items-center justify-between">
              <Label{t('zones.draw', 'Desenhar Zona')}</Label>
              <div role="main" className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={drawingMode === 'rectangle' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setDrawingMode('rectangle')}
                >
                  Retângulo
                </Button>
                <Button
                  variant={drawingMode === 'polygon' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setDrawingMode('polygon')}
                >
                  Polígono
                </Button>
                <Button
                  variant={drawingMode === 'line' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setDrawingMode('line')}
                >
                  Linha
                </Button>
              </div>
            </div>
            
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative border-2 border-dashed border-muted">
              {camera?.stream_url ? (
                <VideoStreamPlayer
                  cameraId={camera.id}
                  streamUrl={camera.stream_url}
                  protocol={camera.stream_protocol || 'hls'}
                  cameraName={camera.name}
                />
              ) : camera?.thumbnail ? (
                <img 
                  src={camera.thumbnail} 
                  alt={camera.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Camera className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Canvas de desenho sobreposto */}
              <div className="absolute inset-0">
                <ZoneEditor
                  existingZones={formData.pointsData ? [{
                    id: 'temp',
                    name: formData.name || 'Nova Zona',
                    type: formData.type,
                    geometry: { 
                      shape: formData.pointsData.shape, 
                      points: formData.pointsData.coordinates 
                    },
                    color: formData.color,
                    opacity: opacity,
                    enabled: true,
                  } as any] : []}
                  onZoneCreated={(z) => handleZoneDrawn(z.geometry?.points || [])}
                  selectedColor={formData.color}
                  drawingMode={drawingMode}
                />
              </div>
            </div>

            {formData.pointsData && (
              <div role="main" className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded">
                <Check className="w-4 h-4" />
                Zona desenhada: {formData.pointsData.shape} com {formData.pointsData.coordinates.length} pontos
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto h-6 text-xs"
                  onClick={() => setFormData(f => ({ ...f, pointsData: null }))}
                >
                  Limpar
                </Button>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              {drawingMode === 'rectangle' && 'Clique e arraste para desenhar um retângulo'}
              {drawingMode === 'polygon' && 'Clique para adicionar pontos, duplo-clique para finalizar'}
              {drawingMode === 'line' && 'Clique no ponto inicial e final da linha'}
            </p>
          </div>

          {/* Formulário */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name"{t('zones.nameLabel', 'Nome da Zona')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Entrada Principal"
              />
            </div>

            <div>
              <Label htmlFor="type"{t('zones.type', 'Tipo')}</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData(f => ({ ...f, type: v as ZoneType }))}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(zoneTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div role="main" className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', config.bgColor)} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{selectedType?.description}</p>
            </div>

            <div>
              <Label{t('zones.color', 'Cor')}</Label>
              <div role="main" className="flex items-center gap-2 mt-2">
                {defaultColors.map(color => (
                  <button
                    key={color}
                    className={cn(
                      'w-7 h-7 rounded-lg transition-all',
                      formData.color === color && 'ring-2 ring-offset-2 ring-primary'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(f => ({ ...f, color }))}
                  />
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <Label>Opacidade: {Math.round(opacity * 100)}%</Label>
              <Slider
                value={[opacity * 100]}
                onValueChange={([v]) => setOpacity(v / 100)}
                min={10}
                max={80}
                step={5}
                className="mt-2"
              />
            </div>
          </div>

          {/* Zona ativa */}
          <div role="main" className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium"{t('zones.active', 'Zona Ativa')}</p>
              <p className="text-xs text-muted-foreground">Desative para pausar monitoramento</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))}
            />
          </div>

          {/* Actions */}
          <div role="main" className="flex items-center gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !formData.pointsData}
              className="flex-1"
            >
              {isSubmitting ? 'Salvando...' : (zone ? 'Atualizar' : 'Criar Zona')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// COMPONENTE: Zone View Dialog
// ============================================

interface ZoneViewDialogProps {
  zone: DbZone | null;
  camera: any;
  stats?: ZoneStats;
  events: ZoneEvent[];
  isOpen: boolean;
  onClose: () => void;
}

function ZoneViewDialog({ zone, camera, stats, events, isOpen, onClose }: ZoneViewDialogProps) {
  if (!zone) return null;

  const typeConfig = zoneTypeConfig[zone.type as ZoneType] || zoneTypeConfig.custom;
  const TypeIcon = typeConfig.icon;
  const pointsData = parsePointsData(zone.points);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: zone.color || '#3B82F6' }}
            />
            {zone.name}
            <Badge variant="secondary" className={cn('text-xs ml-2', typeConfig.color)}>
              <TypeIcon className="w-3 h-3 mr-1" />
              {typeConfig.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Câmera: {camera?.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1 overflow-hidden">
          <TabsList>
            <TabsTrigger value="preview"{t('zones.visualization', 'Visualização')}</TabsTrigger>
            <TabsTrigger value="stats"{t('zones.statistics', 'Estatísticas')}</TabsTrigger>
            <TabsTrigger value="events">
              Eventos
              {events.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{events.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="preview" className="m-0">
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                {camera?.stream_url ? (
                  <VideoStreamPlayer
                    cameraId={camera.id}
                    streamUrl={camera.stream_url}
                    protocol={camera.stream_protocol || 'hls'}
                    cameraName={camera.name}
                  />
                ) : camera?.thumbnail ? (
                  <img 
                    src={camera.thumbnail} 
                    alt={camera.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Camera className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Zona sobreposta */}
                {pointsData && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {pointsData.shape === 'line' ? (
                      <line
                        x1={`${pointsData.coordinates[0]?.x}%`}
                        y1={`${pointsData.coordinates[0]?.y}%`}
                        x2={`${pointsData.coordinates[1]?.x}%`}
                        y2={`${pointsData.coordinates[1]?.y}%`}
                        stroke={zone.color || '#3B82F6'}
                        strokeWidth="3"
                        strokeDasharray="5,5"
                      />
                    ) : (
                      <polygon
                        points={pointsData.coordinates.map(p => `${p.x}%,${p.y}%`).join(' ')}
                        fill={zone.color || '#3B82F6'}
                        fillOpacity={pointsData.opacity || 0.3}
                        stroke={zone.color || '#3B82F6'}
                        strokeWidth="2"
                      />
                    )}
                  </svg>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-xs text-muted-foreground"{t('zones.type', 'Tipo')}</Label>
                  <p className="font-medium">{typeConfig.label}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground"{t('zones.status', 'Status')}</Label>
                  <p className={cn('font-medium', zone.is_active ? 'text-green-500' : 'text-gray-500')}>
                    {zone.is_active ? 'Ativa' : 'Desativada'}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="m-0">
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-green-500">{stats.countIn}</p>
                      <p className="text-sm text-muted-foreground"{t('zones.entries', 'Entradas')}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-red-500">{stats.countOut}</p>
                      <p className="text-sm text-muted-foreground"{t('zones.exits', 'Saídas')}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold">{stats.currentOccupancy}</p>
                      <p className="text-sm text-muted-foreground"{t('zones.currentOccupancy', 'Ocupação Atual')}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-yellow-500">{stats.alertsToday}</p>
                      <p className="text-sm text-muted-foreground"{t('zones.alertsToday', 'Alertas Hoje')}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Sem estatísticas disponíveis</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="events" className="m-0">
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum evento registrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map(event => (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        event.event_type.includes('enter') ? 'bg-green-500' :
                        event.event_type.includes('exit') ? 'bg-red-500' :
                        event.event_type.includes('dwell') ? 'bg-orange-500' :
                        'bg-blue-500'
                      )} />
                      <div role="main" className="flex-1">
                        <p className="text-sm font-medium">{event.event_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                        </p>
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

// ============================================
// PÁGINA PRINCIPAL
// ============================================

export function ZonesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { cameras } = useCameras();
  
  // State
  const [zones, setZones] = useState<DbZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCameraFilter, setSelectedCameraFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorCamera, setEditorCamera] = useState<any>(null);
  const [editingZone, setEditingZone] = useState<DbZone | null>(null);
  
  // View state
  const [viewingZone, setViewingZone] = useState<DbZone | null>(null);
  const [zoneStats, setZoneStats] = useState<Record<string, ZoneStats>>({});
  const [zoneEvents, setZoneEvents] = useState<Record<string, ZoneEvent[]>>({});
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<DbZone | null>(null);

  // Load zones
  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setZones(data || []);

      // Load basic stats from events
      const statsMap: Record<string, ZoneStats> = {};
      for (const zone of data || []) {
        try {
          const { data: eventsData } = await supabase
            .from('zone_events')
            .select('event_type, timestamp')
            .eq('zone_id', zone.id)
            .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('timestamp', { ascending: false });

          if (eventsData) {
            const countIn = eventsData.filter(e => e.event_type.includes('enter')).length;
            const countOut = eventsData.filter(e => e.event_type.includes('exit')).length;
            const alertsToday = eventsData.filter(e => e.event_type.includes('alert')).length;
            
            statsMap[zone.id] = {
              currentOccupancy: Math.max(0, countIn - countOut),
              countIn,
              countOut,
              avgDwellTime: 0,
              alertsToday,
              lastEvent: eventsData[0]?.timestamp,
            };
          }
        } catch (e) {
          console.error('Erro ao carregar stats da zona:', zone.id, e);
        }
      }
      setZoneStats(statsMap);
    } catch (error) {
      console.error('Erro ao carregar zonas:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadZoneEvents = async (zoneId: string) => {
    try {
      const { data } = await supabase
        .from('zone_events')
        .select('*')
        .eq('zone_id', zoneId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      setZoneEvents(prev => ({ ...prev, [zoneId]: data || [] }));
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    }
  };

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // Filtrar zonas
  const filteredZones = useMemo(() => {
    return zones.filter(zone => {
      if (searchQuery && !zone.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedCameraFilter !== 'all' && zone.camera_id !== selectedCameraFilter) {
        return false;
      }
      if (selectedTypeFilter !== 'all' && zone.type !== selectedTypeFilter) {
        return false;
      }
      return true;
    });
  }, [zones, searchQuery, selectedCameraFilter, selectedTypeFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: zones.length,
    active: zones.filter(z => z.is_active).length,
    restricted: zones.filter(z => z.type === 'restricted').length,
    counting: zones.filter(z => z.type === 'counting' || z.type === 'tripwire').length,
  }), [zones]);

  // Handlers
  const handleSave = async (data: TablesInsert<'zones'> | TablesUpdate<'zones'>) => {
    try {
      if (editingZone) {
        const { error } = await supabase
          .from('zones')
          .update(data as TablesUpdate<'zones'>)
          .eq('id', editingZone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('zones')
          .insert(data as TablesInsert<'zones'>);
        if (error) throw error;
      }
      loadZones();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      throw error;
    }
  };

  const handleDelete = async (zone: DbZone) => {
    try {
      const { error } = await supabase
        .from('zones')
        .delete()
        .eq('id', zone.id);
      
      if (error) throw error;
      toast.success('Zona excluída');
      loadZones();
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handleToggle = async (zone: DbZone) => {
    try {
      const { error } = await supabase
        .from('zones')
        .update({ is_active: !zone.is_active })
        .eq('id', zone.id);
      
      if (error) throw error;
      toast.success(zone.is_active ? 'Zona desativada' : 'Zona ativada');
      loadZones();
    } catch (error) {
      toast.error('Erro ao alternar');
    }
  };

  const openEditor = (camera: any, zone?: DbZone) => {
    setEditorCamera(camera);
    setEditingZone(zone || null);
    setIsEditorOpen(true);
  };

  const openView = (zone: DbZone) => {
    setViewingZone(zone);
    loadZoneEvents(zone.id);
  };

  const getCameraName = (cameraId: string | null) => {
    if (!cameraId) return 'Câmera desconhecida';
    return cameras.find(c => c.id === cameraId)?.name || 'Câmera desconhecida';
  };

  const getCameraById = (cameraId: string | null) => {
    if (!cameraId) return null;
    return cameras.find(c => c.id === cameraId);
  };

  // Loading
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div role="main" className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-auto">
      {/* Header */}
      <div role="main" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            {t('zones.title', 'Zonas de Interesse')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} {t('zones.zones', 'zonas')} • {stats.active} {t('zones.active', 'ativas')}
          </p>
        </div>

        <div role="main" className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadZones}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh', 'Atualizar')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Zona
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {cameras.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Nenhuma câmera disponível
                </div>
              ) : (
                cameras.map(camera => (
                  <DropdownMenuItem 
                    key={camera.id}
                    onClick={() => openEditor(camera)}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {camera.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div role="main" className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground"{t('zones.total', 'Total')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div role="main" className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground"{t('zones.activeCount', 'Ativas')}</p>
                <p className="text-2xl font-bold text-green-500">{stats.active}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div role="main" className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground"{t('zones.restricted', 'Restritas')}</p>
                <p className="text-2xl font-bold text-red-500">{stats.restricted}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div role="main" className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground"{t('zones.counting', 'Contagem')}</p>
                <p className="text-2xl font-bold text-blue-500">{stats.counting}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div role="main" className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar zonas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedCameraFilter} onValueChange={setSelectedCameraFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Câmera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all"{t('zones.allCameras', 'Todas câmeras')}</SelectItem>
            {cameras.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all"{t('zones.allTypes', 'Todos tipos')}</SelectItem>
            {Object.entries(zoneTypeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(searchQuery || selectedCameraFilter !== 'all' || selectedTypeFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCameraFilter('all');
              setSelectedTypeFilter('all');
            }}
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}

        <div role="main" className="flex items-center gap-1 border rounded-lg p-1 ml-auto">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-muted-foreground">
        {filteredZones.length} zonas encontradas
      </div>

      {/* Zones Grid */}
      {filteredZones.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma zona encontrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {zones.length === 0 
              ? 'Crie sua primeira zona de interesse'
              : 'Tente ajustar os filtros'}
          </p>
          {cameras.length > 0 && (
            <Button onClick={() => openEditor(cameras[0])}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Zona
            </Button>
          )}
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'flex flex-col gap-2'
        )}>
          {filteredZones.map(zone => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              stats={zoneStats[zone.id]}
              cameraName={getCameraName(zone.camera_id)}
              onView={() => openView(zone)}
              onEdit={() => openEditor(getCameraById(zone.camera_id), zone)}
              onDelete={() => setDeleteConfirm(zone)}
              onToggle={() => handleToggle(zone)}
            />
          ))}
        </div>
      )}

      {/* Editor Sheet */}
      <ZoneEditorSheet
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingZone(null);
          setEditorCamera(null);
        }}
        camera={editorCamera}
        zone={editingZone}
        onSave={handleSave}
      />

      {/* View Dialog */}
      <ZoneViewDialog
        zone={viewingZone}
        camera={viewingZone ? getCameraById(viewingZone.camera_id) : null}
        stats={viewingZone ? zoneStats[viewingZone.id] : undefined}
        events={viewingZone ? zoneEvents[viewingZone.id] || [] : []}
        isOpen={!!viewingZone}
        onClose={() => setViewingZone(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a zona <strong>{deleteConfirm?.name}</strong>?
              Todo o histórico de eventos será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ZonesPage;

