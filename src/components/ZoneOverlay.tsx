/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: ZoneOverlay
 * 
 * Overlay para exibir zonas de interesse sobre o vídeo,
 * com estatísticas em tempo real e indicadores de alerta.
 */

import { useMemo } from 'react';
import {
  Users,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Shield,
  Car,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Zone,
  ZoneStats,
  TrackedObject,
  getZoneTypeLabel,
} from '@/types/zones';

// ============================================
// TIPOS
// ============================================

interface ZoneOverlayProps {
  /** Zonas para exibir */
  zones: Zone[];
  
  /** Estatísticas por zona */
  stats: Map<string, ZoneStats>;
  
  /** Objetos rastreados */
  trackedObjects?: Map<string, TrackedObject>;
  
  /** Mostrar estatísticas */
  showStats?: boolean;
  
  /** Mostrar objetos rastreados */
  showTrackedObjects?: boolean;
  
  /** Mostrar labels das zonas */
  showLabels?: boolean;
  
  /** Zona selecionada */
  selectedZoneId?: string | null;
  
  /** Callback ao clicar em zona */
  onZoneClick?: (zone: Zone) => void;
  
  /** Classe CSS */
  className?: string;
}

// ============================================
// ÍCONES POR TIPO
// ============================================

const zoneTypeIcons: Record<string, React.ElementType> = {
  restricted: Shield,
  counting: Users,
  tripwire: ArrowRightLeft,
  dwell: Clock,
  occupancy: Users,
  parking: Car,
  queue: Users,
  safety: Shield,
  custom: Eye,
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ZoneOverlay({
  zones,
  stats,
  trackedObjects,
  showStats = true,
  showTrackedObjects = true,
  showLabels = true,
  selectedZoneId,
  onZoneClick,
  className,
}: ZoneOverlayProps) {
  // Filtrar zonas habilitadas
  const enabledZones = useMemo(() => 
    zones.filter(z => z.enabled),
    [zones]
  );

  // Verificar se zona tem alerta ativo
  const hasActiveAlert = (zone: Zone, zoneStats?: ZoneStats): boolean => {
    if (!zoneStats) return false;
    
    // Ocupação excedida
    if (zone.config.maxOccupancy && zoneStats.currentOccupancy >= zone.config.maxOccupancy) {
      return true;
    }
    
    // Objetos com tempo excedido
    if (zone.config.maxDwellTime) {
      const hasExceeded = zoneStats.currentObjects.some(
        obj => obj.dwellTime > (zone.config.maxDwellTime || Infinity)
      );
      if (hasExceeded) return true;
    }
    
    return false;
  };

  // ============================================
  // RENDER: Zona
  // ============================================

  const renderZone = (zone: Zone) => {
    const zoneStats = stats.get(zone.id);
    const isSelected = selectedZoneId === zone.id;
    const isAlerted = hasActiveAlert(zone, zoneStats);
    const Icon = zoneTypeIcons[zone.type] || Eye;

    const points = zone.geometry.points;
    if (points.length < 2) return null;

    // Calcular centro da zona
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    // Path SVG
    const isLine = zone.geometry.shape === 'line';
    const pathData = isLine
      ? `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
      : `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;

    return (
      <g key={zone.id} className="zone-group">
        {/* Área da zona */}
        <path
          d={pathData}
          fill={isLine ? 'none' : zone.color}
          fillOpacity={isLine ? 0 : zone.opacity}
          stroke={zone.color}
          strokeWidth={isSelected ? 0.8 : 0.5}
          strokeDasharray={isLine ? '2,2' : undefined}
          className={cn(
            'cursor-pointer transition-all duration-200',
            isAlerted && 'animate-pulse'
          )}
          onClick={() => onZoneClick?.(zone)}
        />

        {/* Borda de alerta */}
        {isAlerted && !isLine && (
          <path
            d={pathData}
            fill="none"
            stroke="#EF4444"
            strokeWidth={1}
            strokeDasharray="3,3"
            className="animate-pulse"
          />
        )}

        {/* Label e stats */}
        {showLabels && !isLine && (
          <foreignObject
            x={centerX - 15}
            y={centerY - 8}
            width={30}
            height={16}
            className="overflow-visible pointer-events-none"
          >
            <div className="flex flex-col items-center gap-0.5">
              {/* Nome da zona */}
              <div
                className="px-1 py-0.5 rounded text-[4px] font-medium text-white whitespace-nowrap"
                style={{ 
                  backgroundColor: `${zone.color}CC`,
                  textShadow: '0 0 2px rgba(0,0,0,0.5)',
                }}
              >
                {zone.name}
              </div>

              {/* Estatísticas */}
              {showStats && zoneStats && (
                <div className="flex items-center gap-1">
                  {zone.type === 'counting' || zone.type === 'occupancy' ? (
                    <div
                      className={cn(
                        'px-1 py-0.5 rounded text-[4px] font-bold text-white',
                        isAlerted ? 'bg-red-500' : 'bg-black/60'
                      )}
                    >
                      {zoneStats.currentOccupancy}
                      {zone.config.maxOccupancy && `/${zone.config.maxOccupancy}`}
                    </div>
                  ) : zone.type === 'tripwire' ? (
                    <div className="flex gap-0.5">
                      <div className="px-0.5 py-0.25 rounded text-[3px] bg-green-500/80 text-white">
                        ↓{zoneStats.countIn}
                      </div>
                      <div className="px-0.5 py-0.25 rounded text-[3px] bg-orange-500/80 text-white">
                        ↑{zoneStats.countOut}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </foreignObject>
        )}

        {/* Indicador de alerta */}
        {isAlerted && (
          <g>
            <circle
              cx={centerX + 12}
              cy={centerY - 8}
              r={3}
              fill="#EF4444"
              className="animate-ping"
            />
            <circle
              cx={centerX + 12}
              cy={centerY - 8}
              r={2}
              fill="#EF4444"
            />
          </g>
        )}

        {/* Linha: setas de direção */}
        {isLine && points.length === 2 && (
          <>
            {/* Seta no meio da linha */}
            <polygon
              points={getArrowPoints(points[0], points[1])}
              fill={zone.color}
            />
          </>
        )}
      </g>
    );
  };

  // ============================================
  // RENDER: Objetos rastreados
  // ============================================

  const renderTrackedObjects = () => {
    if (!showTrackedObjects || !trackedObjects) return null;

    return Array.from(trackedObjects.values()).map(obj => (
      <g key={obj.id}>
        {/* Bounding box */}
        <rect
          x={obj.boundingBox.x}
          y={obj.boundingBox.y}
          width={obj.boundingBox.width}
          height={obj.boundingBox.height}
          fill="none"
          stroke={obj.type === 'person' ? '#3B82F6' : '#10B981'}
          strokeWidth={0.3}
          rx={0.5}
        />

        {/* Ponto central */}
        <circle
          cx={obj.position.x}
          cy={obj.position.y}
          r={0.8}
          fill={obj.type === 'person' ? '#3B82F6' : '#10B981'}
        />

        {/* Caminho percorrido */}
        {obj.path && obj.path.length > 1 && (
          <path
            d={`M ${obj.path.map(p => `${p.x} ${p.y}`).join(' L ')}`}
            fill="none"
            stroke={obj.type === 'person' ? '#3B82F680' : '#10B98180'}
            strokeWidth={0.2}
            strokeDasharray="1,1"
          />
        )}

        {/* Tempo de permanência (se significativo) */}
        {obj.dwellTime > 30 && (
          <text
            x={obj.position.x}
            y={obj.position.y - 3}
            textAnchor="middle"
            className="text-[2.5px] fill-white"
            style={{ textShadow: '0 0 1px black' }}
          >
            {Math.round(obj.dwellTime)}s
          </text>
        )}
      </g>
    ));
  };

  // ============================================
  // HELPERS
  // ============================================

  function getArrowPoints(start: { x: number; y: number }, end: { x: number; y: number }): string {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const size = 2;
    
    const tip = { x: midX, y: midY };
    const left = {
      x: midX - size * Math.cos(angle - Math.PI / 6),
      y: midY - size * Math.sin(angle - Math.PI / 6),
    };
    const right = {
      x: midX - size * Math.cos(angle + Math.PI / 6),
      y: midY - size * Math.sin(angle + Math.PI / 6),
    };
    
    return `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`;
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  if (enabledZones.length === 0 && (!trackedObjects || trackedObjects.size === 0)) {
    return null;
  }

  return (
    <TooltipProvider>
      <svg
        viewBox="0 0 100 56.25"
        preserveAspectRatio="none"
        className={cn('absolute inset-0 w-full h-full pointer-events-none z-10', className)}
      >
        {/* Zonas */}
        <g className="pointer-events-auto">
          {enabledZones.map(renderZone)}
        </g>

        {/* Objetos rastreados */}
        {renderTrackedObjects()}
      </svg>

      {/* Legenda */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
        {enabledZones.some(z => hasActiveAlert(z, stats.get(z.id))) && (
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Alerta Ativo
          </Badge>
        )}
        
        {showStats && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Users className="w-3 h-3" />
            {Array.from(stats.values()).reduce((sum, s) => sum + s.currentOccupancy, 0)} pessoas
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}

export default ZoneOverlay;
