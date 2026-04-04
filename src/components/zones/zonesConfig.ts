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
  restricted: { label: 'Área Restrita', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500', description: 'Alerta quando alguém entra na área' },
  counting: { label: 'Contagem', icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500', description: 'Conta pessoas entrando e saindo' },
  tripwire: { label: 'Linha de Contagem', icon: ArrowLeftRight, color: 'text-purple-500', bgColor: 'bg-purple-500', description: 'Conta pessoas cruzando uma linha' },
  dwell: { label: 'Tempo de Permanência', icon: Timer, color: 'text-orange-500', bgColor: 'bg-orange-500', description: 'Monitora tempo na área' },
  occupancy: { label: 'Ocupação', icon: Users, color: 'text-green-500', bgColor: 'bg-green-500', description: 'Controla capacidade máxima' },
  parking: { label: 'Estacionamento', icon: MapPin, color: 'text-cyan-500', bgColor: 'bg-cyan-500', description: 'Monitora vagas de estacionamento' },
  queue: { label: 'Fila', icon: Users, color: 'text-yellow-500', bgColor: 'bg-yellow-500', description: 'Monitora filas e tempo de espera' },
  safety: { label: 'Segurança', icon: AlertTriangle, color: 'text-amber-500', bgColor: 'bg-amber-500', description: 'Área de segurança do trabalho' },
  custom: { label: 'Personalizada', icon: Target, color: 'text-gray-500', bgColor: 'bg-gray-500', description: 'Configuração personalizada' },
};

export const defaultColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

export function parsePointsData(points: unknown): ZonePointsData | null {
  if (!points) return null;
  try {
    if (typeof points === 'string') return JSON.parse(points);
    return points as ZonePointsData;
  } catch {
    return null;
  }
}
