/**
 * Onda 193 — painel de comando remoto de um equipamento.
 *
 * A tela é deliberadamente "pessimista": cada botão já mostra, antes do clique,
 * o veredito que a régua daria. Comando que seria recusado aparece desabilitado
 * com o motivo em português — o operador não descobre a recusa depois de mandar
 * reiniciar um gravador.
 *
 * O que a tela **não** faz: não decide. `admitRemoteCommand` decide, o banco
 * confirma. Aqui só há apresentação.
 */
import { useMemo, useState } from 'react';
import { Radio, Loader2, Ban, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useRemoteCommand } from '@/hooks/useRemoteCommand';
import {
  COMMAND_LABEL,
  REMOTE_COMMANDS,
  isEffectful,
  type RemoteCommandKind,
} from '@/lib/devices/remoteCommandAdmission';
import type { DeviceSilenceState } from '@/lib/devices/deviceSilence';
import { cn } from '@/lib/utils';

export interface RemoteCommandPanelProps {
  readonly registrationId: string;
  readonly deviceLabel: string;
  readonly registrationStatus: 'pending' | 'active' | 'revoked';
  readonly presence: DeviceSilenceState;
  readonly className?: string;
}

const STATUS_LABEL: Readonly<Record<string, string>> = {
  queued: 'na fila',
  awaiting_presence: 'aguardando o equipamento',
  delivered: 'entregue ao equipamento',
  completed: 'concluído',
  failed: 'falhou',
  expired: 'expirado',
  cancelled: 'cancelado',
};

const STATUS_VARIANT = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'completed') return 'default';
  if (status === 'failed') return 'destructive';
  if (status === 'queued' || status === 'awaiting_presence' || status === 'delivered') {
    return 'secondary';
  }
  return 'outline';
};

// Só ordem ainda não entregue pode ser cancelada pelo operador: cancelar algo
// que o equipamento já recebeu seria promessa falsa (a RLS também recusa).
const OPEN = new Set(['queued', 'awaiting_presence']);

export function RemoteCommandPanel({
  registrationId,
  deviceLabel,
  registrationStatus,
  presence,
  className,
}: RemoteCommandPanelProps) {
  const { commands, isLoading, lastVerdict, isSubmitting, preview, send, cancel } =
    useRemoteCommand(registrationId, registrationStatus, presence);
  const [pending, setPending] = useState<RemoteCommandKind | null>(null);

  // O veredito é calculado uma vez por render, para todos os botões, com o mesmo
  // instante: botões vizinhos não podem discordar sobre o estado do equipamento.
  const verdicts = useMemo(
    () => new Map(REMOTE_COMMANDS.map((kind) => [kind, preview(kind)] as const)),
    [preview],
  );

  const handleSend = async (kind: RemoteCommandKind) => {
    setPending(kind);
    try {
      const result = await send(kind);
      if (result.decision === 'admit') toast.success(result.message);
      else if (result.decision === 'defer') toast.info(result.message);
      else if (result.decision === 'replay') toast.warning(result.message);
      else toast.error(result.message);
    } catch {
      // Falha de transporte não vira acusação ao equipamento: o comando pode ou
      // não ter entrado, e a fila é a fonte da verdade quando ela recarregar.
      toast.error('Não foi possível falar com o servidor. Confira a fila antes de repetir.');
    } finally {
      setPending(null);
    }
  };

  return (
    <Card className={cn('border-dashed', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
          Comandos para {deviceLabel}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {REMOTE_COMMANDS.map((kind) => {
            const verdict = verdicts.get(kind);
            const blocked = verdict === undefined || verdict.decision === 'reject';
            const busy = isSubmitting && pending === kind;

            return (
              <Tooltip key={kind}>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      variant={isEffectful(kind) ? 'default' : 'outline'}
                      disabled={blocked || isSubmitting}
                      aria-label={`${COMMAND_LABEL[kind]}${blocked ? ' (indisponível)' : ''}`}
                      onClick={() => void handleSend(kind)}
                    >
                      {busy ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : blocked ? (
                        <Ban className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      ) : verdict.decision === 'defer' ? (
                        <Clock className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      ) : null}
                      {COMMAND_LABEL[kind]}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{verdict?.message}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {lastVerdict !== null && (
          <Alert variant={lastVerdict.decision === 'reject' ? 'destructive' : 'default'}>
            <AlertDescription className="text-xs">{lastVerdict.message}</AlertDescription>
          </Alert>
        )}

        {isLoading && <p className="text-xs text-muted-foreground">Carregando a fila…</p>}

        {!isLoading && commands.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum comando enviado para este equipamento.
          </p>
        )}

        {commands.length > 0 && (
          <ul className="space-y-1.5">
            {commands.slice(0, 8).map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs"
              >
                <span className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT(row.status)}>
                    {STATUS_LABEL[row.status] ?? row.status}
                  </Badge>
                  <span className="font-medium">{COMMAND_LABEL[row.command] ?? row.command}</span>
                  <span className="text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString('pt-BR')}
                  </span>
                  {row.deliveryAttempts > 1 && (
                    <span className="text-muted-foreground">
                      · {row.deliveryAttempts}ª entrega
                    </span>
                  )}
                  {row.reportedAt !== null && (
                    <span className="text-muted-foreground">
                      · laudo às {new Date(row.reportedAt).toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                  {row.settledBy === 'sweep' && (
                    <span className="text-muted-foreground">
                      · encerrado pela varredura (sem laudo do equipamento)
                    </span>
                  )}
                </span>

                {OPEN.has(row.status) && row.expiresAt > Date.now() && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => {
                      void cancel(row.id).catch(() =>
                        toast.error('Não foi possível cancelar o comando.'),
                      );
                    }}
                  >
                    Cancelar
                  </Button>
                )}

                {row.errorMessage !== null && (
                  <span className="w-full text-destructive">{row.errorMessage}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Todo comando tem prazo de validade: se o equipamento não buscar a fila a tempo, ele expira
          sozinho em vez de chegar atrasado e agir fora de contexto.
        </p>
      </CardContent>
    </Card>
  );
}
