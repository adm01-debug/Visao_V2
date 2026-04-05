import {
  Users, AlertTriangle, ArrowRight, Timer, Ban, CheckCircle,
} from 'lucide-react';

export type ZoneType = 'restricted' | 'counting' | 'tripwire' | 'dwell' | 'occupancy' | 'parking' | 'queue' | 'safety' | 'custom';

export interface Point {
  x: number;
  y: number;
}

export interface ZoneGeometry {
  shape: 'polygon' | 'rectangle' | 'line' | 'circle';
  points: Point[];
}

export interface ZoneStats {
  currentOccupancy: number;
  countIn: number;
  countOut: number;
  maxOccupancy?: number;
  avgDwellTime?: number;
  isAlerted?: boolean;
}

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  geometry: ZoneGeometry;
  color: string;
  opacity: number;
  enabled: boolean;
  stats?: ZoneStats;
}

export interface ZoneOverlayProps {
  zones: Zone[];
  showLabels?: boolean;
  showStats?: boolean;
  showAlerts?: boolean;
  animateAlerts?: boolean;
  className?: string;
  onZoneClick?: (zone: Zone) => void;
}

export const zoneTypeIcons: Record<ZoneType, React.ComponentType<{ className?: string }>> = {
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
