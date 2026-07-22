/**
 * VISÃO - Página do Modo Teste
 * Lista em tempo real as detecções "sombra" (is_test=true) capturadas
 * durante uma sessão de dry-run.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Camera, Shield, RefreshCw, Trash2 } from 'lucide-react';
import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { useTestMode } from '@/hooks/useTestMode';
import { TestModeDialog } from '@/components/testMode/TestModeDialog';
import { TestModeCountdown } from '@/components/testMode/TestModeCountdown';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShadowExecution {
  id: string;
  rule_id: string;
  triggered_at: string;
  status: string;
  actions_executed: string[] | null;
  error_message: string | null;
  is_test: boolean;
  rule?: { name: string; category: string; severity: string } | null;
}

export default function TestModePage() {
  const { activeSession, stop, refetch: refetchSession } = useTestMode();
  const qc = useQueryClient();

  const {
    data: executions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['test-mode', 'executions'],
    queryFn: async (): Promise<ShadowExecution[]> => {
      const { data, error } = await supabase
        .from('rule_executions')
        .select('*, rule:rules(name, category, severity)')
        .eq('is_test', true)
        .order('triggered_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as ShadowExecution[]) ?? [];
    },
    refetchInterval: 10_000,
  });

  // Realtime: novos rule_executions marcados como test
  useEffect(() => {
    const channel = supabase
      .channel('test-mode-executions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rule_executions' },
        (payload) => {
          const row = payload.new as { is_test?: boolean };
          if (row.is_test) qc.invalidateQueries({ queryKey: ['test-mode', 'executions'] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const invokePromote = async (payload: { executionIds?: string[]; sessionId?: string }) => {
    const { data, error } = await supabase.functions.invoke('promote-test-executions', {
      body: payload,
    });
    if (error) {
      toast.error('Falha ao promover', { description: error.message });
      return;
    }
    const summary = data as { promoted: number; notified: number; failed: unknown[]; skipped: unknown[] };
    const parts = [
      `${summary.promoted} promovida(s)`,
      `${summary.notified} notificação(ões) reenviada(s)`,
    ];
    if (summary.failed.length) parts.push(`${summary.failed.length} falha(s)`);
    if (summary.skipped.length) parts.push(`${summary.skipped.length} ignorada(s)`);
    if (summary.failed.length > 0) {
      toast.warning('Promoção concluída com avisos', { description: parts.join(' · ') });
    } else {
      toast.success('Promoção concluída', { description: parts.join(' · ') });
    }
    await refetch();
  };

  const handlePromote = (id: string) => invokePromote({ executionIds: [id] });

  const handlePromoteSession = () => {
    if (!activeSession) return;
    void invokePromote({ sessionId: activeSession.id });
  };

  const handleDiscard = async (id: string) => {
    const { error } = await supabase.from('rule_executions').delete().eq('id', id);
    if (error) {
      toast.error('Falha ao descartar', { description: error.message });
      return;
    }
    toast.info('Execução descartada');
    await refetch();
  };


  return (
    <PageContent>
      <PageMeta
        title="Modo Teste"
        description="Valide detecções antes de promover para produção"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-warning/20 bg-warning/10 p-2.5">
            <FlaskConical className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Modo Teste (Dry-Run)</h1>
            <p className="text-sm text-muted-foreground">
              Observe detecções em janela controlada — sem disparar notificações.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          {!activeSession && <TestModeDialog />}
        </div>
      </div>

      {activeSession ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-warning" />
                Sessão ativa
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handlePromoteSession}
                  disabled={executions.length === 0}
                  title="Remove is_test e reenvia notificações de todas as detecções da sessão"
                >
                  <Camera className="mr-1 h-3.5 w-3.5" />
                  Promover sessão ({executions.length})
                </Button>
                <Button size="sm" variant="outline" onClick={() => stop()}>
                  Encerrar agora
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-4">
            <div>
              <div className="text-muted-foreground">Escopo</div>
              <div className="font-medium capitalize">
                {activeSession.scope === 'all' ? 'Todos' : activeSession.scope}
                {activeSession.scope !== 'all' && ` · ${activeSession.scope_ids.length}`}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Duração</div>
              <div className="font-medium">{activeSession.duration_minutes} min</div>
            </div>
            <div>
              <div className="text-muted-foreground">Restante</div>
              <div className="font-medium">
                <TestModeCountdown
                  expiresAt={activeSession.expires_at}
                  onExpire={() => refetchSession()}
                />
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Detecções capturadas</div>
              <div className="font-medium">{executions.length}</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={FlaskConical}
              title="Nenhuma sessão de teste ativa"
              description="Inicie uma janela de dry-run para validar regras e zonas sem disparar notificações."
            />
            <div className="mt-4 flex justify-center">
              <TestModeDialog />
            </div>
          </CardContent>
        </Card>

      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detecções em sombra (últimas 100)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : executions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma detecção capturada ainda. Assim que uma regra em teste for satisfeita, ela
              aparecerá aqui.
            </p>
          ) : (
            <ScrollArea className="h-[480px] pr-3">
              <ul className="space-y-2">
                {executions.map((exec) => (
                  <li
                    key={exec.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-card/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {exec.rule?.name ?? 'Regra removida'}
                          {exec.rule?.severity && (
                            <Badge variant="outline" className="text-xs">
                              {exec.rule.severity}
                            </Badge>
                          )}
                          <Badge className="bg-warning/20 text-warning-foreground text-xs">
                            dry-run
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(exec.triggered_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                          {exec.actions_executed?.length
                            ? ` · Ações que seriam disparadas: ${exec.actions_executed.join(', ')}`
                            : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromote(exec.id)}
                        title="Remove a flag de teste e mantém como execução real"
                      >
                        <Camera className="mr-1 h-3.5 w-3.5" />
                        Promover
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDiscard(exec.id)}
                        title="Excluir esta execução de teste"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </PageContent>
  );
}
