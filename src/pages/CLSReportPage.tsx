/**
 * VISÃO - CLS Report Page
 *
 * Relatório consolidado de Cumulative Layout Shift para as rotas
 * críticas (/dashboard, /cameras, /alerts, /people).
 *
 * Mostra para cada rota: valor final do CLS, classificação Web Vitals
 * (good/needs-improvement/poor), janela de mudança de layout (do 1º ao
 * último shift), número de shifts e top 3 fontes que mais contribuíram.
 *
 * Os dados são coletados em tempo real pelo `clsMonitor` e persistidos
 * em `localStorage` quando o usuário navega para outra rota ou quando
 * `markFinalReport` é chamado pelo `useRouteCLS` (3s após "load").
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, Gauge, RefreshCw, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageMeta } from '@/components/PageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TRACKED_ROUTES,
  clearReports,
  getTrackedReports,
  subscribeCLS,
  type RouteCLSReport,
} from '@/lib/clsMonitor';
import { cn } from '@/lib/utils';
import {
  downloadNavigationCLSLog,
  clearNavigationCLSLog,
  getNavigationCLSLog,
  getNavigationCLSSessionId,
} from '@/lib/navigationCLSLog';
import { PageContent } from '@/components/layout/MainLayout';

const RATING_STYLES: Record<RouteCLSReport['rating'], { label: string; bg: string; text: string }> = {
  good: { label: 'Bom', bg: 'bg-success/10', text: 'text-success' },
  'needs-improvement': { label: 'Atenção', bg: 'bg-severity-medium/10', text: 'text-severity-medium' },
  poor: { label: 'Ruim', bg: 'bg-destructive/10', text: 'text-destructive' },
};

const ROUTE_LABEL: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cameras': 'Câmeras',
  '/alerts': 'Alertas',
  '/people': 'Pessoas',
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function ShiftTimeline({ report }: { report: RouteCLSReport }) {
  if (report.shifts.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum shift registrado.</p>;
  }
  const window = report.shiftWindowMs || 1;
  const max = Math.max(...report.shifts.map((s) => s.value), 0.01);

  return (
    <div className="space-y-1.5">
      <div className="relative h-8 rounded-md border border-border bg-muted/30 overflow-hidden">
        {report.shifts.map((shift, i) => {
          const left = window === 0 ? 0 : ((shift.timestamp - (report.firstShiftAt ?? 0)) / window) * 100;
          const heightPct = (shift.value / max) * 100;
          return (
            <div
              key={i}
              className={cn(
                'absolute bottom-0 w-1.5 rounded-t bg-severity-high/80 hover:bg-severity-high transition-colors',
                shift.value >= 0.05 && 'bg-destructive/80 hover:bg-destructive',
              )}
              style={{ left: `${left}%`, height: `${Math.max(heightPct, 8)}%` }}
              title={`${shift.selector} · +${shift.value.toFixed(3)} @ ${formatMs(Math.round(shift.timestamp))}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground tabular-nums">
        <span>0 ms</span>
        <span>{formatMs(report.shiftWindowMs)}</span>
      </div>
    </div>
  );
}

function RouteReportCard({
  entry,
}: {
  entry: RouteCLSReport | { path: string; missing: true };
}) {
  const label = ROUTE_LABEL[entry.path] ?? entry.path;

  if ('missing' in entry) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{label}</CardTitle>
            <Badge variant="outline" className="text-xs">Sem dados</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Visite a rota para coletar a medição de CLS.
          </p>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to={entry.path}>
              Visitar {entry.path}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const style = RATING_STYLES[entry.rating];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{label}</CardTitle>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{entry.path}</p>
          </div>
          <Badge className={cn('shrink-0 border-0', style.bg, style.text)} variant="secondary">
            {style.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Métricas principais */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">CLS final</p>
            <p className={cn('text-2xl font-bold font-mono tabular-nums', style.text)}>
              {entry.cls.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Janela</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {formatMs(entry.shiftWindowMs)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Shifts</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {entry.shiftCount}
            </p>
          </div>
        </div>

        {/* Timeline visual */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Janela de mudança de layout</p>
          <ShiftTimeline report={entry} />
          {entry.firstShiftAt !== null && entry.lastShiftAt !== null && (
            <p className="text-[10px] text-muted-foreground font-mono mt-1 tabular-nums">
              1º shift @ {formatMs(entry.firstShiftAt)} · último @ {formatMs(entry.lastShiftAt)}
            </p>
          )}
        </div>

        {/* Top fontes */}
        {entry.topSources.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Top fontes</p>
            <ul className="space-y-1">
              {entry.topSources.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 text-xs font-mono px-2 py-1 rounded bg-muted/40"
                >
                  <span className="truncate text-foreground">{s.selector}</span>
                  <span className="tabular-nums text-destructive font-semibold shrink-0">
                    +{s.value.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Capturado {formatDistanceToNow(entry.capturedAt, { locale: ptBR, addSuffix: true })}
          {' · '}
          {format(entry.capturedAt, 'HH:mm:ss', { locale: ptBR })}
        </p>
      </CardContent>
    </Card>
  );
}

export default function CLSReportPage() {
  const [entries, setEntries] = useState(getTrackedReports);

  useEffect(() => {
    const refresh = () => setEntries(getTrackedReports());
    const unsub = subscribeCLS(refresh);
    const interval = window.setInterval(refresh, 2000);
    return () => {
      unsub();
      window.clearInterval(interval);
    };
  }, []);

  const measured = entries.filter((e): e is RouteCLSReport => !('missing' in e));
  const aggregateCLS = measured.reduce((sum, e) => sum + e.cls, 0);
  const worst = measured.reduce<RouteCLSReport | null>(
    (acc, e) => (acc === null || e.cls > acc.cls ? e : acc),
    null,
  );

  return (
    <PageContent className="space-y-6">
      <PageMeta
        title="Relatório CLS"
        description="Relatório de Cumulative Layout Shift por rota crítica do VISÃO."
      />

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" aria-hidden />
            <h1 className="text-2xl font-bold tracking-tight">Relatório CLS</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Cumulative Layout Shift medido em tempo real para{' '}
            <span className="font-mono">{TRACKED_ROUTES.join(', ')}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEntries(getTrackedReports())}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadNavigationCLSLog('ndjson')}
            className="gap-1.5"
            title={`Sessão atual: ${getNavigationCLSSessionId()} • ${getNavigationCLSLog().length} entradas`}
          >
            <Download className="h-3.5 w-3.5" /> Exportar log
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              clearReports();
              clearNavigationCLSLog();
              setEntries(getTrackedReports());
            }}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
      </header>

      {/* Resumo agregado */}
      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rotas medidas</p>
            <p className="text-2xl font-bold tabular-nums">
              {measured.length} <span className="text-base text-muted-foreground">/ {TRACKED_ROUTES.length}</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">CLS agregado</p>
            <p className="text-2xl font-bold font-mono tabular-nums">{aggregateCLS.toFixed(3)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pior rota</p>
            <p className="text-base font-semibold truncate">
              {worst ? ROUTE_LABEL[worst.path] ?? worst.path : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pior CLS</p>
            <p
              className={cn(
                'text-2xl font-bold font-mono tabular-nums',
                worst ? RATING_STYLES[worst.rating].text : 'text-foreground',
              )}
            >
              {worst ? worst.cls.toFixed(3) : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cards por rota */}
      <div className="grid gap-4 md:grid-cols-2">
        {entries.map((entry) => (
          <RouteReportCard key={entry.path} entry={entry} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Thresholds Web Vitals: <strong className="text-success">bom &lt; 0.1</strong> ·{' '}
        <strong className="text-severity-medium">atenção &lt; 0.25</strong> ·{' '}
        <strong className="text-destructive">ruim ≥ 0.25</strong>. As medições são finalizadas 3s após o
        carregamento da rota (sem queries em fetching) ou ao navegar para outra rota.
      </p>
    </PageContent>
  );
}
