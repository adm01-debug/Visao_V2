import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Users,
  ArrowLeftRight,
  Timer,
  MapPin,
  Target,
} from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

export type ZoneType = 'restricted' | 'counting' | 'tripwire' | 'dwell' | 'occupancy' | 'parking' | 'queue' | 'safety' | 'custom';
export type DbZone = Tables<'zones'>;
export type DbZoneEvent = Tables<'zone_events'>;

export interface ZonePointsData {
  shape: 'rectangle' | 'polygon' | 'line';
  coordinates: { x: number; y: number }[];
  opacity?: number;
  config?: Record<string, any>;
}

export interface ZoneStats {
  currentOccupancy: number;
  countIn: number;
  countOut: number;
  avgDwellTime: number;
  alertsToday: number;
  lastEvent?: string;
}

export interface ZoneEvent extends DbZoneEvent {
  zone_name?: string;
}

export interface ZoneFormData {
  name: string;
  type: ZoneType;
  color: string;
  is_active: boolean;
  pointsData: ZonePointsData | null;
}

export const zoneTypeConfig: Record<ZoneType, {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description: string;
}> = {
  restricted: { label: 'Área Restrita', icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive', description: 'Alerta quando alguém entra na área' },
  counting: { label: 'Contagem', icon: Users, color: 'text-primary', bgColor: 'bg-primary', description: 'Conta pessoas entrando e saindo' },
  tripwire: { label: 'Linha de Contagem', icon: ArrowLeftRight, color: 'text-primary', bgColor: 'bg-primary', description: 'Conta pessoas cruzando uma linha' },
  dwell: { label: 'Tempo de Permanência', icon: Timer, color: 'text-warning', bgColor: 'bg-warning', description: 'Monitora tempo na área' },
  occupancy: { label: 'Ocupação', icon: Users, color: 'text-success', bgColor: 'bg-success', description: 'Controla capacidade máxima' },
  parking: { label: 'Estacionamento', icon: MapPin, color: 'text-primary', bgColor: 'bg-primary', description: 'Monitora vagas de estacionamento' },
  queue: { label: 'Fila', icon: Users, color: 'text-warning', bgColor: 'bg-warning', description: 'Monitora filas e tempo de espera' },
  safety: { label: 'Segurança', icon: AlertTriangle, color: 'text-warning', bgColor: 'bg-warning', description: 'Área de segurança do trabalho' },
  custom: { label: 'Personalizada', icon: Target, color: 'text-muted-foreground', bgColor: 'bg-muted-foreground', description: 'Configuração personalizada' },
};

export { ZONE_COLORS as defaultColors } from '@/constants/chartColors';

export function parsePointsData(points: unknown): ZonePointsData | null {
  if (!points) return null;
  try {
    if (typeof points === 'string') return JSON.parse(points);
    return points as ZonePointsData;
  } catch {
    return null;
  }
}
