import { useMemo, useState } from 'react';
import { ClipboardList, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatAge } from '@/lib/emap/attentionClock';
import {
  buildHandoff,
  formatHandoffReport,
  type ShiftClosureReason,
  type ShiftHandoff,
  type ShiftJournal,
} from '@/lib/emap/shiftHandoff';
import type { AttentionLedger } from '@/lib/emap/attentionClock';
import type { AckLedger } from '@/lib/emap/triageAck';
import {
  buildShiftPerformance,
  formatCompliance,
  formatPerformanceReport,
  type ShiftPerformance,
} from '@/lib/emap/shiftPerformance';
import type { ShiftLoadOutcome } from '@/lib/emap/shiftJournalStore';

export interface ShiftHandoffCardProps {
  journal: ShiftJournal;
  ledger: AttentionLedger;
  nameOf: (cameraId: string) => string;
  /** Onda 175 — livro de ciências, base do prazo de atendimento. */
  acks?: AckLedger;
  /** Onda 170 — como o diário foi restaurado nesta sessão. */
  restoreOutcome?: ShiftLoadOutcome;
  className?: string;
}


/**
 * Onda 170: perda de história nunca é silenciosa. O operador precisa saber se
 * está lendo o diário do turno inteiro ou um caderno reiniciado.
 */
const RESTORE_NOTE: Partial<Record<ShiftLoadOutcome, string>> = {
  corrupt: 'O registro anterior estava ilegível e foi descartado: este turno começou agora.',
  clock_suspect:
    'O registro anterior tinha data futura (relógio do dispositivo) e foi descartado por segurança.',
  rolled_over:
    'O turno anterior expirou. Contadores reiniciados; as pendências abertas seguem como herdadas.',
};

const REASON_LABEL: Record<ShiftClosureReason, string> = {
  normalized: 'normalizadas',
  acknowledged: 'cientes (não resolvidas)',
  removed: 'fora do escopo',
};

const REASON_VARIANT: Record<ShiftClosureReason, 'secondary' | 'outline' | 'destructive'> = {
  normalized: 'secondary',
  acknowledged: 'destructive',
  removed: 'outline',
};

/**
 * Onda 169 — passagem de turno.
 *
 * O card responde "o que aconteceu no meu turno" sem esconder a diferença
 * entre normalizar e apenas dar ciência. O relatório em texto é gerado pela
 * mesma regra pura que a simulação exercita — a tela nunca reescreve o fato.
 */
export function ShiftHandoffCard({ journal, ledger, nameOf, acks, restoreOutcome, className }: ShiftHandoffCardProps) {
  const [copied, setCopied] = useState(false);
  const handoff: ShiftHandoff = useMemo(
    () => buildHandoff(journal, ledger, Date.now()),
    [journal, ledger],
  );
  // Onda 175 — desempenho de atendimento derivado da mesma regra pura do gate.
  const performance: ShiftPerformance = useMemo(
    () =>
      buildShiftPerformance({
        ledger,
        acks: acks ?? {},
        startedAt: journal.startedAt,
        now: handoff.endedAt,
      }),
    [ledger, acks, journal.startedAt, handoff.endedAt],
  );

  const hasHistory =
    handoff.open.length > 0 ||
    handoff.totals.normalized + handoff.totals.acknowledged + handoff.totals.removed > 0;
  if (!hasHistory) return null;

  const copy = async () => {
    const report = `${formatHandoffReport(handoff, nameOf)}\n\n${formatPerformanceReport(performance)}`;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Área de transferência bloqueada não é erro do operador: silêncio.
      setCopied(false);
    }
  };


  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Passagem de turno
          <Badge variant="outline">{formatAge(handoff.durationMs)}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {handoff.open.length} aberta(s) agora — {handoff.inheritedCount} herdada(s),{' '}
          {handoff.arisenCount} surgida(s) neste turno.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {restoreOutcome && RESTORE_NOTE[restoreOutcome] && (
          <p className="rounded-md border border-border bg-muted/50 p-2 text-xs text-muted-foreground">
            {RESTORE_NOTE[restoreOutcome]}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(REASON_LABEL) as ShiftClosureReason[])
            .filter((reason) => handoff.totals[reason] > 0)
            .map((reason) => (
              <Badge key={reason} variant={REASON_VARIANT[reason]}>
                {handoff.totals[reason]} {REASON_LABEL[reason]}
              </Badge>
            ))}
        </div>

        {handoff.oldest && (
          <p className="text-xs text-muted-foreground">
            Mais antiga aberta: <span className="font-medium text-foreground">{nameOf(handoff.oldest.cameraId)}</span>{' '}
            há {formatAge(handoff.oldest.ageMs)}
            {handoff.oldest.inherited && ' (herdada do turno anterior)'}.
          </p>
        )}

        {handoff.flapping.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Oscilando: {handoff.flapping.slice(0, 4).map((id) => nameOf(id)).join(', ')}
            {handoff.flapping.length > 4 && ` e mais ${handoff.flapping.length - 4}`}.
          </p>
        )}

        <Button variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? (
            <Check className="mr-1 h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="mr-1 h-4 w-4" aria-hidden="true" />
          )}
          {copied ? 'Relatório copiado' : 'Copiar relatório do turno'}
        </Button>
      </CardContent>
    </Card>
  );
}
