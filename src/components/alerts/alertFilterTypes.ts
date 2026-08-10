/**
 * VISÃO - Alert Filter Types & Constants
 */
import { Info, AlertCircle, AlertTriangle, Flame, Gauge } from 'lucide-react';

export type AlertType =
  | 'security'
  | 'safety'
  | 'operations'
  | 'access'
  | 'analytics'
  | 'absence'
  | 'agglomeration'
  | 'anomaly'
  | 'panic'
  | 'arm_disarm'
  | 'scene_change'
  | 'camera_offline'
  | 'recurrent_vehicle'
  | 'qr_code_event'
  | 'all';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical' | 'all';
export type DateRange = 'all' | '1h' | '24h' | '7d' | '30d' | 'custom';

export interface CameraOption {
  id: string;
  name: string;
}

export interface AlertFilters {
  type: AlertType;
  severity: AlertSeverity;
  dateRange: DateRange;
  customDateStart: Date | undefined;
  customDateEnd: Date | undefined;
  cameraId: string;
}

export const defaultFilters: AlertFilters = {
  type: 'all',
  severity: 'all',
  dateRange: 'all',
  cameraId: 'all',
  customDateStart: undefined,
  customDateEnd: undefined,
};

export const TYPE_LABELS: Record<AlertType, string> = {
  all: 'Todos os tipos',
  security: 'Segurança',
  safety: 'EPI',
  operations: 'Operações',
  access: 'Acesso',
  analytics: 'Analytics',
  absence: 'Ausência',
  agglomeration: 'Aglomeração',
  anomaly: 'Anomalia',
  panic: 'Pânico',
  arm_disarm: 'Arme/Desarme',
  scene_change: 'Mudança de Cena',
  camera_offline: 'Câmera Offline',
  recurrent_vehicle: 'Veículo Recorrente',
  qr_code_event: 'QR Code',
};

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  all: 'Todas',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: 'Todo o período',
  '1h': 'Última hora',
  '24h': 'Últimas 24h',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  custom: 'Personalizado',
};

export const SEVERITY_BUTTON_OPTIONS: {
  value: AlertSeverity;
  label: string;
  icon: typeof Info;
  activeClass: string;
  tooltip: string;
}[] = [
  {
    value: 'all',
    label: 'Todas',
    icon: Gauge,
    activeClass: 'border-primary bg-primary/15 text-primary',
    tooltip: 'Exibir alertas de todas as severidades',
  },
  {
    value: 'low',
    label: 'Baixa',
    icon: Info,
    activeClass: 'border-muted-foreground bg-muted-foreground/15 text-muted-foreground',
    tooltip: 'Evento informativo, sem risco imediato',
  },
  {
    value: 'medium',
    label: 'Média',
    icon: AlertCircle,
    activeClass: 'border-warning bg-warning/15 text-warning',
    tooltip: 'Situação que requer monitoramento',
  },
  {
    value: 'high',
    label: 'Alta',
    icon: AlertTriangle,
    activeClass: 'border-destructive bg-destructive/15 text-destructive',
    tooltip: 'Ação necessária em breve',
  },
  {
    value: 'critical',
    label: 'Crítica',
    icon: Flame,
    activeClass: 'border-destructive bg-destructive/20 text-destructive font-bold',
    tooltip: 'Requer atenção imediata!',
  },
];
