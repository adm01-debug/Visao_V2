import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Link2Off, RefreshCw, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface MissingFkIndex {
  schema_name: string;
  table_name: string;
  constraint_name: string;
  fk_columns: string;
  referenced_table: string;
  table_size_pretty: string;
  suggested_index: string;
}

export function MissingFkIndexesCard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-missing-fk-indexes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_missing_fk_indexes');
      if (error) throw error;
      return (data ?? []) as MissingFkIndex[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const copyDdl = async (sql: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      toast.success('DDL copiada para a área de transferência');
    } catch {
      toast.error('Falha ao copiar');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2Off className="h-4 w-4" /> FKs sem índice
          </CardTitle>
          <CardDescription>
            Chaves estrangeiras sem índice de suporte — degradam DELETE/UPDATE em cascata e joins.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Atualizar FKs sem índice"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {(error as Error).message}
          </div>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todas as FKs estão indexadas. ✅</p>
        ) : (
          <>
            <Badge variant={data.length > 5 ? 'destructive' : 'outline'}>
              {data.length} FKs sem índice
            </Badge>
            <ScrollArea className="h-64 rounded-md border">
              <ul className="divide-y">
                {data.map((fk) => (
                  <li key={`${fk.schema_name}.${fk.constraint_name}`} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono truncate">
                        {fk.table_name} ({fk.fk_columns}) → {fk.referenced_table}
                      </code>
                      <Badge variant="secondary">{fk.table_size_pretty}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted rounded px-2 py-1 flex-1 truncate">
                        {fk.suggested_index}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyDdl(fk.suggested_index)}
                        aria-label={`Copiar DDL de ${fk.constraint_name}`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
