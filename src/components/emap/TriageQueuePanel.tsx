import { useEffect, useMemo, useRef, useState } from 'react';
import { ListChecks, ArrowRight, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatAge, type AttentionLedger } from '@/lib/emap/attentionClock';
import { buildTriageQueue, type TriageItem } from '@/lib/emap/triageQueue';
import type { TriageLocator } from '@/lib/emap/triageQueue';
import type { MapMarkerStatus } from '@/lib/emap/floorPlanGeometry';
import type { AckLedger } from '@/lib/emap/triageAck';
import {
  evaluateSla,
  slaStateLabel,
  summarizeSla,
  type SlaState,
  type SlaVerdict,
} from '@/lib/emap/triageSla';
import {
  escalationLabel,
  reconcileEscalations,
  summarizeEscalations,
  type EscalationLedger,
} from '@/lib/emap/triageEscalation';

export interface TriageQueuePanelProps {
  ledger: AttentionLedger;
  nameOf: (cameraId: string) => string;
  locate?: TriageLocator;
  activePlanId?: string | null;
  acknowledged?: Iterable<string>;
  /** Livro de ciência (Onda 172) — congela o veredito de prazo da Onda 174. */
  acks?: AckLedger;
  /** Leva o operador até a câmera (troca de andar + seleção). */
  onFocus?: (item: TriageItem) => void;
  onAcknowledge?: (cameraId: string) => void;
  limit?: number;
  className?: string;
}


const STATUS_LABEL: Record<MapMarkerStatus, string> = {
  alert: 'alarme',
  offline: 'fora do ar',
  warning: 'aviso',
  unknown: 'sem estado',
  online: 'operando',
};

const STATUS_VARIANT: Record<MapMarkerStatus, 'destructive' | 'secondary' | 'outline'> = {
  alert: 'destructive',
  offline: 'destructive',
  warning: 'secondary',
  unknown: 'outline',
  online: 'outline',
};

/** Onda 174: o prazo nunca compete com a gravidade — só a explica. */
const SLA_VARIANT: Record<SlaState, 'destructive' | 'secondary' | 'outline'> = {
  breached: 'destructive',
  due_soon: 'secondary',
  on_time: 'outline',
  late: 'secondary',
  met: 'outline',
  not_applicable: 'outline',
};

/**
 * Onda 171 — "o que eu atendo agora?".
 *
 * A fila só aparece quando existe pendência: painel cronicamente vazio treina
 * o operador a não olhar. O relógio local apenas repinta rótulos de idade — a
 * ordem verdadeira é derivada da regra pura em `triageQueue.ts`.
 */
export function TriageQueuePanel({
  ledger,
  nameOf,
  locate,
  activePlanId = null,
  acknowledged,
  acks,
  onFocus,
  onAcknowledge,
  limit = 6,
  className,
}: TriageQueuePanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const ackKey = useMemo(() => Array.from(acknowledged ?? []).sort().join('|'), [acknowledged]);

  const queue = useMemo(
    () => buildTriageQueue({ ledger, now, locate, activePlanId, acknowledged, limit }),
    // `ackKey` estabiliza a dependência de um iterável recriado a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger, now, locate, activePlanId, ackKey, limit],
  );

  // Onda 174 — veredito de prazo por item. Fora de escopo não vira selo.
  const sla = useMemo(() => {
    const byCamera = new Map<string, SlaVerdict>();
    for (const item of queue.items) {
      const entry = ledger[item.cameraId];
      if (!entry) continue;
      byCamera.set(item.cameraId, evaluateSla({ entry, now, ack: acks?.[item.cameraId] ?? null }));
    }
    return { byCamera, summary: summarizeSla(byCamera.values()) };
  }, [queue.items, ledger, now, acks]);

  // Onda 176 — degrau de acionamento. A memória vive num ref porque o degrau
  // nunca retrocede: recalcular do zero a cada render rebaixaria acionamentos
  // já feitos quando o estado da câmera melhora.
  const escalationMemory = useRef<EscalationLedger>({});
  const escalation = useMemo(() => {
    const result = reconcileEscalations({
      verdicts: sla.byCamera.values(),
      memory: escalationMemory.current,
      now,
    });
    escalationMemory.current = result.memory;
    return { ledger: result.memory, summary: summarizeEscalations(result.memory) };
  }, [sla, now]);

  if (queue.totals.total === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Fila de atendimento
          <Badge variant="secondary">{queue.totals.open} aberto(s)</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {queue.next
            ? `Próximo: ${nameOf(queue.next.cameraId)} — ${queue.next.reason}.`
            : 'Tudo reconhecido. Nenhum item aguardando primeira olhada.'}{' '}
          Gravidade manda; tempo promove no máximo um degrau e nunca vira alarme.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {queue.totals.promoted > 0 && (
            <Badge variant="outline">{queue.totals.promoted} promovido(s) por tempo</Badge>
          )}
          {queue.totals.acknowledged > 0 && (
            <Badge variant="outline">{queue.totals.acknowledged} ciente(s)</Badge>
          )}
          {queue.totals.offPlan > 0 && (
            <Badge variant="outline">{queue.totals.offPlan} fora de planta</Badge>
          )}
          {sla.summary.breached > 0 && (
            <Badge variant="destructive">{sla.summary.breached} fora do prazo</Badge>
          )}
          {sla.summary.late > 0 && (
            <Badge variant="secondary">{sla.summary.late} atendido(s) com atraso</Badge>
          )}
          {escalation.summary.total > 0 && (
            <Badge variant="destructive">
              acionamento: {escalationLabel(escalation.summary.highest)} (
              {escalation.summary.total})
            </Badge>
          )}
        </div>

        <ol className="space-y-2">
          {queue.items.map((item, index) => (
            <li
              key={item.cameraId}
              className={`flex items-start gap-2 rounded-md border p-2 ${
                item.acknowledged ? 'opacity-70' : ''
              }`}
            >
              <span className="mt-0.5 text-xs font-mono text-muted-foreground">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">{nameOf(item.cameraId)}</span>
                  <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                  {item.promoted && <Badge variant="outline">promovido</Badge>}
                  {item.acknowledged && <Badge variant="outline">ciente</Badge>}
                  {(() => {
                    const verdict = sla.byCamera.get(item.cameraId);
                    if (!verdict || verdict.state === 'not_applicable') return null;
                    return (
                      <Badge variant={SLA_VARIANT[verdict.state]}>
                        {slaStateLabel(verdict.state)}
                        {verdict.overdueMs > 0
                          ? ` +${formatAge(verdict.overdueMs)}`
                          : verdict.remainingMs != null && !verdict.frozen
                            ? ` (${formatAge(verdict.remainingMs)})`
                            : ''}
                      </Badge>
                    );
                  })()}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.planName ?? 'Sem planta'}
                  {item.onActivePlan ? ' (nesta planta)' : ''} · há {formatAge(item.attentionAgeMs)} ·{' '}
                  {item.reason}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {onFocus && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFocus(item)}
                    aria-label={`Ir para ${nameOf(item.cameraId)}`}
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
                {onAcknowledge && !item.acknowledged && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAcknowledge(item.cameraId)}
                    aria-label={`Marcar ciente: ${nameOf(item.cameraId)}`}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>

        {queue.dropped > 0 && (
          <p className="text-xs text-muted-foreground">
            e mais {queue.dropped} pendência(s) na fila — as contagens acima permanecem absolutas.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
