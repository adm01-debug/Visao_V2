/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: ZoneEditor
 * 
 * Editor visual para criar e editar zonas de interesse.
 * Suporta polígonos, retângulos e linhas (tripwire).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MousePointer,
  Square,
  Pentagon,
  Minus,
  Trash2,
  Check,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  Settings,
  Palette,
  Move,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Zone,
  ZoneShape,
  ZoneType,
  Point,
  ZoneGeometry,
  ZoneConfig,
  generateZoneColor,
  getZoneTypeLabel,
} from '@/types/zones';

// ============================================
// TIPOS
// ============================================

interface ZoneEditorProps {
  /** Zonas existentes */
  zones: Zone[];
  
  /** Zona selecionada para edição */
  selectedZone?: Zone | null;
  
  /** Modo de edição */
  mode: 'view' | 'create' | 'edit';
  
  /** Callbacks */
  onZoneCreate?: (zone: Omit<Zone, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => void;
  onZoneUpdate?: (zoneId: string, updates: Partial<Zone>) => void;
  onZoneDelete?: (zoneId: string) => void;
  onZoneSelect?: (zone: Zone | null) => void;
  onModeChange?: (mode: 'view' | 'create' | 'edit') => void;
  
  /** Dimensões do container */
  width?: number;
  height?: number;
  
  /** ID da câmera */
  cameraId: string;
  
  /** Mostrar overlay sobre vídeo */
  overlay?: boolean;
  
  /** Classe CSS */
  className?: string;
}

// ============================================
// CORES PREDEFINIDAS
// ============================================

const presetColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ZoneEditor({
  zones,
  selectedZone,
  mode,
  onZoneCreate,
  onZoneUpdate,
  onZoneDelete,
  onZoneSelect,
  onModeChange,
  width = 800,
  height = 450,
  cameraId,
  overlay = true,
  className,
}: ZoneEditorProps) {
  // Estado de desenho
  const [drawingShape, setDrawingShape] = useState<ZoneShape>('polygon');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  
  // Estado do formulário
  const [zoneName, setZoneName] = useState('Nova Zona');
  const [zoneType, setZoneType] = useState<ZoneType>('restricted');
  const [zoneColor, setZoneColor] = useState(generateZoneColor());
  const [zoneOpacity, setZoneOpacity] = useState(0.3);
  const [showZones, setShowZones] = useState(true);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragPointIndexRef = useRef<number | null>(null);

  // ============================================
  // HANDLERS DE MOUSE
  // ============================================

  const getRelativePosition = useCallback((e: React.MouseEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (mode !== 'create') return;
    
    const point = getRelativePosition(e);

    if (drawingShape === 'rectangle') {
      if (currentPoints.length === 0) {
        setCurrentPoints([point]);
        setIsDrawing(true);
      } else {
        // Completar retângulo com 4 pontos
        const p1 = currentPoints[0];
        const rectPoints: Point[] = [
          p1,
          { x: point.x, y: p1.y },
          point,
          { x: p1.x, y: point.y },
        ];
        finishDrawing(rectPoints);
      }
    } else if (drawingShape === 'line') {
      if (currentPoints.length === 0) {
        setCurrentPoints([point]);
        setIsDrawing(true);
      } else {
        finishDrawing([currentPoints[0], point]);
      }
    } else {
      // Polígono - adicionar pontos
      setCurrentPoints(prev => [...prev, point]);
      setIsDrawing(true);
    }
  }, [mode, drawingShape, currentPoints, getRelativePosition]);

  const handleDoubleClick = useCallback(() => {
    if (mode === 'create' && drawingShape === 'polygon' && currentPoints.length >= 3) {
      finishDrawing(currentPoints);
    }
  }, [mode, drawingShape, currentPoints]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    
    // Preview para retângulo/linha
    if (drawingShape === 'rectangle' || drawingShape === 'line') {
      // Atualização visual seria feita aqui
    }
  }, [isDrawing, drawingShape]);

  // ============================================
  // FINALIZAR DESENHO
  // ============================================

  const finishDrawing = useCallback((points: Point[]) => {
    const geometry: ZoneGeometry = {
      shape: drawingShape,
      points,
    };

    const config: ZoneConfig = {
      alertOnEnter: zoneType === 'restricted',
      alertOnExit: false,
      alertCooldown: 60,
    };

    // Configurações específicas por tipo
    if (zoneType === 'tripwire') {
      config.tripwireDirection = 'both';
    } else if (zoneType === 'occupancy') {
      config.maxOccupancy = 10;
    } else if (zoneType === 'dwell') {
      config.maxDwellTime = 300;
    }

    const newZone: Omit<Zone, 'id' | 'createdAt' | 'updatedAt' | 'stats'> = {
      cameraId,
      name: zoneName,
      type: zoneType,
      geometry,
      color: zoneColor,
      opacity: zoneOpacity,
      enabled: true,
      config,
      rules: [],
    };

    onZoneCreate?.(newZone);
    
    // Reset
    setCurrentPoints([]);
    setIsDrawing(false);
    setZoneName('Nova Zona');
    onModeChange?.('view');
  }, [drawingShape, zoneName, zoneType, zoneColor, zoneOpacity, cameraId, onZoneCreate, onModeChange]);

  const cancelDrawing = useCallback(() => {
    setCurrentPoints([]);
    setIsDrawing(false);
    onModeChange?.('view');
  }, [onModeChange]);

  // ============================================
  // RENDER: SVG da Zona
  // ============================================

  const renderZonePath = (zone: Zone, isSelected: boolean, isHovered: boolean) => {
    const { geometry, color, opacity } = zone;
    const points = geometry.points;

    if (points.length < 2) return null;

    const pathData = geometry.shape === 'line'
      ? `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
      : `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;

    const isLine = geometry.shape === 'line';

    return (
      <g key={zone.id}>
        {/* Área/Linha */}
        <path
          d={pathData}
          fill={isLine ? 'none' : color}
          fillOpacity={isLine ? 0 : opacity}
          stroke={color}
          strokeWidth={isSelected || isHovered ? 3 : 2}
          strokeDasharray={isLine ? '5,5' : undefined}
          className={cn(
            'cursor-pointer transition-all',
            isSelected && 'stroke-[4]',
            isHovered && !isSelected && 'stroke-[3]'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onZoneSelect?.(zone);
          }}
          onMouseEnter={() => setHoveredZone(zone.id)}
          onMouseLeave={() => setHoveredZone(null)}
        />

        {/* Pontos de controle (quando selecionada) */}
        {isSelected && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={1.5}
            fill="white"
            stroke={color}
            strokeWidth={0.5}
            className="cursor-move"
          />
        ))}

        {/* Label */}
        {!isLine && (
          <text
            x={points.reduce((sum, p) => sum + p.x, 0) / points.length}
            y={points.reduce((sum, p) => sum + p.y, 0) / points.length}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[3px] font-medium fill-white pointer-events-none"
            style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
          >
            {zone.name}
          </text>
        )}
      </g>
    );
  };

  // ============================================
  // RENDER: Desenho atual
  // ============================================

  const renderCurrentDrawing = () => {
    if (currentPoints.length === 0) return null;

    const pathData = drawingShape === 'polygon' && currentPoints.length >= 2
      ? `M ${currentPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`
      : currentPoints.length === 1
      ? ''
      : `M ${currentPoints[0].x} ${currentPoints[0].y} L ${currentPoints[1].x} ${currentPoints[1].y}`;

    return (
      <g>
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke={zoneColor}
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}
        {currentPoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={1.2}
            fill={zoneColor}
            stroke="white"
            strokeWidth={0.3}
          />
        ))}
      </g>
    );
  };

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  return (
    <TooltipProvider>
      <div className={cn('relative', className)}>
        {/* Toolbar */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-background/90 backdrop-blur rounded-lg p-2 shadow-lg">
          {/* Modo view */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={mode === 'view' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onModeChange?.('view')}
              >
                <MousePointer className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Selecionar</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border" />

          {/* Ferramentas de desenho */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={mode === 'create' && drawingShape === 'rectangle' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => {
                  setDrawingShape('rectangle');
                  onModeChange?.('create');
                }}
              >
                <Square className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Retângulo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={mode === 'create' && drawingShape === 'polygon' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => {
                  setDrawingShape('polygon');
                  onModeChange?.('create');
                }}
              >
                <Pentagon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Polígono (duplo clique para finalizar)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={mode === 'create' && drawingShape === 'line' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => {
                  setDrawingShape('line');
                  setZoneType('tripwire');
                  onModeChange?.('create');
                }}
              >
                <Minus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Linha (Tripwire)</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border" />

          {/* Toggle visibilidade */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowZones(!showZones)}
              >
                {showZones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showZones ? 'Ocultar zonas' : 'Mostrar zonas'}</TooltipContent>
          </Tooltip>
        </div>

        {/* Painel de configuração (quando criando) */}
        {mode === 'create' && (
          <div className="absolute top-2 right-2 z-20 bg-background/95 backdrop-blur rounded-lg p-3 shadow-lg w-64 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Nova Zona</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelDrawing}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Nome</Label>
              <Input
                value={zoneName}
                onChange={e => setZoneName(e.target.value)}
                placeholder="Nome da zona"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tipo</Label>
              <Select value={zoneType} onValueChange={v => setZoneType(v as ZoneType)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restricted">Área Restrita</SelectItem>
                  <SelectItem value="counting">Contagem</SelectItem>
                  <SelectItem value="tripwire">Linha (Tripwire)</SelectItem>
                  <SelectItem value="dwell">Tempo Permanência</SelectItem>
                  <SelectItem value="occupancy">Ocupação</SelectItem>
                  <SelectItem value="safety">Segurança/EPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Cor</Label>
              <div className="flex gap-1">
                {presetColors.map(color => (
                  <button
                    key={color}
                    className={cn(
                      'w-6 h-6 rounded border-2 transition-transform',
                      zoneColor === color ? 'border-white scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setZoneColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Opacidade</Label>
                <span className="text-xs text-muted-foreground">{Math.round(zoneOpacity * 100)}%</span>
              </div>
              <Slider
                value={[zoneOpacity]}
                onValueChange={([v]) => setZoneOpacity(v)}
                min={0.1}
                max={0.8}
                step={0.1}
              />
            </div>

            {currentPoints.length > 0 && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentPoints(prev => prev.slice(0, -1))}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Desfazer
                </Button>
                {drawingShape === 'polygon' && currentPoints.length >= 3 && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => finishDrawing(currentPoints)}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Concluir
                  </Button>
                )}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              {drawingShape === 'polygon' 
                ? 'Clique para adicionar pontos. Duplo clique para finalizar.'
                : drawingShape === 'rectangle'
                ? 'Clique para marcar os cantos opostos.'
                : 'Clique para marcar início e fim da linha.'}
            </p>
          </div>
        )}

        {/* Canvas SVG */}
        <div
          ref={canvasRef}
          className={cn(
            'relative bg-black/20 rounded-lg overflow-hidden',
            mode === 'create' && 'cursor-crosshair',
            mode === 'view' && 'cursor-default'
          )}
          style={{ width, height }}
          onClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
        >
          <svg
            viewBox="0 0 100 56.25"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            {/* Zonas existentes */}
            {showZones && zones.map(zone => 
              renderZonePath(
                zone,
                selectedZone?.id === zone.id,
                hoveredZone === zone.id
              )
            )}

            {/* Desenho atual */}
            {mode === 'create' && renderCurrentDrawing()}
          </svg>

          {/* Badge de contagem de zonas */}
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="text-xs">
              {zones.length} zona(s)
            </Badge>
          </div>
        </div>

        {/* Info da zona selecionada */}
        {selectedZone && mode === 'view' && (
          <div className="absolute bottom-2 right-2 z-20 bg-background/95 backdrop-blur rounded-lg p-3 shadow-lg max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: selectedZone.color }}
                />
                <span className="font-medium text-sm">{selectedZone.name}</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onZoneDelete?.(selectedZone.id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onZoneSelect?.(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Tipo: {getZoneTypeLabel(selectedZone.type)}</div>
              <div>Pontos: {selectedZone.geometry.points.length}</div>
              <div>Status: {selectedZone.enabled ? 'Ativa' : 'Inativa'}</div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default ZoneEditor;
