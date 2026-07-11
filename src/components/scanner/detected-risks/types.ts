import type { LucideIcon } from 'lucide-react';
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  DoorOpen,
  Footprints,
  ShieldAlert,
} from 'lucide-react';

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';

export type RiskType =
  | 'off_duty_presence'
  | 'loitering'
  | 'break_in_indicator'
  | 'perimeter_breach'
  | 'unknown_face';

export interface DetectedRisk {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  title: string;
  description: string;
  timestamp: string | Date;
  cameraName: string;
  location?: string;
  confidence?: number;
  thumbnailUrl?: string;
}

export const RISK_META: Record<RiskType, { icon: LucideIcon; label: string }> = {
  off_duty_presence: { icon: Clock, label: 'Presença fora de expediente' },
  loitering: { icon: Footprints, label: 'Permanência suspeita' },
  break_in_indicator: { icon: DoorOpen, label: 'Indício de invasão' },
  perimeter_breach: { icon: ShieldAlert, label: 'Violação de perímetro' },
  unknown_face: { icon: AlertTriangle, label: 'Rosto não reconhecido' },
};

export const SEVERITY_STYLES: Record<
  RiskSeverity,
  { border: string; bg: string; text: string; ring: string; label: string }
> = {
  critical: {
    border: 'border-l-severity-critical',
    bg: 'bg-severity-critical/10',
    text: 'text-severity-critical',
    ring: 'ring-severity-critical/30',
    label: 'Crítico',
  },
  high: {
    border: 'border-l-severity-high',
    bg: 'bg-severity-high/10',
    text: 'text-severity-high',
    ring: 'ring-severity-high/30',
    label: 'Alto',
  },
  medium: {
    border: 'border-l-severity-medium',
    bg: 'bg-severity-medium/10',
    text: 'text-severity-medium',
    ring: 'ring-severity-medium/30',
    label: 'Médio',
  },
  low: {
    border: 'border-l-severity-low',
    bg: 'bg-severity-low/10',
    text: 'text-severity-low',
    ring: 'ring-severity-low/30',
    label: 'Baixo',
  },
};

export const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const EMPTY_ICON = AlertOctagon;

export function toDate(t: string | Date): Date {
  return typeof t === 'string' ? new Date(t) : t;
}

export function sortRisks(risks: DetectedRisk[]): DetectedRisk[] {
  return [...risks].sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    return toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime();
  });
}

export function countBySeverity(risks: DetectedRisk[]): Record<RiskSeverity, number> {
  return risks.reduce(
    (acc, r) => {
      acc[r.severity]++;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 } as Record<RiskSeverity, number>,
  );
}
