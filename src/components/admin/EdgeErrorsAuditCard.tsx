import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EdgeErrorRow {
  id: string;
  function_name: string;
  error_code: string;
  http_status: number | null;
  target_ip: string | null;
  target_host: string | null;
  run_from: string;
  relay_agent_id: string | null;
  camera_id: string | null;
  message: string | null;
  hint: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

const RUN_FROM_LABEL: Record<string, string> = {
  cloud: 'Nuvem',
  relay: 'Relé',
  agent: 'Agente Local',
  client: 'Cliente',
};

const RUN_FROM_TONE: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  cloud: 'secondary',
  relay: 'default',
  agent: 'outline',
  client: 'outline',
};

/**
 * Painel administrativo de erros das Edge Functions — permite filtrar por função,
 * código, IP alvo e origem de execução (run_from) para acelerar troubleshooting.
 * Acesso restrito a admins via RLS (`has_role(auth.uid(), 'admin')`).
 */
export function EdgeErrorsAuditCard() {
  const [functionFilter, setFunctionFilter] = useState<string>('all');
  const [runFromFilter, setRunFromFilter] = useState<string>('all');
  const [ipFilter, setIpFilter] = useState<string>('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['edge-errors-audit', functionFilter, runFromFilter, ipFilter],
    queryFn: async (): Promise<EdgeErrorRow[]> => {
      let query = supabase
        .from('edge_function_error_audit')
        .select(
          'id,function_name,error_code,http_status,target_ip,target_host,run_from,relay_agent_id,camera_id,message,hint,context,created_at'
        )
        .order('created_at', { ascending: false })
        .limit(200);
      if (functionFilter !== 'all') query = query.eq('function_name', functionFilter);
      if (runFromFilter !== 'all') query = query.eq('run_from', runFromFilter);
      const trimmedIp = ipFilter.trim();
      if (trimmedIp) query = query.eq('target_ip', trimmedIp);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as EdgeErrorRow[];
    },
    staleTime: 15_000,
    retry: 1,
  });

  const functionOptions = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((r) => set.add(r.function_name));
    return Array.from(set).sort();
  }, [data]);

  const summary = useMemo(() => {
    const rows = data ?? [];
    const byCode = new Map<string, number>();
    rows.forEach((r) => byCode.set(r.error_code, (byCode.get(r.error_code) ?? 0) + 1));
    return Array.from(byCode.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [data]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
          Auditoria de erros — Edge Functions
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Atualizar auditoria"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3">
          <Select value={functionFilter} onValueChange={setFunctionFilter}>
            <SelectTrigger aria-label="Filtrar por função">
              <SelectValue placeholder="Função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              {functionOptions.map((fn) => (
                <SelectItem key={fn} value={fn}>
                  {fn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={runFromFilter} onValueChange={setRunFromFilter}>
            <SelectTrigger aria-label="Filtrar por origem">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              <SelectItem value="cloud">Nuvem</SelectItem>
              <SelectItem value="relay">Relé</SelectItem>
              <SelectItem value="agent">Agente Local</SelectItem>
              <SelectItem value="client">Cliente</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Filtrar por IP alvo (ex.: 192.168.3.30)"
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            aria-label="Filtrar por IP alvo"
          />
        </div>

        {summary.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {summary.map(([code, count]) => (
              <Badge key={code} variant="secondary" className="text-xs">
                {code} · {count}
              </Badge>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            Não foi possível carregar a auditoria. Requer perfil de administrador.
          </p>
        )}

        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum erro registrado nos filtros selecionados.
          </p>
        )}

        {!isLoading && !isError && (data?.length ?? 0) > 0 && (
          <ScrollArea className="h-[420px] pr-2">
            <ul className="space-y-2">
              {data!.map((row) => (
                <li key={row.id} className="rounded-md border border-border bg-card/50 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {row.error_code}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.function_name}
                    </span>
                    <Badge variant={RUN_FROM_TONE[row.run_from] ?? 'outline'} className="text-xs">
                      {RUN_FROM_LABEL[row.run_from] ?? row.run_from}
                    </Badge>
                    {row.http_status !== null && row.http_status !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        HTTP {row.http_status}
                      </Badge>
                    )}
                    {row.target_ip && (
                      <span className="font-mono text-xs text-muted-foreground">
                        IP: {row.target_ip}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(row.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  {(row.message || row.hint) && (
                    <p className="mt-2 text-xs text-muted-foreground">{row.message ?? row.hint}</p>
                  )}
                  {(row.target_host || row.camera_id) && (
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
                      {row.target_host && <>host: {row.target_host}</>}
                      {row.target_host && row.camera_id && ' · '}
                      {row.camera_id && <>camera: {row.camera_id.slice(0, 8)}…</>}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
