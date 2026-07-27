import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Radio, Siren, RefreshCw, ToggleLeft, ToggleRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCameraIo, type IoPortRow } from '@/hooks/useCameraIo';
import { useCapabilities } from '@/hooks/useCapabilities';
import type { IoRefusalReason } from '@/lib/devices/ioSafety';

/**
 * Onda 154 — painel de I/O físico da câmera (etapa 7).
 *
 * O painel mostra o veredito, não só o botão: quando um acionamento está
 * bloqueado, o operador lê o motivo em português. Botão cinza sem explicação
 * é a origem mais comum de chamado de suporte em mesa de CFTV.
 */
export interface CameraIoPanelProps {
  cameraId: string;
  className?: string;
}

const REFUSAL_LABEL: Record<IoRefusalReason, string> = {
  unknown_port: 'Porta não encontrada',
  missing_capability: 'Sem permissão para acionar saídas',
  port_disabled: 'Porta desativada no cadastro',
  not_an_output: 'Esta porta é uma entrada, não aciona',
  duration_too_short: 'Pulso curto demais (mínimo 100 ms)',
  duration_too_long: 'Pulso longo demais (máximo 60 s)',
  hold_not_supported: 'Esta saída não permite travar ligada',
  too_soon: 'Aguarde o intervalo mínimo entre acionamentos',
  already_in_state: 'A saída já está neste estado',
};

const STATE_LABEL: Record<IoPortRow['last_state'], string> = {
  active: 'Acionada',
  inactive: 'Repouso',
  unknown: 'Desconhecido',
};

export function CameraIoPanel({ cameraId, className }: CameraIoPanelProps) {
  const { outputs, inputs, loading, busyPortId, preview, actuate, discover } = useCameraIo(cameraId);
  const { can } = useCapabilities();
  const [discovering, setDiscovering] = useState(false);
  const hasCapability = can('cameras.control_io');

  const runDiscover = async () => {
    setDiscovering(true);
    const result = await discover();
    setDiscovering(false);
    if (result.ok) toast.success('Portas de I/O sincronizadas com o equipamento');
    else toast.error(`Não foi possível ler as portas (${result.reason})`);
  };

  const run = async (port: IoPortRow, kind: 'pulse' | 'set_active' | 'set_inactive') => {
    const local = preview(port, kind, hasCapability);
    if (!local.allowed) {
      toast.warning(REFUSAL_LABEL[local.reason]);
      return;
    }
    const result = await actuate(port, kind);
    if (result.ok) toast.success('Comando enviado ao equipamento');
    else {
      const label = REFUSAL_LABEL[result.reason as IoRefusalReason];
      toast.error(label ?? `Falha no acionamento (${result.reason})`);
    }
  };

  return (
    <Card className={cn('border-border', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Siren className="h-4 w-4 text-primary" aria-hidden="true" />
            Alarme físico (I/O)
          </CardTitle>
          <CardDescription>
            Saídas a relé e contatos secos declarados pelo equipamento via ONVIF.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runDiscover}
          disabled={discovering || !hasCapability}
          aria-label="Redescobrir portas de I/O"
        >
          <RefreshCw className={cn('h-4 w-4', discovering && 'animate-spin')} aria-hidden="true" />
          <span className="ml-2 hidden sm:inline">Redescobrir</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : outputs.length === 0 && inputs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma porta conhecida. Use “Redescobrir” para consultar o equipamento — nem todo
            modelo declara entradas digitais, e a ausência delas não indica defeito.
          </p>
        ) : (
          <>
            {outputs.map((port) => {
              const busy = busyPortId === port.id;
              const pulse = preview(port, 'pulse', hasCapability);
              return (
                <div
                  key={port.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{port.label}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant={port.last_state === 'active' ? 'destructive' : 'secondary'}>
                        {STATE_LABEL[port.last_state]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        pulso {port.pulse_ms} ms · intervalo {port.min_interval_ms} ms ·{' '}
                        {port.output_mode === 'bistable' ? 'biestável' : 'monoestável'}
                      </span>
                    </div>
                    {!pulse.allowed && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {REFUSAL_LABEL[pulse.reason]}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" disabled={busy} onClick={() => void run(port, 'pulse')}>
                      <Zap className="mr-1 h-4 w-4" aria-hidden="true" />
                      Pulsar
                    </Button>
                    {port.output_mode === 'bistable' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void run(port, 'set_active')}
                          aria-label={`Travar ${port.label} ligada`}
                        >
                          <ToggleRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void run(port, 'set_inactive')}
                          aria-label={`Soltar ${port.label}`}
                        >
                          <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {inputs.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  {inputs.map((port) => (
                    <div key={port.id} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                        <Radio className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{port.label}</span>
                      </span>
                      <Badge variant={port.last_state === 'active' ? 'destructive' : 'outline'}>
                        {STATE_LABEL[port.last_state]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
