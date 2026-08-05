import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, RefreshCw, ScrollText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAgentHealingTrail } from '@/hooks/useAgentHealingTrail';
import {
  ACTION_LABEL,
  ACTION_TONE,
  explainHealingDecision,
  summarizeHealingTrail,
  type HealingTrailTone,
} from '@/lib/agents/healingTrail';

/**
 * Onda 140 — rastro de decisão do auto-healing na saúde da frota.
 *
 * Os cards das Ondas 115 e 118 mostram o que a máquina fez e o que o orçamento
 * bloqueou, mas a ação `observe` — a decisão deliberada de registrar sem tocar
 * no agente — nunca chegava à tela. Do ponto de vista do operador, um episódio
 * observado era indistinguível de um episódio ignorado. Este painel fecha essa
 * lacuna respondendo a duas perguntas: qual regra vetou, e o que teria
 * acontecido sem o veto.
 *
 * Somente leitura: nenhuma escrita, nenhum botão de ação sobre o agente.
 */

const TONE_CLASS: Record<HealingTrailTone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  info: 'bg-primary/15 text-primary border-primary/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  destructive: 'bg-destructive/15 text-destructive border-destructive/30',
};

function relativeTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'momento desconhecido';
  return formatDistanceToNow(parsed, { addSuffix: true, locale: ptBR });
}

export function AgentHealingTrailCard() {
  const { data, isLoading, isFetching, error, refetch } = useAgentHealingTrail({ limit: 20 });
  const entries = data ?? [];
  const summary = summarizeHealingTrail(entries);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Rastro de decisão do auto-healing
          </CardTitle>
          <CardDescription>
            Por que um agente foi apenas observado — e o que o veto impediu de acontecer.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Atualizar rastro de decisão"
        >
          <RefreshCw
            className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
            aria-hidden="true"
          />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar o rastro</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Erro desconhecido ao consultar o banco.'}
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-2" aria-hidden="true">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma decisão contida registrada nas últimas varreduras. Quando a máquina optar por
            não agir, o motivo aparece aqui.
          </p>
        )}

        {!isLoading && entries.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={TONE_CLASS.info}>
                <Eye className="mr-1 h-3 w-3" aria-hidden="true" />
                {summary.observed} observado(s)
              </Badge>
              <Badge variant="outline" className={TONE_CLASS.warning}>
                {summary.vetoed} reinício(s) contido(s)
              </Badge>
              {summary.byRule.slice(0, 3).map((rule) => (
                <Badge key={rule.rule} variant="secondary">
                  {rule.label} · {rule.count}
                </Badge>
              ))}
            </div>

            <ul className="space-y-3">
              {entries.map((entry) => {
                const explanation = explainHealingDecision(entry);
                return (
                  <li key={entry.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={TONE_CLASS[ACTION_TONE[entry.action]]}>
                        {ACTION_LABEL[entry.action]}
                      </Badge>
                      <Badge variant="secondary">{explanation.ruleLabel}</Badge>
                      <span className="text-sm font-medium text-foreground">
                        {entry.agentName || entry.agentId.slice(0, 8)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {relativeTime(entry.createdAt)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">{explanation.ladderReason}</p>

                    {explanation.arbiterReason && (
                      <p className="mt-1 text-sm text-foreground">
                        <span className="font-medium">Veto: </span>
                        {explanation.arbiterReason}
                      </p>
                    )}

                    {explanation.counterfactual && (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        {explanation.counterfactual}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-muted-foreground">
                      {entry.attempts} tentativa(s)
                      {entry.silentMinutes !== null &&
                        ` · ${entry.silentMinutes} min sem heartbeat`}
                      {entry.deafRatio !== null &&
                        ` · surdez ${(entry.deafRatio * 100).toFixed(1)}%`}
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AgentHealingTrailCard;
