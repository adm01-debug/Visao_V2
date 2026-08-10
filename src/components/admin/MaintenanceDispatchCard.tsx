import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/** Canais externos suportados pelo despachante da Onda 111. */
type DispatchChannel = 'telegram' | 'email';

/** Situação de uma tentativa de notificação externa. */
type DispatchStatus = 'sent' | 'failed' | 'skipped';

/** Linha de `maintenance_alert_dispatches` (leitura admin-only via RLS). */
interface DispatchRow {
  id: string;
  alert_id: string;
  channel: DispatchChannel;
  status: DispatchStatus;
  attempts: number;
  last_attempt_at: string;
  last_error: string | null;
}

const CHANNEL_LABEL: Record<DispatchChannel, string> = {
  telegram: 'Telegram',
  email: 'E-mail',
};

const STATUS_LABEL: Record<DispatchStatus, string> = {
  sent: 'entregue',
  failed: 'falhou',
  skipped: 'ignorado',
};

const STATUS_VARIANT: Record<DispatchStatus, 'default' | 'destructive' | 'outline'> = {
  sent: 'default',
  failed: 'destructive',
  skipped: 'outline',
};

/**
 * Onda 111 — Entrega externa dos alertas de manutenção.
 *
 * Detectar rotina parada sem avisar ninguém é apenas telemetria decorativa.
 * Este card mostra o que efetivamente saiu do sistema (e o que falhou),
 * separado do card de vigilância para manter cada componente enxuto.
 */
export function MaintenanceDispatchCard() {
  const [rows, setRows] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('maintenance_alert_dispatches')
      .select('id, alert_id, channel, status, attempts, last_attempt_at, last_error')
      .order('last_attempt_at', { ascending: false })
      .limit(12);

    if (queryError) {
      setError(queryError.message ?? 'Falha ao carregar o histórico de envios');
      setRows([]);
    } else {
      setRows((data ?? []) as DispatchRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const failedCount = rows.filter((r) => r.status === 'failed').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Entrega dos alertas
          </CardTitle>
          <CardDescription>
            A cada hora os alertas críticos abertos são enviados aos canais externos configurados,
            com deduplicação por alerta e backoff exponencial em caso de falha.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Atualizar histórico de envios"
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
        ) : loading && rows.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          <>
            <Badge variant={failedCount > 0 ? 'destructive' : 'outline'}>
              {failedCount > 0
                ? `${failedCount} envio(s) com falha`
                : 'Nenhuma falha de entrega recente'}
            </Badge>

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum envio registrado — ou não há alerta crítico, ou nenhum canal externo está
                configurado.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    <span className="font-medium">{CHANNEL_LABEL[r.channel] ?? r.channel}</span>
                    <span className="text-muted-foreground">
                      {r.attempts} tentativa{r.attempts === 1 ? '' : 's'}
                    </span>
                    {r.last_error && (
                      <span className="text-muted-foreground">· {r.last_error}</span>
                    )}
                    <span className="text-muted-foreground">
                      ·{' '}
                      {formatDistanceToNow(new Date(r.last_attempt_at), {
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

export default MaintenanceDispatchCard;
