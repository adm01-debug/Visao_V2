import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { humanizeFunctionError } from '@/lib/edgeFunctionErrors';

export type PtzCommand =
  | 'move'
  | 'stop'
  | 'zoom'
  | 'focus'
  | 'iris'
  | 'goto_preset'
  | 'save_preset'
  | 'delete_preset'
  | 'home'
  | 'test'
  | 'get_status'
  | 'absolute_move';

export interface PtzStatusPayload {
  supported: true;
  ok: boolean;
  driver: string;
  used_relay: boolean;
  cam_status: number;
  latency_ms: number;
  position: { pan: number | null; tilt: number | null; zoom: number | null };
  moving: { pan_tilt: boolean | null; zoom: boolean | null };
  utc: string | null;
}

export interface PtzParams {
  pan?: number;
  tilt?: number;
  zoom?: number;
  focus?: number;
  iris?: number;
  speed?: number;
  preset_number?: number;
  preset_name?: string;
}

interface UsePtzControlOptions {
  cameraId: string;
  enabled?: boolean;
  /**
   * ID de um Agente Local para rotear os comandos PTZ. Necessário quando a
   * câmera está em LAN privada e a Edge Function não tem rota direta.
   */
  relayAgentId?: string | null;
}

/**
 * usePtzControl — abstrai chamadas à Edge Function `camera-ptz-control`,
 * mantém lock cooperativo por heartbeat e expõe estado de operação.
 */
export function usePtzControl({
  cameraId,
  enabled = true,
  relayAgentId = null,
}: UsePtzControlOptions) {
  const qc = useQueryClient();
  const [isMoving, setIsMoving] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Presets
  const presets = useQuery({
    queryKey: ['ptz-presets', cameraId],
    enabled: enabled && !!cameraId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camera_presets')
        .select('*')
        .eq('camera_id', cameraId)
        .order('preset_number', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Lock info (para mostrar "em uso por...")
  const lockInfo = useQuery({
    queryKey: ['ptz-lock', cameraId],
    enabled: enabled && !!cameraId,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data } = await supabase
        .from('camera_ptz_locks')
        .select('*')
        .eq('camera_id', cameraId)
        .maybeSingle();
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async ({ command, params }: { command: PtzCommand; params?: PtzParams }) => {
      const { data, error } = await supabase.functions.invoke('camera-ptz-control', {
        body: {
          camera_id: cameraId,
          command,
          params: params ?? {},
          ...(relayAgentId ? { relay_agent_id: relayAgentId } : {}),
        },
      });
      if (error) {
        const { message, payload } = await humanizeFunctionError(
          error,
          'Falha ao enviar comando PTZ'
        );
        const code = payload?.error_code ?? payload?.error;
        if (code === 'private_host_blocked') {
          throw new Error(
            'Câmera em rede local — selecione um Agente Local para rotear o comando PTZ.'
          );
        }
        throw new Error(message);
      }
      if (data?.error)
        throw new Error(
          data.error === 'camera_em_uso'
            ? `Câmera em uso por ${data.locked_by ?? 'outro operador'}`
            : data.error
        );
      return data;
    },
    onError: (err: Error) => toast.error(err.message),
    onSuccess: (_, vars) => {
      if (vars.command === 'save_preset' || vars.command === 'delete_preset') {
        qc.invalidateQueries({ queryKey: ['ptz-presets', cameraId] });
      }
    },
  });

  const send = useCallback(
    (command: PtzCommand, params?: PtzParams) => sendMutation.mutateAsync({ command, params }),
    [sendMutation]
  );

  // Movimento contínuo com heartbeat (renova lock a cada 5s)
  const startMove = useCallback(
    async (params: PtzParams) => {
      setIsMoving(true);
      await send('move', params);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        void send('move', params);
      }, 5000);
    },
    [send]
  );

  const stopMove = useCallback(async () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    setIsMoving(false);
    await send('stop');
  }, [send]);

  useEffect(
    () => () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      void supabase.rpc('release_ptz_lock', { _camera_id: cameraId });
    },
    [cameraId]
  );

  const presetsList = (presets.data ?? []) as Array<{
    id?: string;
    preset_number: number;
    name?: string | null;
    uses?: number | null;
    is_home?: boolean | null;
  }>;

  const topPresets = [...presetsList]
    .sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0) || a.preset_number - b.preset_number)
    .slice(0, 8);

  return {
    presets: presetsList,
    topPresets,
    presetsLoading: presets.isLoading,
    lockInfo: lockInfo.data,
    isMoving,
    isSending: sendMutation.isPending,
    send,
    /**
     * Consulta ONVIF GetStatus para amostrar a posição normalizada
     * reportada pelo dome. Retorna `null` quando o driver não expõe
     * GetStatus (Hikvision/Dahua/Axis) ou quando ocorre falha de rede.
     */
    getStatus: async (): Promise<PtzStatusPayload | null> => {
      try {
        const { data, error } = await supabase.functions.invoke('camera-ptz-control', {
          body: {
            camera_id: cameraId,
            command: 'get_status',
            params: {},
            ...(relayAgentId ? { relay_agent_id: relayAgentId } : {}),
          },
        });
        if (error) return null;
        if (!data || (data as { supported?: boolean }).supported !== true) return null;
        return data as PtzStatusPayload;
      } catch {
        return null;
      }
    },
    startMove,
    stopMove,
    gotoPreset: async (preset_number: number) => {
      const res = await send('goto_preset', { preset_number });
      qc.invalidateQueries({ queryKey: ['ptz-presets', cameraId] });
      return res;
    },
    savePreset: (preset_number: number, preset_name: string) =>
      send('save_preset', { preset_number, preset_name }),
    deletePreset: (preset_number: number) => send('delete_preset', { preset_number }),
    zoom: (delta: number, speed = 5) => send('zoom', { zoom: delta, speed }),
    focus: (delta: number) => send('focus', { focus: delta }),
    home: () => send('home'),
    /**
     * Movimento absoluto ONVIF: posiciona diretamente em (pan, tilt, zoom)
     * normalizados (-1..1 para pan/tilt, 0..1 para zoom) sem depender do
     * cálculo tempo→posição. Requer driver ONVIF com suporte a AbsoluteMove.
     */
    absoluteMove: (pos: { pan?: number; tilt?: number; zoom?: number; speed?: number }) =>
      send('absolute_move', pos),
    testMovement: () =>
      send('move', { pan: 0.2, tilt: 0, speed: 3 }).then(() => setTimeout(() => send('stop'), 500)),
  };
}
