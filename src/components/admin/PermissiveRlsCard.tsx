import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Row {
  schemaname: string;
  tablename: string;
  policyname: string;
  cmd: string;
  roles: string[];
  qual: string;
  with_check: string;
  severity: 'critical' | 'warn' | 'info';
  recommendation: string;
}

export function PermissiveRlsCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['permissive-rls-policies'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_permissive_rls_policies' as never);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const rows = data ?? [];
  const criticals = rows.filter((r) => r.severity === 'critical').length;

  const badgeVariant = (s: Row['severity']) =>
    s === 'critical' ? 'destructive' : s === 'warn' ? 'secondary' : 'outline';

  const copyDrop = async (r: Row) => {
    const sql = `DROP POLICY "${r.policyname}" ON ${r.schemaname}.${r.tablename};`;
    await navigator.clipboard.writeText(sql);
    toast.success('Comando DROP POLICY copiado');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Políticas RLS permissivas
            {criticals > 0 && <Badge variant="destructive">{criticals} crítica(s)</Badge>}
          </CardTitle>
          <CardDescription>
            Detecta políticas com USING (true) ou sem cláusula, que podem expor dados.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma política permissiva detectada no schema public. ✅
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={`${r.schemaname}.${r.tablename}.${r.policyname}`}
                className="rounded-md border border-border p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={badgeVariant(r.severity)}>{r.severity}</Badge>
                    <Badge variant="outline">{r.cmd}</Badge>
                    <span className="font-mono text-sm">
                      {r.schemaname}.{r.tablename}
                    </span>
                    <span className="text-xs text-muted-foreground">· {r.policyname}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copyDrop(r)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar DROP
                  </Button>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  roles: {r.roles?.join(', ') || '—'}
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  USING: {r.qual || '∅'}
                </div>
                {r.with_check && (
                  <div className="text-xs font-mono text-muted-foreground">
                    WITH CHECK: {r.with_check}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{r.recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
