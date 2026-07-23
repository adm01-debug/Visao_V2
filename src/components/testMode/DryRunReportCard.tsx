/**
 * VISÃO — Relatório do Dry-Run (Modo Teste)
 *
 * Agrega as detecções sombra (is_test=true) capturadas durante a sessão e
 * projeta o que seria notificado em produção com base nas ações executadas
 * (`notify`, `alert`, `dispatch`, `panic` = canais externos).
 *
 * Fonte de dados: o array `executions` já carregado pela página, evitando
 * queries adicionais. Aceita `filtered` para respeitar filtros ativos.
 */

import { useMemo, useState } from 'react';
import { BarChart3, BellRing, Download, ShieldAlert, Layers, Camera as CameraIcon, FileText, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

/** Ações que resultam em contato externo (email/telegram/webhook/etc). */
const NOTIFYING_ACTIONS = new Set(['notify', 'alert', 'dispatch', 'panic']);

/** Nomes amigáveis para as ações do enum `rule_action`. */
const ACTION_LABELS: Record<string, string> = {
  alert: 'Alerta',
  notify: 'Notificação (canal externo)',
  record: 'Gravação',
  lockdown: 'Bloqueio',
  dispatch: 'Despacho',
  arm: 'Armar',
  disarm: 'Desarmar',
  panic: 'Pânico',
};

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

export interface DryRunExecution {
  id: string;
  rule_id: string;
  triggered_at: string;
  status: string;
  actions_executed: string[] | null;
  rule?: { name: string; category: string; severity: string; zone_id: string | null } | null;
  alert?: { camera_id: string | null; camera_name: string | null } | null;
}

export interface DryRunSessionMeta {
  id: string;
  started_at: string;
  expires_at: string;
  duration_minutes: number;
  scope: string;
  scope_ids: string[];
}

interface DryRunReportCardProps {
  executions: DryRunExecution[];
  session: DryRunSessionMeta | null;
  zonesMap: Record<string, string>;
}

interface RuleAggregate {
  ruleId: string;
  name: string;
  category: string;
  severity: string;
  zoneName: string | null;
  total: number;
  notifying: number;
  suppressedFailures: number;
}

export function DryRunReportCard({ executions, session, zonesMap }: DryRunReportCardProps) {
  const report = useMemo(() => buildReport(executions, zonesMap), [executions, zonesMap]);

  const handleExportJson = () => {
    if (report.totalEvents === 0) {
      toast.info('Sem eventos para exportar', {
        description: 'Aguarde detecções ou ajuste os filtros.',
      });
      return;
    }
    const payload = {
      generated_at: new Date().toISOString(),
      session: session
        ? {
            id: session.id,
            started_at: session.started_at,
            expires_at: session.expires_at,
            duration_minutes: session.duration_minutes,
            scope: session.scope,
            scope_ids: session.scope_ids,
          }
        : null,
      totals: {
        events: report.totalEvents,
        would_notify: report.wouldNotify,
        suppressed_failures: report.suppressedFailures,
        rules: report.byRule.length,
        cameras: report.byCamera.length,
        zones: report.byZone.length,
      },
      by_severity: report.bySeverity,
      by_action: report.byAction,
      by_rule: report.byRule,
      by_camera: report.byCamera,
      by_zone: report.byZone,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `dry-run-report-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado', {
      description: `${report.totalEvents} evento(s) · ${report.wouldNotify} notificação(ões) simulada(s).`,
    });
  };

  if (report.totalEvents === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Relatório do Dry-Run
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum evento simulado no escopo/filtro atual. Assim que a sessão registrar detecções,
            o resumo por regra, câmera, zona e o total de notificações simuladas aparecerá aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  const suppressionRate = report.totalEvents > 0 ? (report.wouldNotify / report.totalEvents) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Relatório do Dry-Run
          </span>
          <Button size="sm" variant="outline" onClick={handleExportJson}>
            <Download className="mr-2 h-4 w-4" />
            Exportar JSON
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryTile
            icon={<Layers className="h-4 w-4 text-primary" />}
            label="Eventos simulados"
            value={report.totalEvents}
          />
          <SummaryTile
            icon={<BellRing className="h-4 w-4 text-warning" />}
            label="Notificariam em produção"
            value={report.wouldNotify}
            hint={`${suppressionRate.toFixed(0)}% dos eventos`}
          />
          <SummaryTile
            icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
            label="Execuções com falha"
            value={report.suppressedFailures}
          />
          <SummaryTile
            icon={<CameraIcon className="h-4 w-4 text-primary" />}
            label="Câmeras envolvidas"
            value={report.byCamera.length}
            hint={`${report.byZone.length} zona(s)`}
          />
        </div>

        <section className="space-y-2" aria-labelledby="dryrun-severity">
          <h3 id="dryrun-severity" className="text-sm font-semibold text-foreground">
            Distribuição por severidade
          </h3>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_ORDER.map((sev) => {
              const count = report.bySeverity[sev] ?? 0;
              if (count === 0) return null;
              return (
                <Badge key={sev} variant={severityVariant(sev)} className="capitalize">
                  {sev}: {count}
                </Badge>
              );
            })}
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="dryrun-actions">
          <h3 id="dryrun-actions" className="text-sm font-semibold text-foreground">
            Ações que seriam disparadas
          </h3>
          <ul className="space-y-1.5">
            {Object.entries(report.byAction)
              .sort((a, b) => b[1] - a[1])
              .map(([action, count]) => {
                const notifying = NOTIFYING_ACTIONS.has(action);
                return (
                  <li
                    key={action}
                    className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {notifying && <BellRing className="h-3.5 w-3.5 text-warning" />}
                      <span className="font-medium">{ACTION_LABELS[action] ?? action}</span>
                      {notifying && (
                        <Badge variant="outline" className="text-[10px]">
                          canal externo
                        </Badge>
                      )}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{count}×</span>
                  </li>
                );
              })}
          </ul>
        </section>

        <section className="space-y-2" aria-labelledby="dryrun-rules">
          <h3 id="dryrun-rules" className="text-sm font-semibold text-foreground">
            Detalhamento por regra
          </h3>
          <div className="space-y-2">
            {report.byRule.slice(0, 10).map((r) => {
              const pct = report.totalEvents > 0 ? (r.total / report.totalEvents) * 100 : 0;
              return (
                <div key={r.ruleId} className="rounded-md border border-border p-3">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{r.name}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={severityVariant(r.severity)} className="text-[10px] capitalize">
                        {r.severity}
                      </Badge>
                      {r.zoneName && (
                        <Badge variant="outline" className="text-[10px]">
                          {r.zoneName}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{r.total} evento(s)</span>
                    <span className="text-warning">
                      {r.notifying} notificação(ões) simulada(s)
                    </span>
                    {r.suppressedFailures > 0 && (
                      <span className="text-destructive">
                        {r.suppressedFailures} falha(s)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {report.byRule.length > 10 && (
              <p className="text-xs text-muted-foreground">
                +{report.byRule.length - 10} regra(s) adicionais no JSON exportado.
              </p>
            )}
          </div>
        </section>

        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Todas as notificações permaneceram <strong>suprimidas</strong> nesta janela. Use
          "Promover sessão" para reenviá-las apenas quando quiser publicar em produção.
        </p>
      </CardContent>
    </Card>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function severityVariant(sev: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (sev === 'critical') return 'destructive';
  if (sev === 'high') return 'destructive';
  if (sev === 'medium') return 'default';
  return 'secondary';
}

function buildReport(executions: DryRunExecution[], zonesMap: Record<string, string>) {
  const bySeverity: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  const ruleAgg = new Map<string, RuleAggregate>();
  const cameraAgg = new Map<string, { name: string; count: number }>();
  const zoneAgg = new Map<string, { name: string; count: number }>();

  let wouldNotify = 0;
  let suppressedFailures = 0;

  for (const e of executions) {
    const sev = e.rule?.severity ?? 'unknown';
    bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;

    const actions = e.actions_executed ?? [];
    const notifyingHere = actions.some((a) => NOTIFYING_ACTIONS.has(a));
    if (notifyingHere) wouldNotify++;
    for (const a of actions) byAction[a] = (byAction[a] ?? 0) + 1;

    const isFailure = e.status === 'failed' || e.status === 'error';
    if (isFailure) suppressedFailures++;

    if (e.rule_id) {
      const key = e.rule_id;
      const zoneId = e.rule?.zone_id ?? null;
      const existing = ruleAgg.get(key) ?? {
        ruleId: key,
        name: e.rule?.name ?? 'Regra removida',
        category: e.rule?.category ?? '—',
        severity: sev,
        zoneName: zoneId ? zonesMap[zoneId] ?? null : null,
        total: 0,
        notifying: 0,
        suppressedFailures: 0,
      };
      existing.total++;
      if (notifyingHere) existing.notifying++;
      if (isFailure) existing.suppressedFailures++;
      ruleAgg.set(key, existing);
    }

    const camId = e.alert?.camera_id;
    if (camId) {
      const c = cameraAgg.get(camId) ?? { name: e.alert?.camera_name ?? camId, count: 0 };
      c.count++;
      cameraAgg.set(camId, c);
    }

    const zoneId = e.rule?.zone_id;
    if (zoneId) {
      const z = zoneAgg.get(zoneId) ?? { name: zonesMap[zoneId] ?? zoneId, count: 0 };
      z.count++;
      zoneAgg.set(zoneId, z);
    }
  }

  return {
    totalEvents: executions.length,
    wouldNotify,
    suppressedFailures,
    bySeverity,
    byAction,
    byRule: Array.from(ruleAgg.values()).sort((a, b) => b.total - a.total),
    byCamera: Array.from(cameraAgg.entries())
      .map(([id, v]) => ({ camera_id: id, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count),
    byZone: Array.from(zoneAgg.entries())
      .map(([id, v]) => ({ zone_id: id, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count),
  };
}
