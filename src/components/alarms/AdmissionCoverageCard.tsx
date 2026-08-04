/**
 * Onda 229 — Cartão de auditoria de cobertura de admissão.
 *
 * Mostra, para o recorte declarado, quantas origens tiveram alarme admitido,
 * quantas tiveram eventos recusados (buraco) e quantas ficaram **sem dado
 * algum** — o silêncio que no painel parece paz.
 */

import { AlertTriangle, EyeOff, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CoverageSummary, LedgerRowsReport } from '@/lib/alarms/admissionLedgerRows';
import type { AdmissionReason } from '@/lib/alarms/eventAdmission';

const REASON_LABEL: Record<AdmissionReason, string> = {
  admitted: 'admitido',
  admitted_degraded: 'admitido em modo degradado',
  indeterminate: 'indeterminado',
  out_of_window: 'fora da janela',
  inoperative: 'esquema inoperante',
  disabled: 'esquema desabilitado',
  source_missing: 'origem sem esquema vinculado',
  no_scheme: 'nenhum esquema cadastrado',
};

export interface AdmissionCoverageCardProps {
  readonly summary: CoverageSummary;
  readonly report: LedgerRowsReport;
  readonly windowStartAt: number;
  readonly isLoading?: boolean;
}

export function AdmissionCoverageCard({
  summary,
  report,
  windowStartAt,
  isLoading = false,
}: AdmissionCoverageCardProps) {
  const gaps = summary.verdicts.filter((v) => v.status === 'gap').slice(0, 5);
  const blind = summary.verdicts.filter((v) => v.status === 'no_data').slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldQuestion className="h-4 w-4 text-primary" aria-hidden="true" />
          Auditoria de admissão
        </CardTitle>
        <CardDescription>
          Desde {new Date(windowStartAt).toLocaleString('pt-BR')} —{' '}
          {report.ledger.total.toLocaleString('pt-BR')} evento(s) julgado(s) em{' '}
          {report.accepted.toLocaleString('pt-BR')} janela(s).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-success" aria-hidden="true" />
                  Cobertas
                </p>
                <p className="text-2xl font-bold tabular-nums text-success">{summary.covered}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 text-warning" aria-hidden="true" />
                  Com buraco
                </p>
                <p className="text-2xl font-bold tabular-nums text-warning">{summary.gap}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <EyeOff className="h-3 w-3 text-destructive" aria-hidden="true" />
                  Sem dado
                </p>
                <p className="text-2xl font-bold tabular-nums text-destructive">{summary.noData}</p>
              </div>
            </div>

            {gaps.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Eventos recusados (motivo dominante)
                </p>
                <ul className="space-y-1 text-sm">
                  {gaps.map((v) => (
                    <li key={v.sourceId} className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{v.sourceId}</span>
                      <Badge variant="outline" className="border-warning/40 text-warning">
                        {v.dominantReason ? REASON_LABEL[v.dominantReason] : 'desconhecido'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blind.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Sem nenhum evento no período:{' '}
                <span className="font-medium text-foreground">
                  {blind.map((v) => v.sourceId).join(', ')}
                </span>
                . Ausência de evento não é prova de vigilância.
              </p>
            )}

            {(report.malformed.length > 0 || summary.unreadable > 0) && (
              <p className="flex items-start gap-1 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                {report.malformed.length} registro(s) ilegível(is) foram excluídos da contabilidade
                {summary.unreadable > 0
                  ? ` — ${summary.unreadable} origem(ns) ficaram sem leitura confiável.`
                  : '.'}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
