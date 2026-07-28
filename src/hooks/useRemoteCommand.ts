/**
 * Onda 193 — envio de comando remoto ao equipamento, do lado da tela.
 *
 * Três decisões que valem mais do que o código abaixo:
 *
 * 1. **A tela não decide, ela consulta a mesma régua.** `admitRemoteCommand` é
 *    a regra única; aqui ela serve para *explicar* antes de tentar e para não
 *    gastar uma ida ao banco quando a recusa é certa. O banco reavalia tudo:
 *    a régua do cliente é espelho, nunca autoridade.
 *
 * 2. **A chave de idempotência nasce do pedido, não do clique.** Ela é derivada
 *    de registro + comando + janela de 10 minutos, então o duplo clique, o
 *    "tentar de novo" e a rede que reenviou colidem no mesmo comando em vez de
 *    empilhar três reinícios no equipamento.
 *
 * 3. **Colisão no índice único não é erro, é resposta.** Quando o banco recusa
 *    a chave repetida, isso *prova* que o comando anterior existe — devolvemos
 *    o veredito de repetição, não uma falha vermelha para o operador.
 */

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCapabilities } from '@/hooks/useCapabilities';
import {
  admitRemoteCommand,
  isExclusive,
  IDEMPOTENCY_WINDOW_MINUTES,
  MAX_TTL_MINUTES,
  type AdmissionVerdict,
  type InFlightCommand,
  type RemoteCommandKind,
} from '@/lib/devices/remoteCommandAdmission';
import type { DeviceSilenceState } from '@/lib/devices/deviceSilence';

/** Estados em que o comando ainda pode ser entregue ao equipamento. */
// Onda 194: os nomes aqui precisam ser exatamente os do CHECK da tabela. A
// versão anterior usava 'dispatched', que nunca existiu no banco — o efeito era
// uma ordem já entregue deixar de contar como "em voo", e a UI liberar um
// segundo reinício que só o índice único do banco barrava, sem explicação.
const OPEN_STATUSES = ['queued', 'awaiting_presence', 'delivered'] as const;

export interface RemoteCommandRow {
  readonly id: string;
  readonly registrationId: string;
  readonly command: RemoteCommandKind;
  readonly status: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly result: string | null;
  readonly errorMessage: string | null;
  /** Quantas vezes o equipamento já recebeu esta ordem (Onda 194). */
  readonly deliveryAttempts: number;
  /** Instante do laudo, quando o equipamento prestou contas. */
  readonly reportedAt: number | null;
  /**
   * Autoria do encerramento: `device` = o equipamento prestou contas;
   * `sweep` = a varredura observou ausência. Nunca são a mesma coisa.
   */
  readonly settledBy: 'device' | 'sweep' | null;
}

interface RawCommand {
  id: string;
  registration_id: string;
  command: string;
  status: string;
  created_at: string;
  expires_at: string;
  result: string | null;
  error_message: string | null;
  delivery_attempts: number | null;
  reported_at: string | null;
  settled_by: string | null;
}

const millis = (value: string): number => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Chave estável dentro da janela de idempotência. O piso de janela é derivado
 * do relógio para que dois pedidos separados por segundos caiam no mesmo balde
 * — e dois pedidos legítimos separados por 10 minutos não.
 */
export function idempotencyKeyFor(
  registrationId: string,
  command: RemoteCommandKind,
  now: number,
): string {
  const window = Math.floor(now / (IDEMPOTENCY_WINDOW_MINUTES * 60_000));
  return `${registrationId}:${command}:${window}`;
}

export interface UseRemoteCommandResult {
  readonly commands: readonly RemoteCommandRow[];
  readonly isLoading: boolean;
  readonly error: unknown;
  /** Último veredito exibido ao operador; `null` antes do primeiro envio. */
  readonly lastVerdict: AdmissionVerdict | null;
  readonly isSubmitting: boolean;
  /** Avalia sem enviar — usado para desabilitar botão e explicar o porquê. */
  readonly preview: (command: RemoteCommandKind) => AdmissionVerdict;
  readonly send: (command: RemoteCommandKind, ttlMinutes?: number) => Promise<AdmissionVerdict>;
  readonly cancel: (commandId: string) => Promise<void>;
  readonly refetch: () => void;
}

export function useRemoteCommand(
  registrationId: string | null,
  registrationStatus: 'pending' | 'active' | 'revoked',
  presence: DeviceSilenceState,
): UseRemoteCommandResult {
  const queryClient = useQueryClient();
  const { capabilities } = useCapabilities();
  const [lastVerdict, setLastVerdict] = useState<AdmissionVerdict | null>(null);

  const query = useQuery({
    queryKey: ['device-remote-commands', registrationId],
    enabled: registrationId !== null,
    staleTime: 10_000,
    refetchInterval: 15_000,
    queryFn: async (): Promise<readonly RemoteCommandRow[]> => {
      const { data, error } = await supabase
        .from('device_remote_commands')
        .select(
          'id, registration_id, command, status, created_at, expires_at, result, error_message, delivery_attempts, reported_at, settled_by',
        )
        .eq('registration_id', registrationId as string)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      return ((data ?? []) as RawCommand[]).map((row) => ({
        id: row.id,
        registrationId: row.registration_id,
        command: row.command as RemoteCommandKind,
        status: row.status,
        createdAt: millis(row.created_at),
        expiresAt: millis(row.expires_at),
        result: row.result === null ? null : String(row.result),
        errorMessage: row.error_message,
        deliveryAttempts: row.delivery_attempts ?? 0,
        reportedAt: row.reported_at === null ? null : millis(row.reported_at),
        settledBy:
          row.settled_by === 'device' || row.settled_by === 'sweep' ? row.settled_by : null,
      }));
    },
  });

  const commands = query.data ?? [];

  /**
   * Comando exclusivo ainda em voo. Só conta o que não venceu: comando expirado
   * ocupa linha no histórico, não ocupa o equipamento.
   */
  const inFlight = useMemo<InFlightCommand | null>(() => {
    const now = Date.now();
    const open = commands.find(
      (c) =>
        (OPEN_STATUSES as readonly string[]).includes(c.status) &&
        c.expiresAt > now &&
        isExclusive(c.command),
    );
    return open ? { kind: open.command, expiresAt: open.expiresAt } : null;
  }, [commands]);

  const preview = useCallback(
    (command: RemoteCommandKind): AdmissionVerdict =>
      admitRemoteCommand(
        {
          command,
          registrationStatus,
          presence,
          capabilities,
          ttlMinutes: 10,
          inFlight,
        },
        Date.now(),
      ),
    [registrationStatus, presence, capabilities, inFlight],
  );

  const mutation = useMutation({
    mutationFn: async (input: {
      command: RemoteCommandKind;
      ttlMinutes: number;
    }): Promise<AdmissionVerdict> => {
      if (registrationId === null) {
        return {
          decision: 'reject',
          reason: 'invalid_request',
          message: 'Selecione um equipamento antes de enviar o comando.',
          expiresAt: null,
          terminal: false,
        };
      }

      const now = Date.now();
      const local = admitRemoteCommand(
        {
          command: input.command,
          registrationStatus,
          presence,
          capabilities,
          ttlMinutes: input.ttlMinutes,
          inFlight,
        },
        now,
      );

      // Recusa local não vira ida ao banco: a régua é a mesma dos dois lados.
      if (local.decision === 'reject' || local.decision === 'replay') return local;

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (uid === undefined) {
        return {
          decision: 'reject',
          reason: 'capability_missing',
          message: 'Sessão expirada. Entre novamente para enviar comandos.',
          expiresAt: null,
          terminal: false,
        };
      }

      const { error } = await supabase.from('device_remote_commands').insert({
        user_id: uid,
        registration_id: registrationId,
        command: input.command,
        idempotency_key: idempotencyKeyFor(registrationId, input.command, now),
        status: local.decision === 'defer' ? 'awaiting_presence' : 'queued',
        expires_at: new Date(local.expiresAt ?? now + 600_000).toISOString(),
        requested_by: uid,
      });

      if (error !== null) {
        // 23505 = chave repetida. Isso é a prova de que o pedido anterior está
        // vivo, e não uma falha: o operador clicou duas vezes, não errou.
        if (error.code === '23505') {
          return {
            decision: 'replay',
            reason: 'duplicate_request',
            message:
              'Este comando já está na fila para o equipamento — nenhum comando novo foi criado.',
            expiresAt: null,
            terminal: false,
          };
        }
        throw error;
      }

      return local;
    },
    onSuccess: (result) => {
      setLastVerdict(result);
      void queryClient.invalidateQueries({ queryKey: ['device-remote-commands', registrationId] });
    },
  });

  const send = useCallback(
    async (command: RemoteCommandKind, ttlMinutes = 10): Promise<AdmissionVerdict> => {
      const clamped = Math.min(Math.max(Math.round(ttlMinutes), 1), MAX_TTL_MINUTES);
      return mutation.mutateAsync({ command, ttlMinutes: clamped });
    },
    [mutation],
  );

  const cancel = useCallback(
    async (commandId: string): Promise<void> => {
      const { error } = await supabase
        .from('device_remote_commands')
        .update({ status: 'cancelled' })
        .eq('id', commandId);
      if (error !== null) throw error;
      void queryClient.invalidateQueries({ queryKey: ['device-remote-commands', registrationId] });
    },
    [queryClient, registrationId],
  );

  return {
    commands,
    isLoading: query.isLoading,
    error: query.error,
    lastVerdict,
    isSubmitting: mutation.isPending,
    preview,
    send,
    cancel,
    refetch: () => void query.refetch(),
  };
}
