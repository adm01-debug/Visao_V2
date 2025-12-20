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
import {
  Target,
  Plus,
  Search,
  Camera,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  MoreHorizontal,
  Clock,
  Users,
  AlertTriangle,
  TrendingUp,
  ArrowLeftRight,
  Timer,
  MapPin,
  Activity,
  Settings2,
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
import { Textarea } from '@/components/ui/textarea';
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
  CardDescription,
  CardHeader,
  CardTitle,
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

// ============================================
// TIPOS
// ============================================

type ZoneType = 'restricted' | 'counting' | 'tripwire' | 'dwell' | 'occupancy' | 'parking' | 'queue' | 'safety' | 'custom';
type ZoneShape = 'polygon' | 'rectangle' | 'circle' | 'line';

interface ZoneGeometry {
  shape: ZoneShape;
  points: { x: number; y: number }[];
}

interface ZoneConfig {
  maxOccupancy?: number;
  maxDwellTime?: number;
  tripwireDirection?: 'any' | 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';
  alertOnEnter?: boolean;
  alertOnExit?: boolean;
  alertOnOccupancy?: boolean;
  alertOnDwell?: boolean;
}

interface Zone {
  id: string;
  camera_id: string;
  name: string;
  description?: string;
  type: ZoneType;
  geometry: ZoneGeometry;
  color: string;
  opacity: number;
  enabled: boolean;
  config: ZoneConfig;
  rules?: any[];
  created_at: string;
  updated_at: string;
}

interface ZoneStats {
  currentOccupancy: number;
  countIn: number;
  countOut: number;
  avgDwellTime: number;
  alertsToday: number;
  lastEvent?: string;
}

interface ZoneEvent {
  id: string;
  zone_id: string;
  zone_name: string;
  event_type: string;
  value?: number;
  created_at: string;
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

// ============================================
// COMPONENTE: Zone Card
// ============================================

interface ZoneCardProps {
  zone: Zone;
  stats?: ZoneStats;
  cameraName: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onView: () => void;
}

function ZoneCard({ zone, stats, cameraName, onEdit, onDelete, onToggle, onView }: ZoneCardProps) {
  const typeConfig = zoneTypeConfig[zone.type];
  const TypeIcon = typeConfig.icon;

  return (
    <Card className={cn(
      'transition-all hover:shadow-md cursor-pointer group',
      !zone.enabled && 'opacity-60'
    )} onClick={onView}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: zone.color }}
            />
            <div>
              <CardTitle className="text-base">{zone.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn('text-xs', typeConfig.color)}>
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {typeConfig.label}
                </Badge>
                {!zone.enabled && (
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
                {zone.enabled ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
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
                  <p className="text-[10px] text-muted-foreground">Entrada</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold text-red-500">{stats.countOut}</p>
                  <p className="text-[10px] text-muted-foreground">Saída</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold">{stats.currentOccupancy}</p>
                  <p className="text-[10px] text-muted-foreground">Atual</p>
                </div>
              </>
            )}
            {zone.type === 'dwell' && (
              <>
                <div className="p-2 bg-muted rounded col-span-2">
                  <p className="text-lg font-bold">{Math.round(stats.avgDwellTime)}s</p>
                  <p className="text-[10px] text-muted-foreground">Tempo médio</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold text-yellow-500">{stats.alertsToday}</p>
                  <p className="text-[10px] text-muted-foreground">Alertas</p>
                </div>
              </>
            )}
            {(zone.type === 'restricted' || zone.type === 'safety') && (
              <div className="p-2 bg-muted rounded col-span-3">
                <p className="text-lg font-bold text-red-500">{stats.alertsToday}</p>
                <p className="text-[10px] text-muted-foreground">Alertas hoje</p>
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
      </CardContent>
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
  zone?: Zone | null;
  onSave: (data: Partial<Zone>) => Promise<void>;
}

function ZoneEditorSheet({ isOpen, onClose, camera, zone, onSave }: ZoneEditorSheetProps) {
  const [formData, setFormData] = useState<Partial<Zone>>({
    name: '',
    description: '',
    type: 'counting',
    color: defaultColors[0],
    opacity: 0.3,
    enabled: true,
    config: {},
  });
  const [geometry, setGeometry] = useState<ZoneGeometry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'rectangle' | 'polygon' | 'line'>('rectangle');

  useEffect(() => {
    if (zone) {
      setFormData({
        name: zone.name,
        description: zone.description,
        type: zone.type,
        color: zone.color,
        opacity: zone.opacity,
        enabled: zone.enabled,
        config: zone.config || {},
      });
      setGeometry(zone.geometry);
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'counting',
        color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
        opacity: 0.3,
        enabled: true,
        config: {},
      });
      setGeometry(null);
    }
  }, [zone, isOpen]);

  const handleZoneDrawn = useCallback((points: { x: number; y: number }[]) => {
    const shape: ZoneShape = drawingMode === 'line' ? 'line' : 
                             drawingMode === 'rectangle' ? 'rectangle' : 'polygon';
    setGeometry({ shape, points });
    toast.success(`Zona desenhada com ${points.length} pontos`);
  }, [drawingMode]);

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!geometry || geometry.points.length < 2) {
      toast.error('Desenhe a zona no vídeo');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        camera_id: camera.id,
        geometry,
      });
      onClose();
      toast.success(zone ? 'Zona atualizada' : 'Zona criada');
    } catch (error) {
      toast.error('Erro ao salvar');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = zoneTypeConfig[formData.type as ZoneType];

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
            <div className="flex items-center justify-between">
              <Label>Desenhar Zona</Label>
              <div className="flex items-center gap-1 border rounded-lg p-1">
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
                  streamUrl={camera.stream_url}
                  protocol={camera.stream_protocol || 'hls'}
                  cameraName={camera.name}
                  showControls={false}
                  autoPlay
                  muted
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
                  existingZones={geometry ? [{
                    id: 'temp',
                    name: formData.name || 'Nova Zona',
                    type: formData.type as ZoneType,
                    geometry,
                    color: formData.color || '#3B82F6',
                    opacity: formData.opacity || 0.3,
                    enabled: true,
                  } as any] : []}
                  onZoneCreated={(zone) => handleZoneDrawn(zone.geometry?.points || [])}
                  selectedColor={formData.color}
                  drawingMode={drawingMode}
                />
              </div>
            </div>

            {geometry && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded">
                <Check className="w-4 h-4" />
                Zona desenhada: {geometry.shape} com {geometry.points.length} pontos
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto h-6 text-xs"
                  onClick={() => setGeometry(null)}
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
              <Label htmlFor="name">Nome da Zona *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Entrada Principal"
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo</Label>
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
                      <div className="flex items-center gap-2">
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
              <Label>Cor</Label>
              <div className="flex items-center gap-2 mt-2">
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
              <Label>Opacidade: {Math.round((formData.opacity || 0.3) * 100)}%</Label>
              <Slider
                value={[(formData.opacity || 0.3) * 100]}
                onValueChange={([v]) => setFormData(f => ({ ...f, opacity: v / 100 }))}
                min={10}
                max={80}
                step={5}
                className="mt-2"
              />
            </div>

            {/* Configurações específicas por tipo */}
            {(formData.type === 'occupancy' || formData.type === 'queue') && (
              <div>
                <Label htmlFor="maxOccupancy">Capacidade Máxima</Label>
                <Input
                  id="maxOccupancy"
                  type="number"
                  value={formData.config?.maxOccupancy || ''}
                  onChange={(e) => setFormData(f => ({ 
                    ...f, 
                    config: { ...f.config, maxOccupancy: Number(e.target.value) }
                  }))}
                  placeholder="Ex: 50"
                />
              </div>
            )}

            {formData.type === 'dwell' && (
              <div>
                <Label htmlFor="maxDwellTime">Tempo Máximo (segundos)</Label>
                <Input
                  id="maxDwellTime"
                  type="number"
                  value={formData.config?.maxDwellTime || ''}
                  onChange={(e) => setFormData(f => ({ 
                    ...f, 
                    config: { ...f.config, maxDwellTime: Number(e.target.value) }
                  }))}
                  placeholder="Ex: 300"
                />
              </div>
            )}

            {formData.type === 'tripwire' && (
              <div>
                <Label htmlFor="direction">Direção da Contagem</Label>
                <Select
                  value={formData.config?.tripwireDirection || 'any'}
                  onValueChange={(v) => setFormData(f => ({ 
                    ...f, 
                    config: { ...f.config, tripwireDirection: v as any }
                  }))}
                >
                  <SelectTrigger id="direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer direção</SelectItem>
                    <SelectItem value="left-to-right">Esquerda → Direita</SelectItem>
                    <SelectItem value="right-to-left">Direita → Esquerda</SelectItem>
                    <SelectItem value="top-to-bottom">Cima → Baixo</SelectItem>
                    <SelectItem value="bottom-to-top">Baixo → Cima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="col-span-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Descrição da zona..."
                rows={2}
              />
            </div>
          </div>

          {/* Alertas */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <Label className="text-sm font-medium">Configuração de Alertas</Label>
            
            {(formData.type === 'restricted' || formData.type === 'safety') && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Alertar ao entrar</p>
                  <p className="text-xs text-muted-foreground">Gera alerta quando alguém entra</p>
                </div>
                <Switch
                  checked={formData.config?.alertOnEnter ?? true}
                  onCheckedChange={(checked) => setFormData(f => ({
                    ...f,
                    config: { ...f.config, alertOnEnter: checked }
                  }))}
                />
              </div>
            )}

            {formData.type === 'occupancy' && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Alertar ocupação máxima</p>
                  <p className="text-xs text-muted-foreground">Alerta quando atingir capacidade</p>
                </div>
                <Switch
                  checked={formData.config?.alertOnOccupancy ?? true}
                  onCheckedChange={(checked) => setFormData(f => ({
                    ...f,
                    config: { ...f.config, alertOnOccupancy: checked }
                  }))}
                />
              </div>
            )}

            {formData.type === 'dwell' && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Alertar tempo excedido</p>
                  <p className="text-xs text-muted-foreground">Alerta quando exceder tempo máximo</p>
                </div>
                <Switch
                  checked={formData.config?.alertOnDwell ?? true}
                  onCheckedChange={(checked) => setFormData(f => ({
                    ...f,
                    config: { ...f.config, alertOnDwell: checked }
                  }))}
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-sm font-medium">Zona Ativa</p>
                <p className="text-xs text-muted-foreground">Desative para pausar monitoramento</p>
              </div>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, enabled: checked }))}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !geometry}
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
  zone: Zone | null;
  camera: any;
  stats?: ZoneStats;
  events: ZoneEvent[];
  isOpen: boolean;
  onClose: () => void;
}

function ZoneViewDialog({ zone, camera, stats, events, isOpen, onClose }: ZoneViewDialogProps) {
  if (!zone) return null;

  const typeConfig = zoneTypeConfig[zone.type];
  const TypeIcon = typeConfig.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: zone.color }}
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
            <TabsTrigger value="preview">Visualização</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
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
                    streamUrl={camera.stream_url}
                    protocol={camera.stream_protocol || 'hls'}
                    cameraName={camera.name}
                    showControls
                    autoPlay
                    muted
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
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {zone.geometry.shape === 'line' ? (
                    <line
                      x1={`${zone.geometry.points[0]?.x}%`}
                      y1={`${zone.geometry.points[0]?.y}%`}
                      x2={`${zone.geometry.points[1]?.x}%`}
                      y2={`${zone.geometry.points[1]?.y}%`}
                      stroke={zone.color}
                      strokeWidth="3"
                      strokeDasharray="5,5"
                    />
                  ) : (
                    <polygon
                      points={zone.geometry.points.map(p => `${p.x}%,${p.y}%`).join(' ')}
                      fill={zone.color}
                      fillOpacity={zone.opacity}
                      stroke={zone.color}
                      strokeWidth="2"
                    />
                  )}
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="font-medium">{typeConfig.label}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className={cn('font-medium', zone.enabled ? 'text-green-500' : 'text-gray-500')}>
                    {zone.enabled ? 'Ativa' : 'Desativada'}
                  </p>
                </div>
                {zone.description && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <p className="text-sm">{zone.description}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="m-0">
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-green-500">{stats.countIn}</p>
                      <p className="text-sm text-muted-foreground">Entradas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-red-500">{stats.countOut}</p>
                      <p className="text-sm text-muted-foreground">Saídas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold">{stats.currentOccupancy}</p>
                      <p className="text-sm text-muted-foreground">Ocupação Atual</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-yellow-500">{stats.alertsToday}</p>
                      <p className="text-sm text-muted-foreground">Alertas Hoje</p>
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
                        event.event_type.includes('alert') ? 'bg-yellow-500' : 'bg-blue-500'
                      )} />
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">
                          {event.event_type.replace(/_/g, ' ')}
                        </p>
                        {event.value !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Valor: {event.value}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </p>
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
// COMPONENTE PRINCIPAL: ZonesPage
// ============================================

export function ZonesPage() {
  // Estado
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneStats, setZoneStats] = useState<Record<string, ZoneStats>>({});
  const [zoneEvents, setZoneEvents] = useState<Record<string, ZoneEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCameraFilter, setSelectedCameraFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Editor
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editorCamera, setEditorCamera] = useState<any>(null);
  
  // View
  const [viewingZone, setViewingZone] = useState<Zone | null>(null);
  
  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState<Zone | null>(null);

  // Hooks
  const { cameras } = useCameras();

  // Carregar zonas
  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setZones(data || []);

      // Carregar stats
      const statsMap: Record<string, ZoneStats> = {};
      for (const zone of data || []) {
        try {
          const { data: statsData } = await supabase
            .rpc('get_zone_stats', { p_zone_id: zone.id, p_hours: 24 });
          
          if (statsData?.[0]) {
            statsMap[zone.id] = {
              currentOccupancy: Math.max(0, (statsData[0].count_in || 0) - (statsData[0].count_out || 0)),
              countIn: statsData[0].count_in || 0,
              countOut: statsData[0].count_out || 0,
              avgDwellTime: 0,
              alertsToday: statsData[0].alerts_count || 0,
              lastEvent: statsData[0].last_event_at,
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
    active: zones.filter(z => z.enabled).length,
    restricted: zones.filter(z => z.type === 'restricted').length,
    counting: zones.filter(z => z.type === 'counting' || z.type === 'tripwire').length,
  }), [zones]);

  // Handlers
  const handleSave = async (data: Partial<Zone>) => {
    try {
      if (editingZone) {
        const { error } = await supabase
          .from('zones')
          .update(data)
          .eq('id', editingZone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('zones')
          .insert(data);
        if (error) throw error;
      }
      loadZones();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      throw error;
    }
  };

  const handleDelete = async (zone: Zone) => {
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

  const handleToggle = async (zone: Zone) => {
    try {
      const { error } = await supabase
        .from('zones')
        .update({ enabled: !zone.enabled })
        .eq('id', zone.id);
      
      if (error) throw error;
      toast.success(zone.enabled ? 'Zona desativada' : 'Zona ativada');
      loadZones();
    } catch (error) {
      toast.error('Erro ao alternar');
    }
  };

  const openEditor = (camera: any, zone?: Zone) => {
    setEditorCamera(camera);
    setEditingZone(zone || null);
    setIsEditorOpen(true);
  };

  const openView = (zone: Zone) => {
    setViewingZone(zone);
    loadZoneEvents(zone.id);
  };

  const getCameraName = (cameraId: string) => {
    return cameras.find(c => c.id === cameraId)?.name || 'Câmera desconhecida';
  };

  const getCameraById = (cameraId: string) => {
    return cameras.find(c => c.id === cameraId);
  };

  // Loading
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            Zonas de Interesse
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} zonas • {stats.active} ativas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadZones}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold text-green-500">{stats.active}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Restritas</p>
                <p className="text-2xl font-bold text-red-500">{stats.restricted}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Contagem</p>
                <p className="text-2xl font-bold text-blue-500">{stats.counting}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
            <SelectItem value="all">Todas câmeras</SelectItem>
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
            <SelectItem value="all">Todos tipos</SelectItem>
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

        <div className="flex items-center gap-1 border rounded-lg p-1 ml-auto">
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
