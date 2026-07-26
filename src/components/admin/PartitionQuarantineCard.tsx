import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, FlaskConical, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/** Linha da RPC `get_partition_quarantine_summary` (admin-only). */
interface QuarantineRow {
  parent: string;
  default_part: string;
  key_column: string;
  null_key: number;
  pre_2000: number;
  far_past: number;
  far_future: number;
  sentinel: number;
  drainable: number;
  orphan_owner: number;
  total_quarantined: number;
}

/** Recorte usado da telemetria `partition_quarantine_runs`. */
interface QuarantineRun {
  ran_at: string;
  duration_ms: number | null;
  total_quarantined: number;
  total_drainable: number;
  locked_out: boolean;
  ok: boolean;
  error_detail: string | null;
}

/** Mesmo limite do gate `npm run db:check:quarantine`. */
const QUARANTINE_ALERT_THRESHOLD = 10_000;

/** Rótulos legíveis para cada grupo de anomalia temporal. */
const BUCKETS: ReadonlyArray<{ key: keyof QuarantineRow; label: string; hint: string }> = [
  { key: 'null_key', label: 'Sem data', hint: 'Registro chegou sem data de referência' },
  { key: 'pre_2000', label: 'Anterior a 2000', hint: 'Relógio do equipamento zerado (RTC sem bateria)' },
  { key: 'far_past', label: 'Passado antigo', hint: 'Fora da janela de cobertura das partições' },
  { key: 'far_future', label: 'Futuro distante', hint: 'Data adiantada além da cobertura' },
  { key: 'sentinel', label: 'Sentinela', hint: 'Valor fixo de firmware (ex.: ano 9999)' },
  { key: 'orphan_owner', label: 'Sem dono', hint: 'Registro sem usuário associado' },
];

/**
 * Onda 109 — Observabilidade da quarentena das partições.
 *
 * A drenagem move o que é recuperável; o que resta são registros com datas
 * implausíveis. Esta rotina apenas os CLASSIFICA — nunca corrige nem apaga —
 * para que a decisão sobre evidência de vigilância seja sempre humana.
 */
export function PartitionQuarantineCard() {
  const [rows, setRows] = useState<QuarantineRow[]>([]);
  const [lastRun, setLastRun] = useState<QuarantineRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [summaryRes, runRes] = await Promise.all([
      supabase.rpc('get_partition_quarantine_summary'),
      supabase
        .from('partition_quarantine_runs')
        .select('ran_at, duration_ms, total_quarantined, total_drainable, locked_out, ok, error_detail')
        .order('ran_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (summaryRes.error) {
      setError(summaryRes.error.message ?? 'Falha ao carregar a triagem da quarentena');
      setRows([]);
    } else {
      setRows(((summaryRes.data ?? []) as QuarantineRow[]).slice());
    }

    setLastRun(runRes.error ? null : ((runRes.data as QuarantineRun | null) ?? null));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = rows.reduce((sum, row) => sum + Number(row.total_quarantined ?? 0), 0);
  const critical = total > QUARANTINE_ALERT_THRESHOLD;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Triagem da quarentena
          </CardTitle>
          <CardDescription>
            Registros com datas impossíveis são classificados diariamente — nenhum deles é
            corrigido ou removido automaticamente.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Atualizar triagem da quarentena"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Não foi possível carregar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading && rows.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={critical ? 'destructive' : total > 0 ? 'secondary' : 'outline'}>
                {total.toLocaleString('pt-BR')} registro(s) em quarentena
              </Badge>
              {critical && (
                <span className="text-xs text-destructive">
                  Acima do limite de {QUARANTINE_ALERT_THRESHOLD.toLocaleString('pt-BR')} — verifique
                  o relógio das câmeras
                </span>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma triagem disponível ainda. A classificação roda todo dia às 02:57.
              </p>
            ) : (
              <ul className="space-y-3">
                {rows.map((row) => (
                  <li key={row.default_part} className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">{row.parent}</span>
                      <span className="text-muted-foreground">
                        {Number(row.total_quarantined ?? 0).toLocaleString('pt-BR')} em quarentena
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {BUCKETS.map(({ key, label, hint }) => {
                        const value = Number(row[key] ?? 0);
                        if (value === 0) return null;
                        return (
                          <Badge key={key} variant="secondary" title={hint} className="font-normal">
                            {label}: {value.toLocaleString('pt-BR')}
                          </Badge>
                        );
                      })}
                      {Number(row.drainable ?? 0) > 0 && (
                        <Badge
                          variant="outline"
                          title="Ainda dentro da janela de cobertura — será movido na próxima drenagem"
                          className="font-normal"
                        >
                          A drenar: {Number(row.drainable).toLocaleString('pt-BR')}
                        </Badge>
                      )}
                      {Number(row.total_quarantined ?? 0) === 0 &&
                        Number(row.drainable ?? 0) === 0 && (
                          <span className="text-xs text-muted-foreground">Balde limpo</span>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-border pt-3 text-sm">
              {!lastRun ? (
                <p className="text-muted-foreground">A triagem ainda não foi executada.</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={lastRun.ok ? 'outline' : 'destructive'}>
                      {lastRun.ok ? 'última execução OK' : 'última execução falhou'}
                    </Badge>
                    {lastRun.locked_out && <Badge variant="secondary">adiada por trava</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(lastRun.ran_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {lastRun.total_quarantined.toLocaleString('pt-BR')} em quarentena ·{' '}
                    {lastRun.total_drainable.toLocaleString('pt-BR')} a drenar
                    {lastRun.duration_ms != null ? ` · ${lastRun.duration_ms} ms` : ''}
                  </p>
                  {lastRun.error_detail && !lastRun.ok && (
                    <p className="text-xs text-destructive">{lastRun.error_detail}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
