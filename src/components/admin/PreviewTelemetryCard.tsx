/**
 * VISÃO — Painel de telemetria de prévias ao vivo (admin).
 *
 * Consome `get_preview_telemetry_summary` e exibe:
 *  - KPIs: total, sessões, taxa de sucesso, latência p95 do start.
 *  - Breakdown por codec / resolução / navegador (tabs).
 *  - Top erros com código.
 *
 * Realtime: escuta INSERTs em `preview_telemetry_events` e refetch com throttle.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity, AlertOctagon, Clock, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  usePreviewTelemetrySummary,
  type PreviewTelemetrySummary,
} from '@/hooks/usePreviewTelemetrySummary';
import { useState } from 'react';
import { PreviewTelemetryTimeline } from './PreviewTelemetryTimeline';

const WINDOWS: Array<{ value: string; label: string; hours: number }> = [
  { value: '1', label: 'Última 1h', hours: 1 },
  { value: '6', label: 'Últimas 6h', hours: 6 },
  { value: '24', label: '24h', hours: 24 },
  { value: '168', label: '7 dias', hours: 168 },
  { value: '720', label: '30 dias', hours: 720 },
];

function pct(n: number, d: number): string {
  if (!d) return '—';
  return `${((n / d) * 100).toFixed(1)}%`;
}

function fmtMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

interface BreakdownRow {
  label: string;
  started: number;
  failed: number;
  total: number;
}

function BreakdownTable({ rows, labelHeader }: { rows: BreakdownRow[]; labelHeader: string }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Sem dados nesta janela.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 text-left font-medium">{labelHeader}</th>
            <th className="py-2 text-right font-medium">Iniciadas</th>
            <th className="py-2 text-right font-medium">Falhas</th>
            <th className="py-2 text-right font-medium">Sucesso</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const denom = r.started + r.failed;
            const successRate = denom ? r.started / denom : 0;
            const color =
              successRate >= 0.95
                ? 'text-success'
                : successRate >= 0.8
                  ? 'text-warning'
                  : 'text-destructive';
            return (
              <tr key={r.label} className="border-b last:border-0">
                <td className="py-2 font-medium">{r.label}</td>
                <td className="py-2 text-right tabular-nums">{r.started}</td>
                <td className="py-2 text-right tabular-nums">{r.failed}</td>
                <td className={`py-2 text-right font-semibold tabular-nums ${color}`}>
                  {pct(r.started, denom)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export interface PreviewTelemetryCardProps {
  defaultWindowHours?: number;
}

export function PreviewTelemetryCard({ defaultWindowHours = 24 }: PreviewTelemetryCardProps) {
  const [windowValue, setWindowValue] = useState(String(defaultWindowHours));
  const windowHours = Number(windowValue) || 24;
  const { data, isLoading, isError, error } = usePreviewTelemetrySummary(windowHours);
  const qc = useQueryClient();
  const throttleRef = useRef<number>(0);

  // Realtime — refetch com throttle de 5s.
  useEffect(() => {
    const channel = supabase
      .channel(`preview-telemetry-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'preview_telemetry_events' },
        () => {
          const now = Date.now();
          if (now - throttleRef.current > 5000) {
            throttleRef.current = now;
            void qc.invalidateQueries({ queryKey: ['preview-telemetry-summary'] });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const errMsg = (error as Error | undefined)?.message ?? '';
  const isForbidden = /forbidden|permission|42501/i.test(errMsg);

  const rowsCodec = useMemo<BreakdownRow[]>(
    () =>
      (data?.by_codec ?? []).map((c) => ({
        label: c.codec,
        started: c.started ?? 0,
        failed: c.failed ?? 0,
        total: c.total ?? 0,
      })),
    [data]
  );
  const rowsResolution = useMemo<BreakdownRow[]>(
    () =>
      (data?.by_resolution ?? []).map((c) => ({
        label: c.resolution,
        started: c.started ?? 0,
        failed: c.failed ?? 0,
        total: c.total ?? 0,
      })),
    [data]
  );
  const rowsBrowser = useMemo<BreakdownRow[]>(
    () =>
      (data?.by_browser ?? []).map((c) => ({
        label: c.browser,
        started: c.started ?? 0,
        failed: c.failed ?? 0,
        total: c.total ?? 0,
      })),
    [data]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" aria-hidden />
          <CardTitle className="text-base">Telemetria de prévias ao vivo</CardTitle>
        </div>
        <Select value={windowValue} onValueChange={setWindowValue}>
          <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Janela de tempo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOWS.map((w) => (
              <SelectItem key={w.value} value={w.value} className="text-xs">
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="grid gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : isForbidden ? (
          <p className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Acesso restrito a administradores.
          </p>
        ) : isError ? (
          <p className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Falha ao carregar telemetria: {errMsg || 'erro desconhecido'}.
          </p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">Sem dados de telemetria ainda.</p>
        ) : (
          <>
            <KpiGrid summary={data} />
            <Tabs defaultValue="timeline">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="codec">Codec</TabsTrigger>
                <TabsTrigger value="resolution">Resolução</TabsTrigger>
                <TabsTrigger value="browser">Navegador</TabsTrigger>
                <TabsTrigger value="errors">Erros</TabsTrigger>
              </TabsList>
              <TabsContent value="timeline" className="pt-3">
                <PreviewTelemetryTimeline points={data.timeline ?? []} windowHours={windowHours} />
              </TabsContent>
              <TabsContent value="codec" className="pt-3">
                <BreakdownTable rows={rowsCodec} labelHeader="Codec" />
              </TabsContent>
              <TabsContent value="resolution" className="pt-3">
                <BreakdownTable rows={rowsResolution} labelHeader="Resolução" />
              </TabsContent>
              <TabsContent value="browser" className="pt-3">
                <BreakdownTable rows={rowsBrowser} labelHeader="Navegador" />
              </TabsContent>
              <TabsContent value="errors" className="pt-3">
                {data.top_errors.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum erro registrado na janela.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {data.top_errors.map((e) => (
                      <li
                        key={e.error_code}
                        className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <AlertOctagon className="h-4 w-4 text-destructive" aria-hidden />
                          <code className="font-mono text-xs">{e.error_code}</code>
                        </span>
                        <Badge variant="destructive" className="tabular-nums">
                          {e.total}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function KpiGrid({ summary }: { summary: PreviewTelemetrySummary }) {
  const t = summary.totals;
  const denom = t.started + t.failed;
  const successRate = denom ? t.started / denom : 0;
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <Kpi
        icon={<Activity className="h-4 w-4 text-primary" aria-hidden />}
        label="Eventos"
        value={t.total_events.toLocaleString('pt-BR')}
        hint={`${t.sessions} sessões · ${t.unique_users} usuários`}
      />
      <Kpi
        icon={<Radio className="h-4 w-4 text-success" aria-hidden />}
        label="Taxa de sucesso"
        value={pct(t.started, denom)}
        hint={`${t.started} started · ${t.failed} failed`}
        emphasize={successRate < 0.9 ? 'danger' : successRate < 0.95 ? 'warn' : 'ok'}
      />
      <Kpi
        icon={<Clock className="h-4 w-4 text-primary" aria-hidden />}
        label="Latência start (avg)"
        value={fmtMs(t.avg_start_latency_ms)}
        hint={`p95 ${fmtMs(t.p95_start_latency_ms)}`}
      />
      <Kpi
        icon={<AlertOctagon className="h-4 w-4 text-destructive" aria-hidden />}
        label="Extended / Stopped"
        value={`${t.extended} / ${t.stopped}`}
        hint={`falhas: ${t.failed}`}
      />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  emphasize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  emphasize?: 'ok' | 'warn' | 'danger';
}) {
  const color =
    emphasize === 'danger'
      ? 'text-destructive'
      : emphasize === 'warn'
        ? 'text-warning'
        : emphasize === 'ok'
          ? 'text-success'
          : 'text-foreground';
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`text-xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export default PreviewTelemetryCard;
