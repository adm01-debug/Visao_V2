/**
 * VISÃO - ZoneOverlay (Refactored)
 * Types extracted to ./zone-overlay/zoneOverlayTypes.ts
 */
import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Zone, Point, ZoneOverlayProps } from './zone-overlay/zoneOverlayTypes';
import { zoneTypeIcons } from './zone-overlay/zoneOverlayTypes';

// Re-export types
export type { Zone, Point, ZoneOverlayProps };
export type { ZoneType, ZoneGeometry, ZoneStats } from './zone-overlay/zoneOverlayTypes';

function ZoneLabel({ zone, position, showStats }: { zone: Zone; position: Point; showStats: boolean }) {
  const Icon = zoneTypeIcons[zone.type];
  const isAlerted = zone.stats?.isAlerted;
  const occupancyPercent = zone.stats?.maxOccupancy ? Math.round((zone.stats.currentOccupancy / zone.stats.maxOccupancy) * 100) : null;
  const isOverCapacity = occupancyPercent !== null && occupancyPercent >= 100;

  return (
    <g>
      <foreignObject x={`${position.x - 5}%`} y={`${position.y - 3}%`} width="10%" height="6%" className="overflow-visible">
        <div className={cn('flex flex-col items-center justify-center px-2 py-1 rounded text-foreground text-[10px] font-medium whitespace-nowrap bg-foreground/70 backdrop-blur-sm', isAlerted && 'animate-pulse bg-destructive/90')}>
          <div className="flex items-center gap-1"><Icon className="w-3 h-3" /><span className="truncate max-w-[60px]">{zone.name}</span></div>
          {showStats && zone.stats && (
            <div className="flex items-center gap-2 mt-0.5 text-[9px] opacity-90">
              {(zone.type === 'counting' || zone.type === 'occupancy') && (
                <><span className="text-success">↑{zone.stats.countIn}</span><span className="text-destructive">↓{zone.stats.countOut}</span><span className={cn(isOverCapacity && 'text-destructive font-bold')}>={zone.stats.currentOccupancy}</span></>
              )}
              {zone.type === 'dwell' && zone.stats.avgDwellTime && <span>{Math.round(zone.stats.avgDwellTime)}s</span>}
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

function ZoneShape({ zone, animate, onClick }: { zone: Zone; animate: boolean; onClick?: () => void }) {
  const isAlerted = zone.stats?.isAlerted;
  const { geometry, color, opacity } = zone;
  const alertAnimation = isAlerted && animate ? { animation: 'pulse 1s ease-in-out infinite' } : {};

  if (geometry.shape === 'line') {
    const start = geometry.points[0]; const end = geometry.points[1];
    if (!start || !end) return null;
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
    const midX = (start.x + end.x) / 2; const midY = (start.y + end.y) / 2;
    return (
      <g className="pointer-events-auto cursor-pointer" onClick={onClick}>
        <line x1={`${start.x}%`} y1={`${start.y}%`} x2={`${end.x}%`} y2={`${end.y}%`} stroke={color} strokeWidth={isAlerted ? 4 : 3} strokeDasharray="10,5" style={alertAnimation} />
        <g transform={`translate(${midX}%, ${midY}%) rotate(${angle})`}><polygon points="0,-4 8,0 0,4" fill={color} transform="translate(-4, 0)" /></g>
        <circle cx={`${start.x}%`} cy={`${start.y}%`} r="5" fill={color} />
        <circle cx={`${end.x}%`} cy={`${end.y}%`} r="5" fill={color} />
        {isAlerted && <line x1={`${start.x}%`} y1={`${start.y}%`} x2={`${end.x}%`} y2={`${end.y}%`} stroke={color} strokeWidth="10" strokeOpacity="0.3" style={alertAnimation} />}
      </g>
    );
  }

  if (geometry.shape === 'circle' && geometry.points.length >= 2) {
    const center = geometry.points[0]!; const edge = geometry.points[1]!;
    const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
    return (
      <g className="pointer-events-auto cursor-pointer" onClick={onClick}>
        <circle cx={`${center.x}%`} cy={`${center.y}%`} r={`${radius}%`} fill={color} fillOpacity={opacity} stroke={color} strokeWidth={isAlerted ? 3 : 2} style={alertAnimation} />
        {isAlerted && <circle cx={`${center.x}%`} cy={`${center.y}%`} r={`${radius + 1}%`} fill="none" stroke={color} strokeWidth="6" strokeOpacity="0.3" style={alertAnimation} />}
      </g>
    );
  }

  return (
    <g className="pointer-events-auto cursor-pointer" onClick={onClick}>
      <polygon points={geometry.points.map(p => `${p.x}%,${p.y}%`).join(' ')} fill={color} fillOpacity={opacity} stroke={color} strokeWidth={isAlerted ? 3 : 2} style={alertAnimation} />
      {isAlerted && <polygon points={geometry.points.map(p => `${p.x}%,${p.y}%`).join(' ')} fill="none" stroke={color} strokeWidth="8" strokeOpacity="0.3" style={alertAnimation} />}
    </g>
  );
}

function OccupancyIndicator({ zone, position }: { zone: Zone; position: Point }) {
  if (!zone.stats?.maxOccupancy) return null;
  const { currentOccupancy, maxOccupancy } = zone.stats;
  const percent = Math.min(100, Math.round((currentOccupancy / maxOccupancy) * 100));
  const isOver = percent >= 100; const isNear = percent >= 80;
  return (
    <foreignObject x={`${position.x - 4}%`} y={`${position.y + 4}%`} width="8%" height="3%" className="overflow-visible">
      <div className="flex flex-col items-center">
        <div className="w-full h-1.5 bg-foreground/50 rounded-full overflow-hidden">
          <div className={cn('h-full transition-all duration-300', isOver ? 'bg-destructive' : isNear ? 'bg-warning' : 'bg-success')} style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
        <span className={cn('text-[9px] font-medium mt-0.5', isOver ? 'text-destructive' : isNear ? 'text-warning' : 'text-success')}>{currentOccupancy}/{maxOccupancy}</span>
      </div>
    </foreignObject>
  );
}

export function ZoneOverlay({ zones, showLabels = true, showStats = true, showAlerts = true, animateAlerts = true, className, onZoneClick }: ZoneOverlayProps) {
  const activeZones = useMemo(() => zones.filter(z => z.enabled && z.geometry.points.length >= 2), [zones]);
  const zoneCenters = useMemo(() => {
    const centers: Record<string, Point> = {};
    activeZones.forEach(zone => { const pts = zone.geometry.points; if (pts.length === 0) return; centers[zone.id] = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length }; });
    return centers;
  }, [activeZones]);
  const sortedZones = useMemo(() => [...activeZones].sort((a, b) => (a.stats?.isAlerted ? 1 : 0) - (b.stats?.isAlerted ? 1 : 0)), [activeZones]);

  if (sortedZones.length === 0) return null;

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      <svg className="absolute inset-0 w-full h-full">
        <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {sortedZones.map(zone => <g key={zone.id}><ZoneShape zone={zone} animate={animateAlerts} onClick={() => onZoneClick?.(zone)} /></g>)}
        {showLabels && sortedZones.map(zone => { const c = zoneCenters[zone.id]; return c ? <ZoneLabel key={`label-${zone.id}`} zone={zone} position={c} showStats={showStats} /> : null; })}
        {showStats && sortedZones.filter(z => z.type === 'occupancy' && z.stats?.maxOccupancy).map(zone => { const c = zoneCenters[zone.id]; return c ? <OccupancyIndicator key={`occ-${zone.id}`} zone={zone} position={c} /> : null; })}
      </svg>
      {showAlerts && sortedZones.some(z => z.stats?.isAlerted) && (
        <div className="absolute top-2 left-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/90 text-foreground text-xs font-medium animate-pulse"><AlertTriangle className="w-4 h-4" /><span>Alerta de Zona Ativo</span></div>
      )}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
    </div>
  );
}

export default ZoneOverlay;
