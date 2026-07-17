import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Unlock, ShieldCheck, Loader2, ScrollText } from 'lucide-react';
import { toast } from 'sonner';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AuditEntry {
  id: string;
  user_id: string;
  actor_id: string | null;
  asset_id: string | null;
  action: string;
  tier: string | null;
  reason: string | null;
  dry_run: boolean;
  success: boolean;
  created_at: string;
}

export function LegalHoldManagerCard() {
  const qc = useQueryClient();
  const [assetId, setAssetId] = useState('');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'set' | 'clear'>('set');

  const audit = useQuery({
    queryKey: ['media-forget-audit'],
    queryFn: async (): Promise<AuditEntry[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_media_forget_audit', {
        _limit: 20,
        _offset: 0,
      });
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const id = assetId.trim();
      if (!UUID_RE.test(id)) throw new Error('UUID inválido');
      if (action === 'set' && reason.trim().length < 5) {
        throw new Error('Motivo obrigatório (mín. 5 caracteres)');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('set_media_legal_hold', {
        _asset_id: id,
        _legal_hold: action === 'set',
        _reason: action === 'set' ? reason.trim() : null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(
        action === 'set'
          ? 'Legal hold aplicado ao ativo.'
          : 'Legal hold removido do ativo.',
      );
      setAssetId('');
      setReason('');
      qc.invalidateQueries({ queryKey: ['media-forget-audit'] });
      qc.invalidateQueries({ queryKey: ['storage-tier-stats'] });
    },
    onError: (err: Error) => toast.error(err.message ?? 'Falha na operação'),
  });

  const validUuid = UUID_RE.test(assetId.trim());
  const canSubmit =
    validUuid && (action === 'clear' || reason.trim().length >= 5) && !mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Gestão de Legal Hold (LGPD)
        </CardTitle>
        <CardDescription>
          Aplique ou remova proteção legal sobre ativos individuais. Ativos sob legal hold
          são preservados de exclusões automáticas e do direito ao esquecimento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3">
          <div>
            <Label htmlFor="lh-asset">ID do ativo (UUID)</Label>
            <Input
              id="lh-asset"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="font-mono text-xs"
              aria-invalid={assetId.length > 0 && !validUuid}
            />
            {assetId.length > 0 && !validUuid && (
              <p className="mt-1 text-xs text-destructive">UUID inválido.</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={action === 'set' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAction('set')}
              className="gap-1"
            >
              <Lock className="h-3 w-3" /> Aplicar
            </Button>
            <Button
              type="button"
              variant={action === 'clear' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAction('clear')}
              className="gap-1"
            >
              <Unlock className="h-3 w-3" /> Remover
            </Button>
          </div>

          {action === 'set' && (
            <div>
              <Label htmlFor="lh-reason">Motivo (obrigatório)</Label>
              <Input
                id="lh-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: Processo judicial nº 1234/2026"
                maxLength={500}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Registrado na trilha imutável de auditoria.
              </p>
            </div>
          )}

          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="w-full"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando…
              </>
            ) : action === 'set' ? (
              'Aplicar legal hold'
            ) : (
              'Remover legal hold'
            )}
          </Button>
        </div>

        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Toda alteração é registrada com identificação do administrador, timestamp
            e motivo — não pode ser editada ou removida.
          </AlertDescription>
        </Alert>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Trilha de auditoria (últimos 20)</span>
          </div>
          {audit.isLoading && <Skeleton className="h-32 w-full" />}
          {audit.isError && (
            <p className="text-sm text-destructive">Falha ao carregar auditoria.</p>
          )}
          {!audit.isLoading && !audit.isError && (audit.data?.length ?? 0) === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum registro ainda.</p>
          )}
          {!audit.isLoading && (audit.data?.length ?? 0) > 0 && (
            <ScrollArea className="h-64 rounded-md border border-border">
              <ul className="divide-y divide-border">
                {audit.data!.map((row) => (
                  <li key={row.id} className="p-3 text-xs">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={row.success ? 'default' : 'destructive'}
                        className="text-[10px]"
                      >
                        {row.action}
                      </Badge>
                      {row.dry_run && (
                        <Badge variant="outline" className="text-[10px]">
                          dry-run
                        </Badge>
                      )}
                      {row.tier && (
                        <Badge variant="secondary" className="text-[10px]">
                          {row.tier}
                        </Badge>
                      )}
                      <span className="ml-auto text-muted-foreground">
                        {new Date(row.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="grid gap-0.5 font-mono text-[11px] text-muted-foreground">
                      <span>user: {row.user_id}</span>
                      {row.asset_id && <span>asset: {row.asset_id}</span>}
                      {row.reason && (
                        <span className="text-foreground">motivo: {row.reason}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
