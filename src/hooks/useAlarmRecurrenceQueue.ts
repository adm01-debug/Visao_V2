import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EpisodeCommand } from '@/lib/alarms/alarmEpisodeBridge';
import {
  QUEUE_STORAGE_KEY,
  dueCommands,
  emptyCommandQueue,
  enqueueCommands,
  markDelivered,
  markFailed,
  parseQueue,
  queueStats,
  queueStatusText,
  requeueDead,
  resumeAll,
  serializeQueue,
  type CommandQueue,
  type DeliveryFailure,
  type QueueStats,
} from '@/lib/alarms/episodeCommandQueue';

/**
 * Onda 182 — adaptador de borda entre a fila pura e o backend.
 *
 * A regra de entrega (idempotência, ordem, recuo, carta morta) vive em
 * `episodeCommandQueue.ts` e é testada em isolamento. Este hook só faz o que
 * a regra pura não pode fazer: ler relógio, tocar `localStorage`, chamar RPC
 * e reagir a `online`/`offline`.
 */

const DRAIN_INTERVAL_MS = 3_000;

const readStored = (key: string): CommandQueue => {
  try {
    return parseQueue(window.localStorage.getItem(key));
  } catch {
    // Armazenamento indisponível (modo privado, cota) nunca derruba o alarme.
    return emptyCommandQueue();
  }
};

const writeStored = (key: string, queue: CommandQueue): void => {
  try {
    window.localStorage.setItem(key, serializeQueue(queue, Date.now()));
  } catch {
    /* falha de persistência é degradação, não erro fatal */
  }
};

/**
 * Classifica a falha do servidor. Só é `retryable` o que tem chance real de
 * mudar numa próxima tentativa; recusa de regra é definitiva e insistir nela
 * apenas queima orçamento e esconde o problema do operador.
 */
export function classifyRpcFailure(
  error: { code?: string; message?: string } | null
): DeliveryFailure {
  const message = (error?.message ?? '').toLowerCase();
  if (
    message.includes('stale') ||
    message.includes('já existe') ||
    message.includes('duplicate') ||
    message.includes('invalid') ||
    message.includes('violates') ||
    message.includes('permission') ||
    message.includes('not authorized')
  ) {
    return 'permanent';
  }
  return 'retryable';
}

export interface UseAlarmRecurrenceQueueOptions {
  organizationId: string | null;
  storageKey?: string;
  /** Desliga a drenagem automática (útil em testes e telas somente-leitura). */
  autoDrain?: boolean;
}

export interface UseAlarmRecurrenceQueueResult {
  queue: CommandQueue;
  stats: QueueStats;
  statusText: string;
  /** Enfileira fatos vindos da ponte (Onda 181). Idempotente por fato. */
  enqueue: (commands: readonly EpisodeCommand[]) => void;
  /** Tenta drenar agora; devolve quantos fatos foram confirmados. */
  drain: () => Promise<number>;
  /** Recoloca uma carta morta na fila após intervenção humana. */
  retryDead: (id: string) => void;
  draining: boolean;
}

export function useAlarmRecurrenceQueue({
  organizationId,
  storageKey = QUEUE_STORAGE_KEY,
  autoDrain = true,
}: UseAlarmRecurrenceQueueOptions): UseAlarmRecurrenceQueueResult {
  const [queue, setQueue] = useState<CommandQueue>(() =>
    typeof window === 'undefined' ? emptyCommandQueue() : readStored(storageKey)
  );
  const [draining, setDraining] = useState(false);
  const queueRef = useRef(queue);
  const inFlight = useRef(false);

  const commit = useCallback(
    (next: CommandQueue) => {
      queueRef.current = next;
      setQueue(next);
      if (typeof window !== 'undefined') writeStored(storageKey, next);
    },
    [storageKey]
  );

  const enqueue = useCallback(
    (commands: readonly EpisodeCommand[]) => {
      commit(enqueueCommands(queueRef.current, commands, Date.now()));
    },
    [commit]
  );

  const retryDead = useCallback(
    (id: string) => {
      commit(requeueDead(queueRef.current, id, Date.now()));
    },
    [commit]
  );

  const drain = useCallback(async (): Promise<number> => {
    if (!organizationId || inFlight.current) return 0;
    const ready = dueCommands(queueRef.current, Date.now());
    if (ready.length === 0) return 0;

    inFlight.current = true;
    setDraining(true);
    let delivered = 0;
    try {
      // Séries diferentes são independentes: `dueCommands` já devolve no
      // máximo um item por série, então o paralelismo aqui é seguro.
      await Promise.all(
        ready.map(async (item) => {
          const { command } = item;
          const { error } =
            command.kind === 'open'
              ? await supabase.rpc('record_alarm_episode_open', {
                  p_organization_id: organizationId,
                  p_series_key: command.seriesKey,
                  p_severity: command.severity,
                  p_at: new Date(command.at).toISOString(),
                })
              : await supabase.rpc('record_alarm_episode_close', {
                  p_organization_id: organizationId,
                  p_series_key: command.seriesKey,
                  p_at: new Date(command.at).toISOString(),
                });

          if (error) {
            commit(
              markFailed(
                queueRef.current,
                item.id,
                classifyRpcFailure(error),
                Date.now(),
                error.message ?? null
              )
            );
            return;
          }
          delivered += 1;
          commit(markDelivered(queueRef.current, item.id));
        })
      );
    } finally {
      inFlight.current = false;
      setDraining(false);
    }
    return delivered;
  }, [commit, organizationId]);

  // Drenagem periódica: fatos ficam na fila até o servidor confirmar.
  useEffect(() => {
    if (!autoDrain || !organizationId) return;
    const timer = window.setInterval(() => {
      void drain();
    }, DRAIN_INTERVAL_MS);
    void drain();
    return () => window.clearInterval(timer);
  }, [autoDrain, drain, organizationId]);

  // Voltar a conexão zera o recuo: o motivo da espera deixou de existir.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => {
      commit(resumeAll(queueRef.current, Date.now()));
      void drain();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [commit, drain]);

  const stats = useMemo(() => queueStats(queue, Date.now()), [queue]);

  return {
    queue,
    stats,
    statusText: queueStatusText(stats),
    enqueue,
    drain,
    retryDead,
    draining,
  };
}
