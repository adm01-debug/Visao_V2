/**
 * VISÃO - Detected Risks Results Card
 *
 * Apresenta riscos detectados pelo scanner (presença fora de expediente,
 * loitering, indicadores de invasão) com severidade, timestamp e contexto.
 *
 * Usa tokens semânticos (severity-critical/high/medium/low) — sem cores
 * hardcoded. Acessível: cada risco tem ícone + texto (color-blind safe).
 */
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  DoorOpen,
  Footprints,
  MapPin,
  ShieldAlert,
  Video,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  confidence?: number; // 0-1
  thumbnailUrl?: string;
}

interface DetectedRisksCardProps {
  risks: DetectedRisk[];
  onViewDetails?: (risk: DetectedRisk) => void;
  onViewCamera?: (risk: DetectedRisk) => void;
  className?: string;
  title?: string;
}

const RISK_META: Record<
  RiskType,
  { icon: typeof AlertOctagon; label: string }
> = {
  off_duty_presence: { icon: Clock, label: 'Presença fora de expediente' },
  loitering: { icon: Footprints, label: 'Permanência suspeita' },
  break_in_indicator: { icon: DoorOpen, label: 'Indício de invasão' },
  perimeter_breach: { icon: ShieldAlert, label: 'Violação de perímetro' },
  unknown_face: { icon: AlertTriangle, label: 'Rosto não reconhecido' },
};

// Border + accent classes per severity (uses semantic tokens)
const SEVERITY_STYLES: Record<
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

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function RiskRow({
  risk,
  onViewDetails,
  onViewCamera,
}: {
  risk: DetectedRisk;
  onViewDetails?: (r: DetectedRisk) => void;
  onViewCamera?: (r: DetectedRisk) => void;
}) {
  const meta = RISK_META[risk.type];
  const style = SEVERITY_STYLES[risk.severity];
  const Icon = meta.icon;
  const ts = typeof risk.timestamp === 'string' ? new Date(risk.timestamp) : risk.timestamp;
  const isCritical = risk.severity === 'critical';

  return (
    <article
      className={cn(
        'group relative rounded-lg border bg-card transition-all',
        'border-l-4 hover:shadow-md',
        style.border,
        isCritical && 'alert-critical-pulse',
      )}
      aria-label={`Risco ${style.label}: ${risk.title}`}
    >
      <div className="flex gap-3 p-4">
        {/* Icon column */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            style.bg,
            style.text,
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Header: title + severity badge */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight text-foreground">
                {risk.title}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{meta.label}</p>
            </div>
            <Badge
              className={cn(
                'shrink-0 border-0 font-medium',
                style.bg,
                style.text,
              )}
              variant="secondary"
            >
              {style.label}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {risk.description}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1" title={format(ts, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}>
              <Clock className="h-3 w-3" aria-hidden />
              <time dateTime={ts.toISOString()}>
                {formatDistanceToNow(ts, { locale: ptBR, addSuffix: true })}
              </time>
              <span className="text-muted-foreground/60">
                · {format(ts, 'HH:mm', { locale: ptBR })}
              </span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Video className="h-3 w-3" aria-hidden />
              <span className="truncate max-w-[180px]">{risk.cameraName}</span>
            </span>
            {risk.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden />
                <span className="truncate max-w-[160px]">{risk.location}</span>
              </span>
            )}
            {typeof risk.confidence === 'number' && (
              <span className="inline-flex items-center gap-1">
                <span className="font-mono">
                  {Math.round(risk.confidence * 100)}%
                </span>
                <span className="text-muted-foreground/60">conf.</span>
              </span>
            )}
          </div>

          {/* Actions */}
          {(onViewDetails || onViewCamera) && (
            <div className="mt-1 flex flex-wrap gap-2">
              {onViewDetails && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onViewDetails(risk)}
                >
                  Ver detalhes
                </Button>
              )}
              {onViewCamera && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onViewCamera(risk)}
                >
                  <Video className="mr-1 h-3 w-3" aria-hidden />
                  Abrir câmera
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Optional thumbnail */}
        {risk.thumbnailUrl && (
          <div className="hidden sm:block">
            <div className={cn('h-20 w-28 overflow-hidden rounded-md ring-1', style.ring)}>
              <img
                src={risk.thumbnailUrl}
                alt={`Captura de ${risk.cameraName}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function DetectedRisksCard({
  risks,
  onViewDetails,
  onViewCamera,
  className,
  title = 'Riscos Detectados',
}: DetectedRisksCardProps) {
  const sorted = [...risks].sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    const at = typeof a.timestamp === 'string' ? new Date(a.timestamp) : a.timestamp;
    const bt = typeof b.timestamp === 'string' ? new Date(b.timestamp) : b.timestamp;
    return bt.getTime() - at.getTime();
  });

  const counts = risks.reduce(
    (acc, r) => {
      acc[r.severity]++;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 } as Record<RiskSeverity, number>,
  );

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border bg-muted/30 py-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" aria-hidden />
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary" className="ml-1 text-xs">
            {risks.length}
          </Badge>
        </div>
        {/* Severity counters */}
        <div className="flex items-center gap-1.5 text-xs">
          {(['critical', 'high', 'medium', 'low'] as RiskSeverity[]).map((sev) => {
            const c = counts[sev];
            if (c === 0) return null;
            const s = SEVERITY_STYLES[sev];
            return (
              <span
                key={sev}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                  s.bg,
                  s.text,
                )}
                title={`${c} ${s.label.toLowerCase()}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                {c}
              </span>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        {sorted.length === 0 ? (
          <div className="py-10 text-center" role="status">
            <AlertOctagon className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
            <p className="mt-2 text-sm font-medium text-foreground">
              Nenhum risco detectado
            </p>
            <p className="text-xs text-muted-foreground">
              O scanner não identificou ameaças no último ciclo.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {sorted.map((risk) => (
              <li key={risk.id}>
                <RiskRow
                  risk={risk}
                  onViewDetails={onViewDetails}
                  onViewCamera={onViewCamera}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default DetectedRisksCard;
