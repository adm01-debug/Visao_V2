/**
 * VISÃO - useFrameBuffer
 *
 * Buffer circular global de snapshots por câmera para suportar replays curtos
 * (ex.: 30s antes / 30s depois) ao redor de um alerta detectado.
 *
 * Como funciona:
 * - O componente de vídeo (ou qualquer fonte de frames) chama `pushFrame` periodicamente
 *   passando o `cameraId` e um snapshot (data URL) do frame atual.
 * - Frames mais antigos que `BUFFER_SECONDS` são descartados automaticamente.
 * - Para reproduzir um evento, `getReplayFrames(cameraId, eventTime, beforeSec, afterSec)`
 *   retorna os frames que caíram dentro da janela.
 *
 * Decisão arquitetural: o buffer vive em memória (Map module-scoped) e é compartilhado
 * entre todos os componentes — escolhemos não persistir em IndexedDB porque (a) data URLs
 * são pesados, (b) o objetivo é replay imediato, e (c) o usuário pode abrir um Clip
 * (`useClipRecorder`) para gravações persistentes.
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

export interface BufferedFrame {
  /** Timestamp absoluto em ms (Date.now()) */
  t: number;
  /** Snapshot como data URL (image/jpeg ou image/webp) */
  src: string;
}

const BUFFER_SECONDS = 60; // 30s antes + 30s depois
const MAX_FRAMES_PER_CAMERA = 120; // ~2 fps × 60s
const DEFAULT_BEFORE = 30;
const DEFAULT_AFTER = 30;

const buffers = new Map<string, BufferedFrame[]>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function pruneOld(frames: BufferedFrame[], now: number): BufferedFrame[] {
  const cutoff = now - BUFFER_SECONDS * 1000;
  let i = 0;
  while (i < frames.length) {
    const f = frames[i];
    if (!f || f.t >= cutoff) break;
    i++;
  }
  const trimmed = i > 0 ? frames.slice(i) : frames;
  return trimmed.length > MAX_FRAMES_PER_CAMERA
    ? trimmed.slice(trimmed.length - MAX_FRAMES_PER_CAMERA)
    : trimmed;
}

/**
 * Adiciona um frame ao buffer da câmera. Pode ser chamado de qualquer lugar
 * (componente de vídeo, hook de análise contínua, etc.).
 */
export function pushFrame(cameraId: string, src: string, t: number = Date.now()): void {
  if (!cameraId || !src) return;
  const current = buffers.get(cameraId) ?? [];
  const next = pruneOld([...current, { t, src }], t);
  buffers.set(cameraId, next);
  notify();
}

/**
 * Limpa o buffer de uma câmera específica (ou todos se omitido).
 */
export function clearFrameBuffer(cameraId?: string): void {
  if (cameraId) buffers.delete(cameraId);
  else buffers.clear();
  notify();
}

/**
 * Retorna os frames bufferizados em torno de um evento.
 * @param cameraId  ID da câmera
 * @param eventTime Timestamp do evento (Date | number em ms)
 * @param beforeSec Segundos antes do evento (padrão 30)
 * @param afterSec  Segundos depois do evento (padrão 30)
 */
export function getReplayFrames(
  cameraId: string,
  eventTime: Date | number,
  beforeSec = DEFAULT_BEFORE,
  afterSec = DEFAULT_AFTER,
): BufferedFrame[] {
  const ts = typeof eventTime === 'number' ? eventTime : eventTime.getTime();
  const start = ts - beforeSec * 1000;
  const end = ts + afterSec * 1000;
  const all = buffers.get(cameraId) ?? [];
  return all.filter((f) => f.t >= start && f.t <= end);
}

/**
 * Estatísticas do buffer (útil para debug/UI).
 */
export function getBufferStats(cameraId: string): { count: number; spanSec: number } {
  const frames = buffers.get(cameraId) ?? [];
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (!first || !last || frames.length < 2) return { count: frames.length, spanSec: 0 };
  return {
    count: frames.length,
    spanSec: Math.round((last.t - first.t) / 1000),
  };
}

/**
 * Hook reativo: assina mudanças no buffer de uma câmera específica e
 * expõe utilitários para alimentar o buffer e consultar replays.
 *
 * Uso típico no player de vídeo:
 *   const { push } = useFrameBuffer(cameraId);
 *   useEffect(() => {
 *     const id = setInterval(() => {
 *       const snap = captureSnapshot(); // data URL
 *       if (snap) push(snap);
 *     }, 500); // ~2 fps
 *     return () => clearInterval(id);
 *   }, [push]);
 */
export function useFrameBuffer(cameraId: string | null | undefined) {
  const cameraIdRef = useRef(cameraId);
  useEffect(() => {
    cameraIdRef.current = cameraId;
  }, [cameraId]);

  const stats = useSyncExternalStore(
    subscribe,
    () => (cameraId ? getBufferStats(cameraId) : { count: 0, spanSec: 0 }),
    () => ({ count: 0, spanSec: 0 }),
  );

  const push = useCallback((src: string, t?: number) => {
    const id = cameraIdRef.current;
    if (id) pushFrame(id, src, t);
  }, []);

  const getReplay = useCallback(
    (eventTime: Date | number, beforeSec?: number, afterSec?: number) => {
      const id = cameraIdRef.current;
      return id ? getReplayFrames(id, eventTime, beforeSec, afterSec) : [];
    },
    [],
  );

  // Limpa buffer da câmera quando ela troca (não no mount inicial)
  const prevIdRef = useRef<string | null | undefined>(cameraId);
  useEffect(() => {
    prevIdRef.current = cameraId;
  }, [cameraId]);

  return { stats, push, getReplay };
}

/**
 * Hook puramente para consultar replays sem alimentar o buffer.
 * Útil em páginas de timeline de alertas onde o player não é a fonte dos frames.
 */
export function useReplayQuery(): {
  getReplay: (cameraId: string, eventTime: Date | number, beforeSec?: number, afterSec?: number) => BufferedFrame[];
  hasFramesFor: (cameraId: string) => boolean;
} {
  return {
    getReplay: getReplayFrames,
    hasFramesFor: (cameraId) => (buffers.get(cameraId)?.length ?? 0) > 0,
  };
}

export const FRAME_BUFFER_CONFIG = {
  BUFFER_SECONDS,
  MAX_FRAMES_PER_CAMERA,
  DEFAULT_BEFORE,
  DEFAULT_AFTER,
} as const;
