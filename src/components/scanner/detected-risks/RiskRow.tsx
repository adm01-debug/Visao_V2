import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RISK_META, SEVERITY_STYLES, toDate, type DetectedRisk } from './types';

interface RiskRowProps {
  risk: DetectedRisk;
  onViewDetails?: (r: DetectedRisk) => void;
  onViewCamera?: (r: DetectedRisk) => void;
}

function RiskMeta({ risk }: { risk: DetectedRisk }) {
  const ts = toDate(risk.timestamp);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span
        className="inline-flex items-center gap-1"
        title={format(ts, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
      >
        <Clock className="h-3 w-3" aria-hidden />
        <time dateTime={ts.toISOString()}>
          {formatDistanceToNow(ts, { locale: ptBR, addSuffix: true })}
        </time>
        <span className="text-muted-foreground/60">· {format(ts, 'HH:mm', { locale: ptBR })}</span>
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
          <span className="font-mono">{Math.round(risk.confidence * 100)}%</span>
          <span className="text-muted-foreground/60">conf.</span>
        </span>
      )}
    </div>
  );
}

function RiskActions({ risk, onViewDetails, onViewCamera }: RiskRowProps) {
  if (!onViewDetails && !onViewCamera) return null;
  return (
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
  );
}

export function RiskRow({ risk, onViewDetails, onViewCamera }: RiskRowProps) {
  const meta = RISK_META[risk.type];
  const style = SEVERITY_STYLES[risk.severity];
  const Icon = meta.icon;
  const isCritical = risk.severity === 'critical';

  return (
    <article
      className={cn(
        'group relative rounded-lg border bg-card transition-all',
        'border-l-4 hover:shadow-md',
        style.border,
        isCritical && 'alert-critical-pulse'
      )}
      aria-label={`Risco ${style.label}: ${risk.title}`}
    >
      <div className="flex gap-3 p-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            style.bg,
            style.text
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight text-foreground">{risk.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{meta.label}</p>
            </div>
            <Badge
              className={cn('shrink-0 border-0 font-medium', style.bg, style.text)}
              variant="secondary"
            >
              {style.label}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{risk.description}</p>

          <RiskMeta risk={risk} />
          <RiskActions risk={risk} onViewDetails={onViewDetails} onViewCamera={onViewCamera} />
        </div>

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
