/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: ZoneOverlay
 * 
 * Overlay para exibir zonas de interesse sobre o vídeo:
 * - Renderização de polígonos, retângulos e linhas
 * - Indicadores de ocupação em tempo real
 * - Animações de alerta
 * - Stats por zona
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Timer,
  Ban,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

type ZoneType = 'restricted' | 'counting' | 'tripwire' | 'dwell' | 'occupancy' | 'parking' | 'queue' | 'safety' | 'custom';

interface Point {
  x: number;
  y: number;
}

interface ZoneGeometry {
  shape: 'polygon' | 'rectangle' | 'line' | 'circle';
  points: Point[];
}

interface ZoneStats {
  currentOccupancy: number;
  countIn: number;
  countOut: number;
  maxOccupancy?: number;
  avgDwellTime?: number;
  isAlerted?: boolean;
}

interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  geometry: ZoneGeometry;
  color: string;
  opacity: number;
  enabled: boolean;
  stats?: ZoneStats;
}

interface ZoneOverlayProps {
  zones: Zone[];
  showLabels?: boolean;
  showStats?: boolean;
  showAlerts?: boolean;
  animateAlerts?: boolean;
  className?: string;
  onZoneClick?: (zone: Zone) => void;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const zoneTypeIcons: Record<ZoneType, any> = {
  restricted: Ban,
  counting: Users,
  tripwire: ArrowRight,
  dwell: Timer,
  occupancy: Users,
  parking: CheckCircle,
  queue: Users,
  safety: AlertTriangle,
  custom: CheckCircle,
};

// ============================================
// COMPONENTE: Zone Label
// ============================================

interface ZoneLabelProps {
  zone: Zone;
  position: Point;
  showStats: boolean;
}

function ZoneLabel({ zone, position, showStats }: ZoneLabelProps) {
  const Icon = zoneTypeIcons[zone.type];
  const isAlerted = zone.stats?.isAlerted;
  const occupancyPercent = zone.stats?.maxOccupancy 
    ? Math.round((zone.stats.currentOccupancy / zone.stats.maxOccupancy) * 100)
    : null;
  const isOverCapacity = occupancyPercent !== null && occupancyPercent >= 100;

  return (
    <g>
      {/* Background do label */}
      <foreignObject
        x={`${position.x - 5}%`}
        y={`${position.y - 3}%`}
        width="10%"
        height="6%"
        className="overflow-visible"
      >
        <div
          className={cn(
            'flex flex-col items-center justify-center px-2 py-1 rounded text-white text-[10px] font-medium whitespace-nowrap',
            'bg-black/70 backdrop-blur-sm',
            isAlerted && 'animate-pulse bg-red-600/90'
          )}
        >
          <div className="flex items-center gap-1">
            <Icon className="w-3 h-3" />
            <span className="truncate max-w-[60px]">{zone.name}</span>
          </div>
          
          {showStats && zone.stats && (
            <div className="flex items-center gap-2 mt-0.5 text-[9px] opacity-90">
              {(zone.type === 'counting' || zone.type === 'occupancy') && (
                <>
                  <span className="text-green-400">↑{zone.stats.countIn}</span>
                  <span className="text-red-400">↓{zone.stats.countOut}</span>
                  <span className={cn(
                    isOverCapacity && 'text-red-400 font-bold'
                  )}>
                    ={zone.stats.currentOccupancy}
                  </span>
                </>
              )}
              {zone.type === 'dwell' && zone.stats.avgDwellTime && (
                <span>{Math.round(zone.stats.avgDwellTime)}s</span>
              )}
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

// ============================================
// COMPONENTE: Zone Shape
// ============================================

interface ZoneShapeProps {
  zone: Zone;
  animate: boolean;
  onClick?: () => void;
}

function ZoneShape({ zone, animate, onClick }: ZoneShapeProps) {
  const isAlerted = zone.stats?.isAlerted;
  const { geometry, color, opacity } = zone;

  // Animação pulsante para alertas
  const alertAnimation = isAlerted && animate ? {
    animation: 'pulse 1s ease-in-out infinite',
  } : {};

  if (geometry.shape === 'line') {
    const start = geometry.points[0];
    const end = geometry.points[1];
    
    if (!start || !end) return null;

    // Calcular ângulo para a seta
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    return (
      <g className="pointer-events-auto cursor-pointer" onClick={onClick}>
        {/* Linha principal */}
        <line
          x1={`${start.x}%`}
          y1={`${start.y}%`}
          x2={`${end.x}%`}
          y2={`${end.y}%`}
          stroke={color}
          strokeWidth={isAlerted ? 4 : 3}
          strokeDasharray="10,5"
          style={alertAnimation}
        />
        
        {/* Seta de direção no meio */}
        <g transform={`translate(${midX}%, ${midY}%) rotate(${angle})`}>
          <polygon
            points="0,-4 8,0 0,4"
            fill={color}
            transform="translate(-4, 0)"
          />
        </g>

        {/* Círculos nos pontos */}
        <circle cx={`${start.x}%`} cy={`${start.y}%`} r="5" fill={color} />
        <circle cx={`${end.x}%`} cy={`${end.y}%`} r="5" fill={color} />

        {/* Glow para alerta */}
        {isAlerted && (
          <line
            x1={`${start.x}%`}
            y1={`${start.y}%`}
            x2={`${end.x}%`}
            y2={`${end.y}%`}
            stroke={color}
            strokeWidth="10"
            strokeOpacity="0.3"
            style={alertAnimation}
          />
        )}
      </g>
    );
  }

  if (geometry.shape === 'circle' && geometry.points.length >= 2) {
    const center = geometry.points[0];
    const edge = geometry.points[1];
    const radius = Math.sqrt(
      Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
    );

    return (
      <g className="pointer-events-auto cursor-pointer" onClick={onClick}>
        <circle
          cx={`${center.x}%`}
          cy={`${center.y}%`}
          r={`${radius}%`}
          fill={color}
          fillOpacity={opacity}
          stroke={color}
          strokeWidth={isAlerted ? 3 : 2}
          style={alertAnimation}
        />
        {isAlerted && (
          <circle
            cx={`${center.x}%`}
            cy={`${center.y}%`}
            r={`${radius + 1}%`}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeOpacity="0.3"
            style={alertAnimation}
          />
        )}
      </g>
    );
  }

  // Polígono ou retângulo
  return (
    <g className="pointer-events-auto cursor-pointer" onClick={onClick}>
      <polygon
        points={geometry.points.map(p => `${p.x}%,${p.y}%`).join(' ')}
        fill={color}
        fillOpacity={opacity}
        stroke={color}
        strokeWidth={isAlerted ? 3 : 2}
        style={alertAnimation}
      />
      {isAlerted && (
        <polygon
          points={geometry.points.map(p => `${p.x}%,${p.y}%`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeOpacity="0.3"
          style={alertAnimation}
        />
      )}
    </g>
  );
}

// ============================================
// COMPONENTE: Occupancy Indicator
// ============================================

interface OccupancyIndicatorProps {
  zone: Zone;
  position: Point;
}

function OccupancyIndicator({ zone, position }: OccupancyIndicatorProps) {
  if (!zone.stats?.maxOccupancy) return null;

  const { currentOccupancy, maxOccupancy } = zone.stats;
  const percent = Math.min(100, Math.round((currentOccupancy / maxOccupancy) * 100));
  const isOverCapacity = percent >= 100;
  const isNearCapacity = percent >= 80;

  return (
    <foreignObject
      x={`${position.x - 4}%`}
      y={`${position.y + 4}%`}
      width="8%"
      height="3%"
      className="overflow-visible"
    >
      <div className="flex flex-col items-center">
        {/* Barra de progresso */}
        <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              isOverCapacity ? 'bg-red-500' :
              isNearCapacity ? 'bg-yellow-500' : 'bg-green-500'
            )}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        {/* Texto */}
        <span className={cn(
          'text-[9px] font-medium mt-0.5',
          isOverCapacity ? 'text-red-400' :
          isNearCapacity ? 'text-yellow-400' : 'text-green-400'
        )}>
          {currentOccupancy}/{maxOccupancy}
        </span>
      </div>
    </foreignObject>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ZoneOverlay({
  zones,
  showLabels = true,
  showStats = true,
  showAlerts = true,
  animateAlerts = true,
  className,
  onZoneClick,
}: ZoneOverlayProps) {
  // Filtrar apenas zonas ativas
  const activeZones = useMemo(() => {
    return zones.filter(z => z.enabled && z.geometry.points.length >= 2);
  }, [zones]);

  // Calcular centro de cada zona para posicionar labels
  const zoneCenters = useMemo(() => {
    const centers: Record<string, Point> = {};
    
    activeZones.forEach(zone => {
      const points = zone.geometry.points;
      if (points.length === 0) return;
      
      centers[zone.id] = {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
      };
    });
    
    return centers;
  }, [activeZones]);

  // Zonas com alerta primeiro (para renderizar por cima)
  const sortedZones = useMemo(() => {
    return [...activeZones].sort((a, b) => {
      const aAlerted = a.stats?.isAlerted ? 1 : 0;
      const bAlerted = b.stats?.isAlerted ? 1 : 0;
      return aAlerted - bAlerted;
    });
  }, [activeZones]);

  if (sortedZones.length === 0) return null;

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          {/* Definições para efeitos */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Renderizar zonas */}
        {sortedZones.map(zone => (
          <g key={zone.id}>
            <ZoneShape
              zone={zone}
              animate={animateAlerts}
              onClick={() => onZoneClick?.(zone)}
            />
          </g>
        ))}

        {/* Labels */}
        {showLabels && sortedZones.map(zone => {
          const center = zoneCenters[zone.id];
          if (!center) return null;
          
          return (
            <ZoneLabel
              key={`label-${zone.id}`}
              zone={zone}
              position={center}
              showStats={showStats}
            />
          );
        })}

        {/* Indicadores de ocupação */}
        {showStats && sortedZones
          .filter(z => z.type === 'occupancy' && z.stats?.maxOccupancy)
          .map(zone => {
            const center = zoneCenters[zone.id];
            if (!center) return null;
            
            return (
              <OccupancyIndicator
                key={`occupancy-${zone.id}`}
                zone={zone}
                position={center}
              />
            );
          })}
      </svg>

      {/* Alerta global quando há zona em alerta */}
      {showAlerts && sortedZones.some(z => z.stats?.isAlerted) && (
        <div className="absolute top-2 left-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/90 text-white text-xs font-medium animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          <span>Alerta de Zona Ativo</span>
        </div>
      )}

      {/* Estilos de animação */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

export default ZoneOverlay;
