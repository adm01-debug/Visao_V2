import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Shield,
  Clock,
  Camera,
  ShieldAlert,
  Cog,
  BarChart3,
  Info,
  AlertCircle,
  OctagonAlert,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HighlightText } from './HighlightText';

export type AlertType = 'security' | 'safety' | 'operations' | 'access' | 'analytics' | 'absence' | 'agglomeration' | 'anomaly' | 'panic' | 'arm_disarm' | 'scene_change' | 'camera_offline' | 'recurrent_vehicle' | 'qr_code_event';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface UIAlert {
  id: string;
  cameraId: string;
  cameraName: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  isRead: boolean;
  thumbnail?: string;
}

interface AlertCardProps {
  alert: UIAlert;
  onClick?: () => void;
  searchQuery?: string;
  onCameraClick?: (cameraId: string) => void;
}

const alertTypeConfig: Record<AlertType, { icon: typeof Shield; label: string; color: string }> = {
  security: { icon: Shield, label: 'Segurança', color: 'text-destructive' },
  safety: { icon: AlertTriangle, label: 'Segurança do Trabalho', color: 'text-warning' },
  operations: { icon: Cog, label: 'Operações', color: 'text-success' },
  access: { icon: ShieldAlert, label: 'Acesso', color: 'text-destructive' },
  analytics: { icon: BarChart3, label: 'Analytics', color: 'text-primary' },
  absence: { icon: AlertTriangle, label: 'Ausência', color: 'text-warning' },
  agglomeration: { icon: AlertTriangle, label: 'Aglomeração', color: 'text-warning' },
  anomaly: { icon: ShieldAlert, label: 'Anomalia', color: 'text-destructive' },
  panic: { icon: ShieldAlert, label: 'Pânico', color: 'text-destructive' },
  arm_disarm: { icon: Shield, label: 'Arme/Desarme', color: 'text-primary' },
  scene_change: { icon: AlertTriangle, label: 'Mudança de Cena', color: 'text-warning' },
  camera_offline: { icon: Cog, label: 'Câmera Offline', color: 'text-muted-foreground' },
  recurrent_vehicle: { icon: ShieldAlert, label: 'Veículo Recorrente', color: 'text-warning' },
  qr_code_event: { icon: BarChart3, label: 'QR Code', color: 'text-primary' },
};

const severityConfig = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
  critical: 'alert',
} as const;

const severityLabels: Record<AlertSeverity, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const severityShapes: Record<AlertSeverity, string> = {
  low: '○',      // empty circle
  medium: '◆',   // filled diamond
  high: '▲',     // triangle
  critical: '⬟', // pentagon
};

const severityBorderColors = {
  low: 'border-l-muted-foreground',
  medium: 'border-l-warning',
  high: 'border-l-destructive',
  critical: 'border-l-destructive',
} as const;

export function AlertCard({ alert, onClick, searchQuery = '', onCameraClick }: AlertCardProps) {
  const config = alertTypeConfig[alert.type] || alertTypeConfig.security;
  const Icon = config.icon;

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCameraClick?.(alert.cameraId);
  };

  const severityLabel = severityLabels[alert.severity];
  const severityShape = severityShapes[alert.severity];

  return (
    <article
      className={cn(
        "glass-card p-4 cursor-pointer group",
        "hover:border-primary/50 hover:shadow-lg hover:-translate-y-1",
        !alert.isRead && `border-l-4 ${severityBorderColors[alert.severity]} bg-destructive/5`,
        alert.severity === 'critical' && !alert.isRead && 'alert-critical-pulse border-destructive/50',
        alert.severity === 'high' && !alert.isRead && 'animate-pulse-subtle',
        alert.type === 'panic' && !alert.isRead && 'alert-critical-pulse'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      aria-label={`Alerta ${severityLabel}: ${alert.message}. Câmera: ${alert.cameraName}. ${formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ptBR })}`}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg bg-secondary", config.color)} aria-hidden="true">
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <Badge variant={severityConfig[alert.severity]}>
              <span className="mr-1" aria-hidden="true">{severityShape}</span>
              {config.label}
              <span className="sr-only"> — Severidade {severityLabel}</span>
            </Badge>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Clock className="w-3 h-3" aria-hidden="true" />
              <time dateTime={alert.timestamp.toISOString()}>
                {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ptBR })}
              </time>
            </div>
          </div>

          <p className="text-sm text-foreground mb-2 line-clamp-2">
            <HighlightText text={alert.message} highlight={searchQuery} />
          </p>

          <button
            onClick={handleCameraClick}
            className="flex items-center gap-1 text-muted-foreground text-xs hover:text-primary transition-colors"
            aria-label={`Filtrar alertas da câmera ${alert.cameraName}`}
          >
            <Camera className="w-3 h-3" aria-hidden="true" />
            <HighlightText text={alert.cameraName} highlight={searchQuery} />
          </button>
        </div>
      </div>
      {!alert.isRead && <span className="sr-only">Não lido</span>}
    </article>
  );
}
