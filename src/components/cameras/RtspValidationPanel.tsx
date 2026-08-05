import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ValidationResult, ValidationSeverity } from '@/hooks/useRtspValidation';

interface Props {
  result: ValidationResult | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  compact?: boolean;
}

const scoreTone: Record<ValidationResult['score'], string> = {
  ok: 'bg-success/15 text-success border-success/30',
  warn: 'bg-warning/15 text-warning border-warning/30',
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
};

const severityIcon: Record<ValidationSeverity, JSX.Element> = {
  info: <Info className="h-4 w-4 text-muted-foreground" aria-hidden />,
  warn: <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />,
  critical: <XCircle className="h-4 w-4 text-destructive" aria-hidden />,
};

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-card/50 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function Sparkline({ samples }: { samples: ValidationResult['samples_detail'] }) {
  if (!samples.length) return null;
  const max = Math.max(...samples.map((s) => s.ms), 50);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {samples.map((s, i) => (
        <div
          key={i}
          className={cn(
            'flex-1 rounded-sm transition-all',
            s.ok ? 'bg-primary/70' : 'bg-destructive/70'
          )}
          style={{ height: `${Math.max(4, (s.ms / max) * 100)}%` }}
          title={`${s.ok ? 'OK' : 'FAIL'} · ${s.ms}ms`}
        />
      ))}
    </div>
  );
}

export function RtspValidationPanel({ result, loading, error, onRetry, compact }: Props) {
  if (loading) {
    return (
      <Card className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Testando conexão RTSP — enviando handshakes, medindo latência…
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="p-4 border-destructive/40">
        <div className="flex items-start gap-2">
          <XCircle className="h-4 w-4 mt-0.5 text-destructive" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-medium">Falha ao validar</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-3 w-3 mr-1" /> Repetir
            </Button>
          )}
        </div>
      </Card>
    );
  }
  if (!result) return null;

  const scoreLabel = { ok: 'Saudável', warn: 'Atenção', critical: 'Crítico' }[result.score];
  const scoreIcon = {
    ok: <CheckCircle2 className="h-3.5 w-3.5" />,
    warn: <AlertTriangle className="h-3.5 w-3.5" />,
    critical: <XCircle className="h-3.5 w-3.5" />,
  }[result.score];

  return (
    <Card className={cn('p-4 space-y-3', compact && 'p-3 space-y-2')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('gap-1 border', scoreTone[result.score])}>
            {scoreIcon} {scoreLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {result.samples} amostras · {result.target}
          </span>
        </div>
        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" /> Repetir
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Metric label="Latência méd." value={`${result.latency.avg} ms`} />
        <Metric label="P95" value={`${result.latency.p95} ms`} />
        <Metric label="Jitter" value={`${result.latency.jitter} ms`} />
        <Metric label="Perda" value={`${result.loss_pct}%`} />
        <Metric label="Codec" value={result.codec ?? '—'} />
        <Metric label="Resolução" value={result.resolution ?? '—'} />
        <Metric label="FPS" value={result.fps ?? '—'} />
        <Metric label="Auth" value={result.auth_method ?? '—'} />
      </div>

      <Sparkline samples={result.samples_detail} />

      {result.warnings.length > 0 && (
        <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
          {result.warnings.map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </div>
      )}

      <ul className="space-y-1.5">
        {result.suggestions.map((s) => (
          <li key={s.code} className="flex items-start gap-2 text-xs">
            {severityIcon[s.severity]}
            <span className="leading-snug">{s.message}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default RtspValidationPanel;
