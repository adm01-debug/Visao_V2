import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  decideActuation,
  type IoCommandKind,
  type IoDecision,
  type IoPortConfig,
} from '@/lib/devices/ioSafety';

/**
 * Onda 154 — leitura das portas de I/O e acionamento com veredito antecipado.
 *
 * O hook chama `decideActuation` ANTES de disparar a requisição, com a mesma
 * regra que a Edge Function aplica no servidor. Não é validação de segurança —
 * a decisão que vale é sempre a do servidor. É cortesia de latência: recusar
 * localmente um pulso que ainda está dentro do intervalo mínimo evita uma ida
 * ao equipamento para receber a mesma recusa 400 ms depois.
 *
 * O relógio usado é o do navegador. Isso importa: um cliente com relógio
 * adiantado poderia liberar localmente um comando que o servidor recusa. Por
 * isso o veredito local NUNCA habilita nada — ele apenas explica; quem
 * autoriza é o servidor.
 */
export interface IoPortRow {
  id: string;
  camera_id: string;
  direction: 'input' | 'output';
  port_token: string;
  label: string;
  idle_state: 'open' | 'closed';
  output_mode: 'monostable' | 'bistable';
  pulse_ms: number;
  min_interval_ms: number;
  enabled: boolean;
  last_state: 'active' | 'inactive' | 'unknown';
  last_state_at: string | null;
  last_actuated_at: string | null;
}

export interface ActuationResult {
  ok: boolean;
  reason?: string;
  retryAfterMs?: number | null;
}

const toConfig = (row: IoPortRow): IoPortConfig => ({
  id: row.id,
  direction: row.direction,
  enabled: row.enabled,
  outputMode: row.output_mode,
  pulseMs: row.pulse_ms,
  minIntervalMs: row.min_interval_ms,
  lastState: row.last_state,
  lastActuatedAtMs: row.last_actuated_at ? Date.parse(row.last_actuated_at) : null,
});

export function useCameraIo(cameraId: string | undefined) {
  const [ports, setPorts] = useState<IoPortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPortId, setBusyPortId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cameraId) {
      setPorts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('camera_io_ports')
      .select('*')
      .eq('camera_id', cameraId)
      .order('direction', { ascending: false })
      .order('port_token', { ascending: true });

    if (queryError) {
      logger.error('useCameraIo: falha ao carregar portas', { error: queryError.message });
      setError(queryError.message);
      setPorts([]);
    } else {
      setError(null);
      setPorts((data ?? []) as unknown as IoPortRow[]);
    }
    setLoading(false);
  }, [cameraId]);

  useEffect(() => {
    void load();
  }, [load]);

  const outputs = useMemo(() => ports.filter((p) => p.direction === 'output'), [ports]);
  const inputs = useMemo(() => ports.filter((p) => p.direction === 'input'), [ports]);

  /** Veredito local, apenas para explicar o botão desabilitado ao operador. */
  const preview = useCallback(
    (row: IoPortRow, kind: IoCommandKind, hasCapability: boolean): IoDecision =>
      decideActuation({
        port: toConfig(row),
        command: { kind, durationMs: null },
        hasCapability,
        nowMs: Date.now(),
      }),
    [],
  );

  const actuate = useCallback(
    async (row: IoPortRow, kind: IoCommandKind, durationMs?: number): Promise<ActuationResult> => {
      setBusyPortId(row.id);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('camera-io-control', {
          body: {
            action: 'actuate',
            camera_id: row.camera_id,
            port_id: row.id,
            command: kind,
            duration_ms: durationMs ?? null,
            origin: 'human',
          },
        });
        if (fnError) {
          logger.error('useCameraIo: acionamento falhou', { error: fnError.message });
          return { ok: false, reason: 'request_failed' };
        }
        const payload = data as { ok?: boolean; error?: string; retry_after_ms?: number | null };
        await load();
        return payload?.ok
          ? { ok: true }
          : { ok: false, reason: payload?.error ?? 'unknown', retryAfterMs: payload?.retry_after_ms ?? null };
      } finally {
        setBusyPortId(null);
      }
    },
    [load],
  );

  const discover = useCallback(async (): Promise<ActuationResult> => {
    if (!cameraId) return { ok: false, reason: 'no_camera' };
    const { data, error: fnError } = await supabase.functions.invoke('camera-io-control', {
      body: { action: 'discover', camera_id: cameraId },
    });
    if (fnError) return { ok: false, reason: 'request_failed' };
    await load();
    const payload = data as { ok?: boolean; error?: string };
    return payload?.ok ? { ok: true } : { ok: false, reason: payload?.error ?? 'unknown' };
  }, [cameraId, load]);

  return { ports, outputs, inputs, loading, error, busyPortId, preview, actuate, discover, reload: load };
}
