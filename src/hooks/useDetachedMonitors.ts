/**
 * Onda 189 — Multimonitor destacado: ligação entre a regra e o navegador.
 *
 * Toda decisão vem de `detachedMonitor.ts`. Este hook só executa: abre a
 * janela, escuta batidas de ponto no `BroadcastChannel` e mantém o livro
 * saneado por relógio (janela fechada à força pelo sistema operacional some
 * sozinha, sem travar a vaga do teto).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  DETACHED_CHANNEL,
  HEARTBEAT_INTERVAL_MS,
  MAX_DETACHED_WINDOWS,
  type DetachedMessage,
  type DetachedRegistry,
  applyClosed,
  applyHeartbeat,
  liveCount,
  planDetach,
  reconcileHeartbeats,
} from '@/lib/views/detachedMonitor';

const DETACHED_FEATURES = 'noopener,noreferrer,width=960,height=560,menubar=no,toolbar=no';

export function useDetachedMonitors() {
  const [registry, setRegistry] = useState<DetachedRegistry>({});
  const channelRef = useRef<BroadcastChannel | null>(null);
  const windowsRef = useRef<Map<string, Window>>(new Map());

  // Canal de mensagens com as janelas destacadas.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(DETACHED_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<DetachedMessage>) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'heartbeat') {
        setRegistry((current) =>
          applyHeartbeat(current, {
            cameraId: msg.cameraId,
            windowName: msg.windowName,
            at: Date.now(),
          })
        );
      } else if (msg.type === 'closed') {
        windowsRef.current.delete(msg.cameraId);
        setRegistry((current) => applyClosed(current, msg.cameraId));
      }
    };
    return () => {
      channel.onmessage = null;
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Saneamento por relógio: janela que parou de bater ponto libera a vaga.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setRegistry((current) => {
        const { registry: next, lost } = reconcileHeartbeats(current, Date.now());
        for (const cameraId of lost) windowsRef.current.delete(cameraId);
        return lost.length > 0 ? next : current;
      });
    }, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const detach = useCallback(
    (cameraId: string) => {
      const plan = planDetach({ registry, cameraId, now: Date.now() });

      if (plan.decision === 'refused_quota' || plan.decision === 'refused_invalid') {
        setRegistry(plan.registry);
        toast.error(plan.message);
        return plan.decision;
      }

      if (plan.decision === 'focus_existing') {
        windowsRef.current.get(cameraId)?.focus();
        setRegistry(plan.registry);
        toast.info(plan.message);
        return plan.decision;
      }

      const url = `${window.location.origin}/monitor/${encodeURIComponent(cameraId)}?w=${encodeURIComponent(
        plan.windowName ?? ''
      )}`;
      const opened = window.open(url, plan.windowName ?? undefined, DETACHED_FEATURES);
      if (!opened) {
        // Bloqueio de pop-up é fato do navegador, não estado do sistema: o livro
        // não pode registrar uma janela que nunca existiu.
        toast.error('O navegador bloqueou a janela destacada. Libere pop-ups para este site.');
        return 'refused_invalid' as const;
      }
      windowsRef.current.set(cameraId, opened);
      setRegistry(plan.registry);
      toast.success(plan.message);
      return plan.decision;
    },
    [registry]
  );

  const closeDetached = useCallback((cameraId: string) => {
    channelRef.current?.postMessage({ type: 'close-request', cameraId } satisfies DetachedMessage);
    windowsRef.current.get(cameraId)?.close();
    windowsRef.current.delete(cameraId);
    setRegistry((current) => applyClosed(current, cameraId));
  }, []);

  const detached = useMemo(() => Object.values(registry), [registry]);
  const alive = liveCount(registry, Date.now());

  return {
    detached,
    registry,
    aliveCount: alive,
    atQuota: alive >= MAX_DETACHED_WINDOWS,
    isDetached: useCallback((cameraId: string) => Boolean(registry[cameraId]), [registry]),
    detach,
    closeDetached,
  };
}
