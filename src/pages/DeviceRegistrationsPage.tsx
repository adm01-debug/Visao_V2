/**
 * Onda 190 — Conexão por Registro.
 *
 * Paridade com a "Conexão por Registro" do SIM Next: o gravador em campo, atrás
 * de NAT, procura o servidor usando um código e um segredo. Aqui o operador
 * inscreve, troca o segredo e revoga o vínculo — e o segredo em claro aparece
 * uma única vez, no ato.
 */
import { useMemo, useState } from 'react';
import { KeyRound, PlusCircle, RefreshCw, ShieldOff, Copy, AlertTriangle } from 'lucide-react';
import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useDeviceRegistrations, type DeviceRow } from '@/hooks/useDeviceRegistrations';
import { ROTATION_GRACE_MS } from '@/lib/devices/deviceEnrollment';

const STATUS_LABEL: Record<DeviceRow['status'], string> = {
  pending: 'Aguardando primeiro contato',
  active: 'Ativo',
  revoked: 'Revogado',
};

const STATUS_VARIANT: Record<DeviceRow['status'], 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  active: 'default',
  revoked: 'destructive',
};

function formatWhen(value: string | null): string {
  if (!value) return 'nunca';
  return new Date(value).toLocaleString('pt-BR');
}

export default function DeviceRegistrationsPage() {
  const { devices, loading, activeCount, revealed, dismissRevealed, enroll, rotate, revoke } =
    useDeviceRegistrations();
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const CONNECT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/device-connect`;

  const graceMinutes = useMemo(() => Math.round(ROTATION_GRACE_MS / 60_000), []);

  const handleEnroll = async () => {
    if (label.trim().length === 0) {
      toast.error('Dê um nome ao dispositivo antes de inscrever.');
      return;
    }
    setBusy(true);
    const ok = await enroll(label.trim(), null);
    if (ok) setLabel('');
    setBusy(false);
  };

  const copySecret = async () => {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.secret);
      toast.success('Segredo copiado.');
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie manualmente.');
    }
  };

  return (
    <PageContent>
      <PageMeta
        title="Conexão por Registro | VISÃO"
        description="Inscreva gravadores e agentes remotos que se conectam sozinhos ao VISÃO, com segredo rotacionável e revogação imediata."
      />

      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold">Conexão por Registro</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} dispositivo(s) ativo(s). O segredo é guardado apenas cifrado — nem o
            sistema consegue exibi-lo de novo.
          </p>
        </div>
      </div>

      {revealed && (
        <Alert className="border-primary/50">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Segredo do dispositivo {revealed.deviceCode} (versão {revealed.version})</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-xs">
              Esta é a única exibição. Guarde agora no equipamento; depois só resta trocar o
              segredo.
            </p>
            <code className="block break-all rounded bg-muted p-2 text-xs">{revealed.secret}</code>
            <div className="flex gap-2">
              <Button size="sm" onClick={copySecret}>
                <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Copiar
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissRevealed}>
                Já guardei
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inscrever dispositivo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex.: Gravador Portaria"
            aria-label="Nome do dispositivo"
            maxLength={80}
          />
          <Button onClick={handleEnroll} disabled={busy}>
            <PlusCircle className="mr-1 h-4 w-4" aria-hidden="true" />
            Inscrever
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dispositivos registrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <Skeleton className="h-24 w-full" />}

          {!loading && devices.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum dispositivo inscrito ainda.
            </p>
          )}

          {devices.map((device) => (
            <div
              key={device.id}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{device.label}</span>
                  <Badge variant={STATUS_VARIANT[device.status]}>
                    {STATUS_LABEL[device.status]}
                  </Badge>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {device.deviceCode}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Segredo v{device.secretVersion} · último contato: {formatWhen(device.lastSeenAt)}
                  {device.expiresAt ? ` · vence em ${formatWhen(device.expiresAt)}` : ''}
                </p>
              </div>

              {device.status !== 'revoked' && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      await rotate(device.id);
                      setBusy(false);
                    }}
                  >
                    <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Trocar segredo
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      await revoke(device.id, 'revogado pelo operador');
                      setBusy(false);
                    }}
                  >
                    <ShieldOff className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Revogar
                  </Button>
                </div>
              )}
            </div>
          ))}

          <p className="text-xs text-muted-foreground">
            O equipamento em campo se apresenta em{' '}
            <code className="rounded bg-muted px-1 py-0.5">
              {CONNECT_ENDPOINT}
            </code>{' '}
            enviando o código e o segredo. Toda tentativa — aceita ou recusada — fica registrada.
          </p>
          <p className="text-xs text-muted-foreground">
            Ao trocar o segredo, o anterior continua aceito por {graceMinutes} minutos — tempo para
            o equipamento em campo se atualizar. A revogação é imediata e definitiva: encerra também
            essa tolerância.
          </p>
        </CardContent>
      </Card>
    </PageContent>
  );
}
