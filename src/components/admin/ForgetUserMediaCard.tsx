import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Trash2, ShieldAlert, ScrollText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ForgetResponse {
  dry_run?: boolean;
  would_delete?: number;
  deleted?: number;
  legal_hold_skipped?: number;
  failed?: number;
  audit_id?: string;
  error?: string;
}

interface AuditEntry {
  id: string;
  subject_user_id: string;
  requested_by: string;
  dry_run: boolean;
  hot_deleted: number | null;
  warm_deleted: number | null;
  cold_deleted: number | null;
  legal_hold_skipped: number | null;
  created_at: string;
}

function clampBatch(n: number): number {
  if (!Number.isFinite(n)) return 100;
  return Math.min(500, Math.max(1, Math.floor(n)));
}

export function ForgetUserMediaCard() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [batchSize, setBatchSize] = useState(100);
  const [dryRun, setDryRun] = useState(true);
  const [lastResult, setLastResult] = useState<ForgetResponse | null>(null);

  const trimmed = userId.trim();
  const isValid = UUID_RE.test(trimmed);
  const reasonOk = dryRun || reason.trim().length >= 5;

  const auditQuery = useQuery({
    queryKey: ['media-forget-audit'],
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await supabase
        .from('media_forget_audit')
        .select('id, subject_user_id, requested_by, dry_run, hot_deleted, warm_deleted, cold_deleted, legal_hold_skipped, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
    staleTime: 15_000,
  });

  const mutation = useMutation({
    mutationFn: async (): Promise<ForgetResponse> => {
      const { data, error } = await supabase.functions.invoke('forget-user-media', {
        body: { user_id: trimmed, dry_run: dryRun, batch_size: clampBatch(batchSize) },
      });
      if (error) throw error;
      return (data ?? {}) as ForgetResponse;
    },
    onSuccess: (data) => {
      setLastResult(data);
      const label = data.dry_run
        ? `Simulação: ${data.would_delete ?? 0} ativos elegíveis`
        : `Removidos: ${data.deleted ?? 0}`;
      toast.success(label, {
        description: data.legal_hold_skipped
          ? `${data.legal_hold_skipped} ignorados por retenção legal`
          : undefined,
      });
      qc.invalidateQueries({ queryKey: ['media-forget-audit'] });
      qc.invalidateQueries({ queryKey: ['storage-tier-stats'] });
    },
    onError: (err: Error) => {
      toast.error('Falha ao executar esquecimento', { description: err.message });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden />
          <CardTitle>Direito ao Esquecimento (LGPD)</CardTitle>
        </div>
        <CardDescription>
          Remove permanentemente as mídias do usuário nos três tiers (Hot/Warm/Cold). Ativos sob retenção legal
          são preservados. Toda execução é registrada em trilha imutável.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr,140px,auto]">
          <div className="space-y-1">
            <Label htmlFor="forget-user-id">User ID (UUID)</Label>
            <Input
              id="forget-user-id"
              placeholder="00000000-0000-0000-0000-000000000000"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              aria-invalid={userId.length > 0 && !isValid}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="forget-batch">Batch (1–500)</Label>
            <Input
              id="forget-batch"
              type="number"
              min={1}
              max={500}
              value={batchSize}
              onChange={(e) => setBatchSize(clampBatch(Number(e.target.value)))}
            />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Switch id="forget-dryrun" checked={dryRun} onCheckedChange={setDryRun} />
            <Label htmlFor="forget-dryrun" className="cursor-pointer">Dry run</Label>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant={dryRun ? 'secondary' : 'destructive'}
              disabled={!isValid || mutation.isPending}
              className="w-full md:w-auto"
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {dryRun ? 'Simular esquecimento' : 'Executar esquecimento'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {dryRun ? 'Confirmar simulação?' : 'Confirmar remoção permanente?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {dryRun
                  ? 'Nenhum dado será removido. Apenas contabiliza o impacto.'
                  : 'Esta ação é IRREVERSÍVEL. As mídias do usuário serão apagadas nos três tiers e registradas em auditoria.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => mutation.mutate()}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {lastResult && !lastResult.error && (
          <Alert>
            <AlertTitle>{lastResult.dry_run ? 'Prévia da simulação' : 'Execução concluída'}</AlertTitle>
            <AlertDescription className="flex flex-wrap gap-2 pt-2">
              {lastResult.dry_run ? (
                <Badge variant="secondary">Elegíveis: {lastResult.would_delete ?? 0}</Badge>
              ) : (
                <Badge variant="default">Removidos: {lastResult.deleted ?? 0}</Badge>
              )}
              {(lastResult.legal_hold_skipped ?? 0) > 0 && (
                <Badge variant="outline">Legal hold: {lastResult.legal_hold_skipped}</Badge>
              )}
              {(lastResult.failed ?? 0) > 0 && (
                <Badge variant="destructive">Falhas: {lastResult.failed}</Badge>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ScrollText className="h-4 w-4" aria-hidden />
            Últimas 10 execuções
          </div>
          <ScrollArea className="h-56 rounded-md border">
            <div className="divide-y">
              {auditQuery.isLoading && (
                <div className="p-3 text-sm text-muted-foreground">Carregando…</div>
              )}
              {!auditQuery.isLoading && (auditQuery.data?.length ?? 0) === 0 && (
                <div className="p-3 text-sm text-muted-foreground">Nenhuma execução registrada.</div>
              )}
              {auditQuery.data?.map((entry) => {
                const totalDeleted = (entry.hot_deleted ?? 0) + (entry.warm_deleted ?? 0) + (entry.cold_deleted ?? 0);
                return (
                  <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">{entry.subject_user_id}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {entry.dry_run && <Badge variant="secondary">dry_run</Badge>}
                      <Badge variant="default">del {totalDeleted}</Badge>
                      <Badge variant="outline">H{entry.hot_deleted ?? 0}·W{entry.warm_deleted ?? 0}·C{entry.cold_deleted ?? 0}</Badge>
                      {(entry.legal_hold_skipped ?? 0) > 0 && (
                        <Badge variant="outline">hold {entry.legal_hold_skipped}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
