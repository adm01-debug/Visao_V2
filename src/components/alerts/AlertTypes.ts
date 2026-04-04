import { Shield, AlertTriangle, Eye, Camera, Zap } from 'lucide-react';

export type ViewMode = 'grid' | 'list' | 'timeline';
export type SortOption = 'date-desc' | 'date-asc' | 'severity-desc' | 'severity-asc';

export interface AlertFilters {
  search: string;
  type: string;
  severity: string;
  cameraId: string;
  dateRange: string;
  readStatus: 'all' | 'read' | 'unread';
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
  critical: { color: 'bg-red-500', label: 'Crítico', order: 4 },
  high: { color: 'bg-orange-500', label: 'Alto', order: 3 },
  medium: { color: 'bg-yellow-500', label: 'Médio', order: 2 },
  low: { color: 'bg-blue-500', label: 'Baixo', order: 1 },
} as const;

export const typeConfig = {
  security: { icon: Shield, label: 'Segurança', color: 'text-red-500' },
  productivity: { icon: Zap, label: 'Produtividade', color: 'text-blue-500' },
  safety: { icon: AlertTriangle, label: 'Segurança do Trabalho', color: 'text-orange-500' },
  intrusion: { icon: Eye, label: 'Intrusão', color: 'text-purple-500' },
  zone: { icon: Camera, label: 'Zona', color: 'text-green-500' },
  face: { icon: Eye, label: 'Reconhecimento', color: 'text-pink-500' },
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
