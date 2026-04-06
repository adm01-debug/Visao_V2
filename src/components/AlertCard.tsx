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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  safety: { icon: AlertTriangle, label: 'Seg. Trabalho', color: 'text-warning' },
  operations: { icon: Cog, label: 'Operações', color: 'text-primary' },
  access: { icon: ShieldAlert, label: 'Acesso', color: 'text-destructive' },
  analytics: { icon: BarChart3, label: 'Analytics', color: 'text-primary' },
  absence: { icon: AlertTriangle, label: 'Ausência', color: 'text-warning' },
  agglomeration: { icon: AlertTriangle, label: 'Aglomeração', color: 'text-warning' },
  anomaly: { icon: ShieldAlert, label: 'Anomalia', color: 'text-destructive' },
  panic: { icon: ShieldAlert, label: 'Pânico', color: 'text-destructive' },
  arm_disarm: { icon: Shield, label: 'Arme/Desarme', color: 'text-primary' },
  scene_change: { icon: AlertTriangle, label: 'Mudança Cena', color: 'text-warning' },
  camera_offline: { icon: Cog, label: 'Cam. Offline', color: 'text-muted-foreground' },
  recurrent_vehicle: { icon: ShieldAlert, label: 'Veíc. Recorrente', color: 'text-warning' },
  qr_code_event: { icon: BarChart3, label: 'QR Code', color: 'text-primary' },
};

const severityLabels: Record<AlertSeverity, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const severityIcons: Record<AlertSeverity, typeof Info> = {
  low: Info,
  medium: AlertCircle,
  high: AlertTriangle,
  critical: Flame,
};

const severityTooltips: Record<AlertSeverity, string> = {
  low: 'Severidade Baixa — Evento informativo, sem risco imediato',
  medium: 'Severidade Média — Situação que requer monitoramento',
  high: 'Severidade Alta — Ação necessária em breve',
  critical: 'Severidade Crítica — Requer atenção imediata!',
};

const severityBorderColors: Record<AlertSeverity, string> = {
  low: 'border-l-muted-foreground/40',
  medium: 'border-l-warning/60',
  high: 'border-l-destructive/70',
  critical: 'border-l-destructive',
};

const severityBadgeStyles: Record<AlertSeverity, string> = {
  low: 'bg-muted/60 text-muted-foreground border-border/40',
  medium: 'bg-warning/10 text-warning border-warning/20',
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  critical: 'bg-destructive/15 text-destructive border-destructive/30 font-bold',
};

const typeIconBg: Record<string, string> = {
  'text-destructive': 'bg-destructive/8',
  'text-warning': 'bg-warning/8',
  'text-primary': 'bg-primary/8',
  'text-muted-foreground': 'bg-muted/60',
};

export function AlertCard({ alert, onClick, searchQuery = '', onCameraClick }: AlertCardProps) {
  const config = alertTypeConfig[alert.type] || alertTypeConfig.security;
  const Icon = config.icon;
  const SeverityIcon = severityIcons[alert.severity];
  const severityLabel = severityLabels[alert.severity];

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCameraClick?.(alert.cameraId);
  };

  return (
    <article
      className={cn(
        "relative rounded-xl border border-border/40 bg-card p-4 cursor-pointer group overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:border-border/80 hover:-translate-y-1 hover:shadow-[var(--shadow-card-glow)]",
        "active:scale-[0.98] active:translate-y-0",
        !alert.isRead && `border-l-[3px] ${severityBorderColors[alert.severity]}`,
        alert.isRead && 'opacity-65 hover:opacity-90',
        alert.severity === 'critical' && !alert.isRead && 'alert-critical-pulse border-destructive/30',
        alert.type === 'panic' && !alert.isRead && 'alert-critical-pulse'
      )}
      onClick={onClick}
      style={{ boxShadow: 'var(--shadow-card)' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      aria-label={`Alerta ${severityLabel}: ${alert.message}. Câmera: ${alert.cameraName}. ${formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ptBR })}`}
    >
      {/* Hover glow radial */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 0% 50%, hsl(var(--primary) / 0.06), transparent 70%)` }}
      />

      <div className="relative z-10 flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-xl shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
          typeIconBg[config.color] || 'bg-muted/40', config.color
        )} aria-hidden="true">
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("gap-1 cursor-default text-[10px] px-2 py-0.5", severityBadgeStyles[alert.severity])}>
                  <SeverityIcon className="w-3 h-3" aria-hidden="true" />
                  {config.label}
                  <span className="sr-only"> — Severidade {severityLabel}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px] text-center">
                <p className="text-xs font-medium">{severityTooltips[alert.severity]}</p>
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-1 text-muted-foreground text-[11px] shrink-0">
              <Clock className="w-3 h-3" aria-hidden="true" />
              <time dateTime={alert.timestamp.toISOString()}>
                {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ptBR })}
              </time>
            </div>
          </div>

          <p className={cn("text-sm mb-2 line-clamp-2", !alert.isRead ? 'text-foreground font-medium' : 'text-muted-foreground')}>
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
