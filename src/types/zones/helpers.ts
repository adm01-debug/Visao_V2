/**
 * VISÃO - Zone Geometry Helpers
 */

import { ZONE_COLORS } from '@/constants/chartColors';
import type { Point, Zone, ZoneType } from './types';

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i]!, pj = polygon[j]!;
    if (((pi.y > point.y) !== (pj.y > point.y)) &&
        (point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x)) {
      inside = !inside;
    }
  }
  return inside;
}

export function isBoxInZone(
  box: { x: number; y: number; width: number; height: number },
  zone: Zone,
  _minOverlap: number = 0.3
): boolean {
  const boxCenter: Point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  if (zone.geometry.shape === 'polygon' || zone.geometry.shape === 'rectangle') {
    return isPointInPolygon(boxCenter, zone.geometry.points);
  }
  if (zone.geometry.shape === 'circle' && zone.geometry.center && zone.geometry.radius) {
    const dx = boxCenter.x - zone.geometry.center.x;
    const dy = boxCenter.y - zone.geometry.center.y;
    return Math.sqrt(dx * dx + dy * dy) <= zone.geometry.radius;
  }
  return false;
}

export function calculatePolygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const pi = points[i]!, pj = points[j]!;
    area += pi.x * pj.y - pj.x * pi.y;
  }
  return Math.abs(area / 2);
}

function direction(a: Point, b: Point, c: Point): number {
  return (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y);
}

export function didCrossLine(
  prevPos: Point, currPos: Point, lineStart: Point, lineEnd: Point
): { crossed: boolean; direction: string } {
  const d1 = direction(lineStart, lineEnd, prevPos);
  const d2 = direction(lineStart, lineEnd, currPos);
  const d3 = direction(prevPos, currPos, lineStart);
  const d4 = direction(prevPos, currPos, lineEnd);
  const crossed = ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
                  ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  let dir = 'unknown';
  if (crossed) {
    const dx = currPos.x - prevPos.x;
    const dy = currPos.y - prevPos.y;
    dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'left-to-right' : 'right-to-left')
      : (dy > 0 ? 'top-to-bottom' : 'bottom-to-top');
  }
  return { crossed, direction: dir };
}

export function generateZoneColor(): string {
  return ZONE_COLORS[Math.floor(Math.random() * ZONE_COLORS.length)] ?? ZONE_COLORS[0];
}

export function getZoneTypeLabel(type: ZoneType): string {
  const labels: Record<ZoneType, string> = {
    restricted: 'Área Restrita', counting: 'Contagem', tripwire: 'Linha de Cruzamento',
    dwell: 'Tempo de Permanência', occupancy: 'Ocupação', parking: 'Estacionamento',
    queue: 'Fila', safety: 'Segurança/EPI', custom: 'Personalizada',
  };
  return labels[type];
}
