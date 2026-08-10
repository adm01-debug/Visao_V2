/**
 * Onda 212 — Cartão de auditoria de latência e custo por câmera.
 *
 * Puramente apresentacional: a régua inteira vive em `pipelineMetrics.ts`.
 * Este componente não classifica, não ordena e não arredonda veredito — ele
 * pinta o que o livro de métricas já decidiu.
 *
 * DECISÕES DE APRESENTAÇÃO
 *  A1 — Latência saturada nunca vira número: mostramos "acima da régua". Exibir
 *       o teto do histograma como se fosse o p95 seria mentir para baixo.
 *  A2 — `stale_frame` (cadência descartou o frame velho) e `stale` (o
 *       barramento entregou tarde demais) aparecem separados: o conserto de um
 *       é o modelo, o do outro é a rede.
 *  A3 — Ausência de leitura é "sem leitura", jamais verde.
 */

import { AlertTriangle, CheckCircle2, Coins, Gauge, HelpCircle, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  viewFleetMetrics,
  type MetricsLedger,
  type MetricsVerdict,
} from '@/lib/vision/pipelineMetrics';

const VERDICT_META: Record<MetricsVerdict, { label: string; className: string }> = {
  unknown: { label: 'Sem leitura', className: 'bg-muted text-muted-foreground border-border' },
  nominal: { label: 'Nominal', className: 'bg-success/15 text-success border-success/30' },
  strained: { label: 'Sob pressão', className: 'bg-warning/15 text-warning border-warning/30' },
  critical: {
    label: 'Crítico',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

/** A1 — número só quando existe número. */
function latencyText(p95Ms: number | null, saturated: boolean): string {
  if (saturated) return 'acima da régua';
  if (p95Ms === null) return 'não medida';
  return `${Math.round(p95Ms)} ms`;
}

function percent(ratio: number | null): string {
  return ratio === null ? '—' : `${Math.round(ratio * 100)}%`;
}

export interface VisionMetricsAuditCardProps {
  readonly ledger: MetricsLedger;
  readonly className?: string;
}

export function VisionMetricsAuditCard({ ledger, className }: VisionMetricsAuditCardProps) {
  const fleet = viewFleetMetrics(ledger);
  const actionable = fleet.counts.strained + fleet.counts.critical;
  const HeadIcon =
    fleet.cameras.length === 0 ? HelpCircle : actionable === 0 ? CheckCircle2 : AlertTriangle;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Latência e custo de inferência
        </CardTitle>
        <p
          className={cn(
            'flex items-center gap-2 text-xs',
            actionable === 0 ? 'text-muted-foreground' : 'text-warning'
          )}
        >
          <HeadIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {fleet.cameras.length === 0
            ? 'Nenhuma câmera auditada na janela.'
            : `${fleet.framesSeen} frame(s) · ${fleet.totalDrops} descarte(s) · ${fleet.staleDrops} velho(s)`}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {fleet.cameras.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Sem métricas nesta janela de auditoria.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {fleet.cameras.map((camera) => {
                const meta = VERDICT_META[camera.verdict];
                return (
                  <li
                    key={camera.cameraId}
                    className="flex items-start justify-between gap-3 rounded-md border border-border p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {camera.cameraId}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Timer className="h-3 w-3" aria-hidden="true" />
                        p95 {latencyText(camera.p95TotalLatencyMs, camera.latencySaturated)}
                        <span>
                          · fila {latencyText(camera.p95QueueMs, camera.latencySaturated)}
                        </span>
                      </p>
                      {/* A2 — os dois "velhos" nunca são somados num número só. */}
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {camera.staleFrameDrops} velho(s) na cadência · {camera.staleBusDrops}{' '}
                        velho(s) no barramento
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Coins className="h-3 w-3" aria-hidden="true" />
                        {camera.cost.unitsSpent} unidade(s) · {percent(camera.savingsRatio)} poupado
                        pelo gate
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={cn('text-[11px]', meta.className)}>
                        {meta.label}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {percent(camera.dropRatio)} descarte
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="pt-1 text-[11px] text-muted-foreground">
              Custo da janela: {fleet.unitsSpent} unidade(s) gasta(s), {fleet.unitsAvoided}{' '}
              evitada(s) pelo gate de cadência.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
