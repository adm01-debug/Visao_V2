import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, RefreshCw, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useCameraVault, type EmbeddedCredentialRow } from '@/hooks/useCameraVault';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useUserRole } from '@/hooks/useUserRole';

export function CameraVaultAuditCard() {
  const { loading, audit, migrateBatch } = useCameraVault();
  const { role } = useUserRole();
  const isAdmin = role === 'admin';
  const [rows, setRows] = useState<EmbeddedCredentialRow[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refresh = async () => {
    try {
      setRows(await audit());
    } catch (e) {
      toast.error('Falha ao auditar credenciais', { description: (e as Error).message });
    }
  };

  useEffect(() => {
    void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const handleMigrate = async () => {
    setConfirmOpen(false);
    try {
      const res = await migrateBatch(100);
      toast.success(`Migração concluída: ${res.migrated} ok, ${res.failed} falhas`);
      await refresh();
    } catch (e) {
      toast.error('Migração falhou', { description: (e as Error).message });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="h-5 w-5 text-primary" />
          Cofre de credenciais RTSP
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={rows.length > 0 ? 'destructive' : 'default'}>
            {rows.length} vulnerável{rows.length === 1 ? '' : 'is'}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={refresh}
            disabled={loading}
            aria-label="Atualizar auditoria"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Câmeras com <code className="text-xs">user:senha@</code> embutido na URL do stream. Migre
          para o cofre criptografado (pgcrypto AES) e limpe a URL original.
        </p>

        {rows.length === 0 ? (
          <div className="rounded-md border border-border/50 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-primary" />
            Nenhuma credencial em texto claro detectada.
          </div>
        ) : (
          <div className="max-h-64 overflow-auto rounded-md border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Câmera</th>
                  <th className="px-3 py-2 text-left">URL mascarada</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.camera_id} className="border-t border-border/40">
                    <td className="px-3 py-2 font-medium">{r.camera_name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground break-all">
                      {r.masked_url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin && rows.length > 0 && (
          <Button onClick={() => setConfirmOpen(true)} disabled={loading} className="w-full">
            Migrar {Math.min(rows.length, 100)} para o cofre
          </Button>
        )}

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Migrar credenciais para o cofre"
          description="As senhas serão criptografadas com pgcrypto e removidas da URL original. Esta ação é irreversível sem backup."
          confirmLabel="Migrar agora"
          onConfirm={handleMigrate}
        />
      </CardContent>
    </Card>
  );
}
