import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioTower, RefreshCw } from 'lucide-react';
import {
  HEARTBEAT_MINUTES,
  type DeviceSilenceState,
  type DeviceSilenceSummary,
  type DeviceSilenceVerdict,
} from '@/lib/devices/deviceSilence';

interface DeviceSilenceCardProps {
  readonly verdicts: readonly DeviceSilenceVerdict[];
  readonly summary: DeviceSilenceSummary;
  readonly evaluatedAt: number | null;
  readonly isLoading: boolean;
  readonly onRefresh: () => void;
}

/**
 * Rótulos em português. Note que nenhum estado silencioso é rotulado como
 * "ok": "aguardando instalação" e "silêncio esperado" são fatos diferentes de
 * saúde, e achatá-los em "tudo certo" esconderia uma instalação que nunca
 * terminou.
 */
const STATE_LABEL: Record<DeviceSilenceState, string> = {
  ok: 'em dia',
  expected_silence: 'silêncio esperado',
  awaiting_first_contact: 'aguardando 1ª conexão',
  enrollment_lapsed: 'instalação não concluída',
  rejected_presence: 'chegando e recusado',
  rotation_grace: 'carência de rotação',
  silent_warn: 'atrasado',
  silent_critical: 'sem se apresentar',
  clock_anomaly: 'relógio inconsistente',
};

const STATE_VARIANT: Record<DeviceSilenceState, 'secondary' | 'outline' | 'destructive'> = {
  ok: 'secondary',
  expected_silence: 'outline',
  awaiting_first_contact: 'outline',
  enrollment_lapsed: 'outline',
  rejected_presence: 'destructive',
  rotation_grace: 'outline',
  silent_warn: 'outline',
  silent_critical: 'destructive',
  clock_anomaly: 'outline',
};

const silenceLabel = (minutes: number | null): string => {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
};

/**
 * Onda 192 — presença dos equipamentos registrados no console de manutenção.
 *
 * Sem esta tela, o silêncio de um gravador só apareceria como notificação: o
 * operador não teria onde perguntar "quem está fora agora?" — nem distinguir
 * quem caiu de quem está sendo recusado por credencial.
 */
export function DeviceSilenceCard({
  verdicts,
  summary,
  evaluatedAt,
  isLoading,
  onRefresh,
}: DeviceSilenceCardProps) {
  const actionable = verdicts.filter((v) => v.severity !== null);
  const quiet = verdicts.filter((v) => v.severity === null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <RadioTower className="h-4 w-4 text-primary" aria-hidden="true" />
            Presença dos equipamentos
          </CardTitle>
          <CardDescription>
            Cadência esperada de {HEARTBEAT_MINUTES} min. Equipamento revogado ou com prazo vencido
            não gera alerta — o silêncio dele é intencional.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Atualizar presença dos equipamentos"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Registrados', value: summary.total },
                { label: 'Em dia', value: summary.ok },
                { label: 'Acionáveis', value: summary.actionable },
                { label: 'Silêncio esperado', value: summary.quiet },
              ].map((item) => (
                <div key={item.label} className="rounded-md border border-border p-3">
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                  <dd className="text-xl font-semibold tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>

            {summary.total === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum equipamento registrado ainda.</p>
            )}

            {summary.total > 0 && actionable.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum equipamento exigindo atenção agora.
              </p>
            )}

            {actionable.length > 0 && (
              <ul className="space-y-2">
                {actionable.map((v) => (
                  <li
                    key={v.registrationId}
                    className="flex flex-col gap-1 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">{v.deviceCode}</code>
                        <Badge variant={STATE_VARIANT[v.state]}>{STATE_LABEL[v.state]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{v.reason}</p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {silenceLabel(v.silenceMinutes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {quiet.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quiet.map((v) => (
                  <Badge key={v.registrationId} variant={STATE_VARIANT[v.state]} className="gap-1">
                    <span className="font-mono text-[0.7rem]">{v.deviceCode}</span>
                    <span className="text-muted-foreground">{STATE_LABEL[v.state]}</span>
                  </Badge>
                ))}
              </div>
            )}

            {evaluatedAt !== null && (
              <p className="text-xs text-muted-foreground">
                Avaliado em {new Date(evaluatedAt).toLocaleString('pt-BR')}.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
