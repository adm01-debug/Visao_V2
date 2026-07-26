import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CircuitBoard, RefreshCw, ShieldAlert, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/** Cabeçalho da última varredura, na ótica do controle de admissão. */
interface BudgetRunRow {
  ran_at: string;
  ok: boolean;
  agents_total: number;
  restarts_requested: number;
  restarts_admitted: number;
  restarts_deferred: number;
  restarts_suppressed: number;
  effective_budget: number;
  breaker_tripped: boolean;
  breaker_reason: string | null;
}

/** Reinício que a política impediu (`defer` ou `suppress`). */
interface BlockedActionRow {
  id: string;
  agent_id: string;
  action: string;
  severity: 'warning' | 'critical';
  reason: string;
  jitter_seconds: number;
  created_at: string;
}

const BLOCKED_LABEL: Record<string, string> = {
  defer: 'adiado por orçamento',
  suppress: 'suprimido pelo disjuntor',
};

/**
 * Onda 118 — Freio contra reinício em massa dos agentes locais.
 *
 * O valor deste card não é mostrar o que o sistema fez, e sim o que ele
 * deliberadamente NÃO fez. Quando um site inteiro cai, a ação correta é não
 * reiniciar nada e chamar um humano; sem esta visão, esse acerto pareceria
 * omissão. Somente leitura: quem decide é a rotina agendada no banco.
 */
export function AgentRestartBudgetCard() {
  const [run, setRun] = useState<BudgetRunRow | null>(null);
  const [blocked, setBlocked] = useState<BlockedActionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: runData, error: runError } = await supabase
      .from('agent_healing_runs')
      .select(
        'ran_at, ok, agents_total, restarts_requested, restarts_admitted, restarts_deferred, restarts_suppressed, effective_budget, breaker_tripped, breaker_reason',
      )
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (runError) {
      setError(runError.message ?? 'Falha ao carregar o orçamento de reinícios');
      setLoading(false);
      return;
    }
    setRun((runData as BudgetRunRow | null) ?? null);

    const { data, error: queryError } = await supabase
      .from('agent_healing_actions')
      .select('id, agent_id, action, severity, reason, jitter_seconds, created_at')
      .in('action', ['defer', 'suppress'])
      .order('created_at', { ascending: false })
      .limit(8);

    if (queryError) {
      setError(queryError.message ?? 'Falha ao carregar os reinícios bloqueados');
      setBlocked([]);
    } else {
      setBlocked((data ?? []) as BlockedActionRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const requested = run?.restarts_requested ?? 0;
  const admitted = run?.restarts_admitted ?? 0;
  const budget = run?.effective_budget ?? 0;
  const usage = budget > 0 ? Math.min(100, (admitted / budget) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <CircuitBoard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Freio de reinício em massa
          </CardTitle>
          <CardDescription>
            Reiniciar muitos agentes ao mesmo tempo não conserta uma queda de energia ou de link —
            só derruba o que ainda funcionava. A cura respeita um teto por varredura e é suspensa
            por inteiro quando boa parte da frota adoece junta.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Atualizar freio de reinício"
        >
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !run ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!loading && !error && !run ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma varredura de auto-cura registrada ainda.
          </p>
        ) : null}

        {run ? (
          <>
            {run.breaker_tripped ? (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Auto-cura suspensa: falha correlacionada</AlertTitle>
                <AlertDescription>
                  {run.breaker_reason ??
                    'Boa parte da frota adoeceu ao mesmo tempo; nenhum reinício foi executado.'}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Frota ativa" value={run.agents_total} />
              <Metric label="Reinícios pedidos" value={requested} />
              <Metric label="Executados" value={admitted} />
              <Metric
                label="Bloqueados"
                value={(run.restarts_deferred ?? 0) + (run.restarts_suppressed ?? 0)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Orçamento da varredura</span>
                <span>
                  {admitted} de {budget}
                </span>
              </div>
              <Progress value={usage} aria-label="Uso do orçamento de reinícios" />
            </div>

            <p className="text-xs text-muted-foreground">
              Última varredura{' '}
              {formatDistanceToNow(new Date(run.ran_at), { addSuffix: true, locale: ptBR })}.
            </p>
          </>
        ) : null}

        {blocked.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Reinícios impedidos recentemente</p>
            <ul className="space-y-2">
              {blocked.map((row) => (
                <li key={row.id} className="rounded-md border border-border p-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={row.action === 'suppress' ? 'destructive' : 'secondary'}>
                      {BLOCKED_LABEL[row.action] ?? row.action}
                    </Badge>
                    <span className="font-mono text-muted-foreground">
                      {row.agent_id.slice(0, 8)}
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                      <Timer className="h-3 w-3" aria-hidden="true" />
                      {row.jitter_seconds}s
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{row.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default AgentRestartBudgetCard;
