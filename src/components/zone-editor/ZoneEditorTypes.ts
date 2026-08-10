export type DrawingMode = 'select' | 'rectangle' | 'polygon' | 'line';
export type Point = { x: number; y: number };

export interface ZoneGeometry {
  shape: 'polygon' | 'rectangle' | 'line';
  points: Point[];
}

export interface Zone {
  id: string;
  name: string;
  geometry: ZoneGeometry;
  color: string;
  opacity: number;
}

export interface ZoneEditorProps {
  existingZones?: Zone[];
  onZoneCreated?: (zone: Partial<Zone>) => void;
  onZoneUpdated?: (zone: Zone) => void;
  onZoneDeleted?: (zoneId: string) => void;
  selectedColor?: string;
  drawingMode?: DrawingMode;
  className?: string;
  readOnly?: boolean;
}

export function calculateArrowPoints(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const arrowSize = 1.5;

  const p1x = midX + arrowSize * Math.cos(angle);
  const p1y = midY + arrowSize * Math.sin(angle);
  const p2x = midX + arrowSize * Math.cos(angle + 2.5);
  const p2y = midY + arrowSize * Math.sin(angle + 2.5);
  const p3x = midX + arrowSize * Math.cos(angle - 2.5);
  const p3y = midY + arrowSize * Math.sin(angle - 2.5);

  return `${p1x}%,${p1y}% ${p2x}%,${p2y}% ${p3x}%,${p3y}%`;
}
