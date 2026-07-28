import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link2Off, RefreshCw } from 'lucide-react';
import {
  TREND_WINDOW_HOURS,
  type BridgeAssessment,
  type BridgeVerdict,
} from '@/lib/retention/episodeBridgeWatch';
import { ABANDONED_OPEN_DAYS } from '@/lib/retention/episodeReconciliation';

interface EpisodeBridgeCardProps {
  readonly assessment: BridgeAssessment;
  readonly evaluatedAt: number | null;
  readonly isLoading: boolean;
  readonly onRefresh: () => void;
  /** Onda 187 — dispara a reconciliação no servidor. */
  readonly onReconcile?: () => void;
  readonly isReconciling?: boolean;
  readonly canReconcile?: boolean;
}

/**
 * Rótulos em português. `insufficient_data` diz "sem leitura suficiente" e
 * NUNCA "tudo certo": apresentar ignorância como saúde é o defeito que esta
 * família de painéis já pagou uma vez.
 */
const VERDICT_LABEL: Record<BridgeVerdict, string> = {
  insufficient_data: 'sem leitura suficiente',
  healthy: 'em dia',
  tolerated: 'ruído tolerado',
  draining: 'drenando',
  growing: 'crescendo',
  stuck: 'travada',
};

const VERDICT_VARIANT: Record<BridgeVerdict, 'secondary' | 'outline' | 'destructive'> = {
  insufficient_data: 'outline',
  healthy: 'secondary',
  tolerated: 'secondary',
  draining: 'secondary',
  growing: 'outline',
  stuck: 'destructive',
};

const growthLabel = (growth: number): string =>
  growth > 0 ? `+${growth}` : growth === 0 ? 'estável' : String(growth);

/**
 * Onda 186 — o veredito do vigia (Onda 185) na frente do operador.
 *
 * Sem esta tela o único consumidor do vigia era o alerta noturno: o plantão
 * descobria a ponte travada por notificação, nunca ao abrir o console.
 */
export function EpisodeBridgeCard({
  assessment,
  evaluatedAt,
  isLoading,
  onRefresh,
  onReconcile,
  isReconciling = false,
  canReconcile = false,
}: EpisodeBridgeCardProps) {
  const unknown = assessment.verdict === 'insufficient_data';
  // A ação só aparece quando existe passivo medido. Oferecer "reconciliar" com
  // veredito desconhecido convidaria o operador a agir sobre um número que o
  // sistema admite não saber.
  const showReconcile =
    onReconcile !== undefined && canReconcile && !unknown && assessment.latest > 0;


  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Link2Off className="h-5 w-5 text-primary" aria-hidden="true" />
            Ponte de episódios
          </CardTitle>
          <CardDescription>
            Episódios de alarme que ficaram abertos além do prazo. O sinal é o crescimento na
            janela de {TREND_WINDOW_HOURS}h, não o número absoluto — fila que só sobe indica que
            nada está sendo fechado.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Atualizar veredito da ponte de episódios"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={VERDICT_VARIANT[assessment.verdict]}>
                {VERDICT_LABEL[assessment.verdict]}
              </Badge>
              {assessment.severity !== null && (
                <Badge variant={assessment.severity === 'critical' ? 'destructive' : 'outline'}>
                  {assessment.severity === 'critical' ? 'crítico' : 'atenção'}
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">{assessment.reason}</p>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Agora</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {unknown ? '—' : assessment.latest}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Base da janela</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {unknown ? '—' : assessment.baseline}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Variação</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {unknown ? '—' : growthLabel(assessment.growth)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Execuções lidas</dt>
                <dd className="text-lg font-semibold tabular-nums">{assessment.samples}</dd>
              </div>
            </dl>

            {evaluatedAt !== null && (
              <p className="text-xs text-muted-foreground">
                Avaliado em {new Date(evaluatedAt).toLocaleString('pt-BR')}.
              </p>
            )}

            {showReconcile && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isReconciling}>
                    {isReconciling ? 'Reconciliando…' : 'Reconciliar abandonados'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar episódios abandonados?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Episódios abertos há mais de {ABANDONED_OPEN_DAYS} dias serão encerrados no
                      corte declarado de {ABANDONED_OPEN_DAYS} dias após a abertura — nunca no
                      horário de agora, para não registrar durações que ninguém mediu. A duração
                      resultante fica marcada como reconciliada, e não como observada. A ação é
                      irreversível e fica registrada na auditoria.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onReconcile}>Reconciliar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

          </>
        )}
      </CardContent>
    </Card>
  );
}
