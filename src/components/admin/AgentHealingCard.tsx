import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, HeartPulse, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { AgentHealingAction } from '@/lib/agentHealing';

/** Cabeçalho da última varredura de auto-cura (`agent_healing_runs`). */
interface HealingRunRow {
  ran_at: string;
  ok: boolean;
  error_detail: string | null;
  agents_total: number;
  agents_warning: number;
  agents_critical: number;
  agents_escalated: number;
  actions_enqueued: number;
}

/** Ação individual registrada em `agent_healing_actions`. */
interface HealingActionRow {
  id: string;
  agent_id: string;
  action: Exclude<AgentHealingAction, 'none'>;
  severity: 'warning' | 'critical';
  reason: string;
  silent_minutes: number | null;
  attempts: number;
  created_at: string;
}

const ACTION_LABEL: Record<Exclude<AgentHealingAction, 'none'>, string> = {
  nudge: 'ping de verificação',
  restart: 'reinício automático',
  escalate: 'escalado para humano',
};

const ACTION_VARIANT: Record<
  Exclude<AgentHealingAction, 'none'>,
  'default' | 'destructive' | 'secondary' | 'outline'
> = {
  nudge: 'outline',
  restart: 'secondary',
  escalate: 'destructive',
};

/**
 * Onda 115 — Auto-cura dos agentes locais.
 *
 * Um agente travado não aparece como "agente com problema": aparece como
 * dezenas de "câmeras offline". Este card mostra o que a rotina automática
 * detectou e qual degrau da escada de cura foi aplicado. Somente leitura — as
 * ações são disparadas exclusivamente pela rotina agendada no banco.
 */
export function AgentHealingCard() {
  const [run, setRun] = useState<HealingRunRow | null>(null);
  const [rows, setRows] = useState<HealingActionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: runData, error: runError } = await supabase
      .from('agent_healing_runs')
      .select(
        'ran_at, ok, error_detail, agents_total, agents_warning, agents_critical, agents_escalated, actions_enqueued',
      )
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (runError) {
      setError(runError.message ?? 'Falha ao carregar a varredura de auto-cura');
      setLoading(false);
      return;
    }
    setRun((runData as HealingRunRow | null) ?? null);

    const { data, error: queryError } = await supabase
      .from('agent_healing_actions')
      .select('id, agent_id, action, severity, reason, silent_minutes, attempts, created_at')
      // 'defer'/'suppress' são decisões de admissão (Onda 118) e têm card próprio;
      // exibi-las aqui produziria rótulo vazio e confundiria a escada de cura.
      .in('action', ['nudge', 'restart', 'escalate'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (queryError) {
      setError(queryError.message ?? 'Falha ao carregar as ações de auto-cura');
      setRows([]);
    } else {
      setRows((data ?? []) as HealingActionRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const escalated = run?.agents_escalated ?? 0;
  const critical = run?.agents_critical ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Auto-cura dos agentes locais
          </CardTitle>
          <CardDescription>
            A cada 10 minutos o sistema procura agentes sem sinal de vida ou que pararam de consumir
            a fila e aplica uma escada de cura: ping, reinício e, por fim, escalonamento humano.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Atualizar varredura de auto-cura"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Não foi possível carregar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading && rows.length === 0 && !run ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={escalated > 0 || critical > 0 ? 'destructive' : 'outline'}>
                {escalated > 0
                  ? `${escalated} agente(s) sem resposta`
                  : critical > 0
                    ? `${critical} agente(s) em falha crítica`
                    : 'Frota de agentes saudável'}
              </Badge>
              {run && (
                <span className="text-xs text-muted-foreground">
                  {run.agents_total} agente(s) ativo(s) · {run.actions_enqueued} ação(ões) nesta
                  varredura ·{' '}
                  {formatDistanceToNow(new Date(run.ran_at), { addSuffix: true, locale: ptBR })}
                </span>
              )}
            </div>

            {run && !run.ok && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Última varredura falhou</AlertTitle>
                <AlertDescription>{run.error_detail ?? 'Motivo não registrado.'}</AlertDescription>
              </Alert>
            )}

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {run
                  ? 'Nenhuma intervenção necessária nos últimos 90 dias.'
                  : 'Nenhuma varredura registrada ainda.'}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={ACTION_VARIANT[r.action]}>{ACTION_LABEL[r.action]}</Badge>
                    <span className="font-mono">{r.agent_id.slice(0, 8)}</span>
                    {r.silent_minutes !== null && (
                      <span className="text-muted-foreground">
                        {Math.round(Number(r.silent_minutes))}min em silêncio
                      </span>
                    )}
                    <span className="text-muted-foreground">· tentativa {r.attempts + 1}</span>
                    <span className="text-muted-foreground">· {r.reason}</span>
                    <span className="text-muted-foreground">
                      ·{' '}
                      {formatDistanceToNow(new Date(r.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AgentHealingCard;
