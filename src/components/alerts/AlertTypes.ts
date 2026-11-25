import {
  Shield,
  AlertTriangle,
  Eye,
  Camera,
  Zap,
  UserX,
  Users,
  Activity,
  Siren,
  Power,
  RefreshCw,
  Wifi,
  Car,
  QrCode,
} from 'lucide-react';

export type ViewMode = 'grid' | 'list' | 'timeline';
export type SortOption = 'date-desc' | 'date-asc' | 'severity-desc' | 'severity-asc';

export interface AlertFilters {
  search: string;
  type: string;
  severity: string;
  cameraId: string;
  dateRange: string;
  readStatus: 'all' | 'read' | 'unread';
  [key: string]: unknown;
}

export const defaultFilters: AlertFilters = {
  search: '',
  type: 'all',
  severity: 'all',
  cameraId: 'all',
  dateRange: 'all',
  readStatus: 'all',
};

export const severityConfig = {
  critical: {
    color: 'bg-[hsl(var(--severity-critical))]',
    textColor: 'text-[hsl(var(--severity-critical-soft))]',
    bgLight: 'bg-[hsl(var(--severity-critical)/0.12)]',
    borderColor: 'border-[hsl(var(--severity-critical)/0.3)]',
    label: 'Crítico',
    order: 4,
  },
  high: {
    color: 'bg-[hsl(var(--severity-high))]',
    textColor: 'text-[hsl(var(--severity-high))]',
    bgLight: 'bg-[hsl(var(--severity-high)/0.12)]',
    borderColor: 'border-[hsl(var(--severity-high)/0.3)]',
    label: 'Alto',
    order: 3,
  },
  medium: {
    color: 'bg-[hsl(var(--severity-medium))]',
    textColor: 'text-[hsl(var(--severity-medium))]',
    bgLight: 'bg-[hsl(var(--severity-medium)/0.12)]',
    borderColor: 'border-[hsl(var(--severity-medium)/0.3)]',
    label: 'Médio',
    order: 2,
  },
  low: {
    color: 'bg-[hsl(var(--severity-low))]',
    textColor: 'text-[hsl(var(--severity-low))]',
    bgLight: 'bg-[hsl(var(--severity-low)/0.12)]',
    borderColor: 'border-[hsl(var(--severity-low)/0.3)]',
    label: 'Baixo',
    order: 1,
  },
} as const;

export const typeConfig = {
  security: { icon: Shield, label: 'Segurança', color: 'text-destructive-soft' },
  productivity: { icon: Zap, label: 'Produtividade', color: 'text-primary' },
  safety: { icon: AlertTriangle, label: 'Segurança do Trabalho', color: 'text-warning' },
  intrusion: { icon: Eye, label: 'Intrusão', color: 'text-destructive-soft' },
  zone: { icon: Camera, label: 'Zona', color: 'text-primary' },
  face: { icon: Eye, label: 'Reconhecimento', color: 'text-primary' },
  operations: { icon: Activity, label: 'Operações', color: 'text-warning' },
  access: { icon: UserX, label: 'Acesso', color: 'text-destructive-soft' },
  analytics: { icon: Activity, label: 'Análise', color: 'text-primary' },
  absence: { icon: UserX, label: 'Ausência', color: 'text-warning' },
  agglomeration: { icon: Users, label: 'Aglomeração', color: 'text-warning' },
  anomaly: { icon: Activity, label: 'Anomalia', color: 'text-destructive-soft' },
  panic: { icon: Siren, label: 'Pânico', color: 'text-destructive-soft' },
  arm_disarm: { icon: Power, label: 'Arme/Desarme', color: 'text-primary' },
  scene_change: { icon: RefreshCw, label: 'Mudança de Cena', color: 'text-warning' },
  camera_offline: { icon: Wifi, label: 'Câmera Offline', color: 'text-muted-foreground' },
  recurrent_vehicle: { icon: Car, label: 'Veículo Recorrente', color: 'text-warning' },
  qr_code_event: { icon: QrCode, label: 'QR Code', color: 'text-primary' },
} as const;

export interface AlertRecord {
  id: string;
  severity: string;
  type: string;
  timestamp: string;
  is_read: boolean;
  message: string;
  camera_name: string;
  thumbnail?: string | null;
  [key: string]: unknown;
}
