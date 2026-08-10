import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, KeyRound, RefreshCw } from 'lucide-react';

interface EnvelopeStats {
  total: number;
  enveloped: number;
  legacy: number;
  by_kek_version: Record<string, number>;
}

export function EnvelopeEncryptionCard() {
  const [stats, setStats] = useState<EnvelopeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('envelope_encryption_stats');
    if (error) toast.error('Falha ao carregar estatísticas do cofre');
    else setStats((data as unknown as EnvelopeStats[])[0] ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (
    action: 'backfill_envelope' | 'stats',
    payload: Record<string, unknown> = {}
  ) => {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke('camera-credentials-vault', {
        body: { action, ...payload },
      });
      if (error) throw error;
      toast.success(`Ação ${action} concluída`, {
        description: JSON.stringify((data as { result?: unknown; stats?: unknown }).result ?? data),
      });
      await load();
    } catch (err) {
      toast.error(`Falha em ${action}`, { description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const coverage = stats && stats.total > 0 ? Math.round((stats.enveloped / stats.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Envelope Encryption (Fortress 5)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">{stats.total}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Envelopadas</p>
                <p className="text-2xl font-semibold text-primary">{stats.enveloped}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Legadas</p>
                <p className="text-2xl font-semibold text-destructive">{stats.legacy}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={coverage === 100 ? 'default' : 'secondary'}>
                <KeyRound className="mr-1 h-3 w-3" /> Cobertura: {coverage}%
              </Badge>
              {Object.entries(stats.by_kek_version ?? {}).map(([v, c]) => (
                <Badge key={v} variant="outline">
                  KEK v{v}: {c}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => run('backfill_envelope', { limit: 100 })}
                disabled={busy !== null || stats.legacy === 0}
              >
                {busy === 'backfill_envelope' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Migrar 100 legadas → envelope
              </Button>
              <Button size="sm" variant="outline" onClick={load} disabled={busy !== null}>
                Atualizar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Cada credencial possui uma DEK própria (AES) selada pela KEK versionada. A rotação de
              KEK usa <code>rewrap_kek</code> sem re-descriptografar as senhas.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Sem dados.</p>
        )}
      </CardContent>
    </Card>
  );
}
