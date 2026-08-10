import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, SatelliteDish } from 'lucide-react';
import type {
  ReliabilityState,
  ReliabilitySummary,
  ReliabilityVerdict,
} from '@/lib/devices/commandReliability';

interface CommandReliabilityCardProps {
  readonly verdicts: readonly ReliabilityVerdict[];
  readonly summary: ReliabilitySummary;
  readonly evaluatedAt: number | null;
  readonly isLoading: boolean;
  readonly onRefresh: () => void;
}

/**
 * Rótulos em português. "sem histórico" jamais é "em dia": um equipamento que
 * nunca recebeu ordens não provou nada, e achatar os dois estados faria uma
 * instalação nova nascer aprovada.
 */
const STATE_LABEL: Record<ReliabilityState, string> = {
  insufficient_evidence: 'sem histórico',
  healthy: 'obedece',
  failing: 'responde falhando',
  suspect: 'engole ordens',
  deaf: 'não presta contas',
};

const STATE_VARIANT: Record<ReliabilityState, 'secondary' | 'outline' | 'destructive'> = {
  insufficient_evidence: 'outline',
  healthy: 'secondary',
  failing: 'outline',
  suspect: 'outline',
  deaf: 'destructive',
};

const pct = (value: number): string => `${Math.round(value * 100)}%`;

/**
 * Onda 196 — série de comandos por equipamento no console de manutenção.
 *
 * As ondas anteriores tratam uma ordem por vez; um gravador que engole três
 * ordens seguidas e responde a quarta não dispara nada. É aqui que o padrão
 * aparece, antes de alguém subir no telhado à toa.
 */
export function CommandReliabilityCard({
  verdicts,
  summary,
  evaluatedAt,
  isLoading,
  onRefresh,
}: CommandReliabilityCardProps) {
  const actionable = verdicts.filter((v) => v.severity !== null);
  const quiet = verdicts.filter((v) => v.severity === null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <SatelliteDish className="h-4 w-4 text-muted-foreground" aria-hidden />
            Obediência ao comando
          </CardTitle>
          <CardDescription>
            Série dos últimos 30 dias por equipamento. Ordem encerrada pela varredura conta como
            ausência observada — nunca como laudo do equipamento.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Recalcular obediência ao comando"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : verdicts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma ordem encerrada na janela — sem série, não há veredito.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="destructive">{summary.deaf} sem prestar contas</Badge>
              <Badge variant="outline">{summary.suspect} engolindo ordens</Badge>
              <Badge variant="outline">{summary.failing} respondendo falha</Badge>
              <Badge variant="secondary">{summary.healthy} obedecendo</Badge>
              <Badge variant="outline">{summary.unknown} sem histórico</Badge>
            </div>

            <ul className="space-y-2">
              {[...actionable, ...quiet].slice(0, 12).map((v) => (
                <li
                  key={v.registrationId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{v.registrationId}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.sample} ordens · {v.silent} sem laudo ({pct(v.silentRate)}) ·{' '}
                      {v.declaredFailures} falhas declaradas
                      {v.unresolvedEffectful > 0 && (
                        <span className="text-destructive">
                          {' '}
                          · {v.unresolvedEffectful} ato(s) físico(s) de destino desconhecido
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant={STATE_VARIANT[v.state]}>{STATE_LABEL[v.state]}</Badge>
                </li>
              ))}
            </ul>
          </>
        )}

        {evaluatedAt !== null && (
          <p className="text-xs text-muted-foreground">
            Avaliado em {new Date(evaluatedAt).toLocaleString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
