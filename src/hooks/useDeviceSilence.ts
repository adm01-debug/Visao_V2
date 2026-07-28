/**
 * Onda 192 — presença dos equipamentos registrados, pronta para a tela.
 *
 * A tela não julga: ela lê os registros que a RLS permite (`device_registrations`
 * é isolada por dono) e entrega os retratos para {@link classifyDeviceSilence},
 * a mesma régua que a rotina SQL espelha. O painel mostra, por construção, o
 * mesmo veredito que gera o alerta de manutenção.
 *
 * Duas decisões deliberadas, herdadas das ondas anteriores:
 *
 * 1. **O instante do julgamento é congelado por busca.** Usar `Date.now()` na
 *    renderização faria um equipamento "piorar" entre dois quadros sem nenhum
 *    dado novo — o operador veria gravidade mudando sozinha.
 *
 * 2. **A última recusa vem agregada do banco, não contada no cliente.** É ela
 *    que separa "sumiu" de "está sendo recusado", e essa distinção não pode
 *    depender de quantas linhas de trilha couberam na página.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  classifyDeviceSilence,
  compareDeviceSilence,
  summarizeDeviceSilence,
  type DeviceSilenceSummary,
  type DeviceSilenceVerdict,
} from '@/lib/devices/deviceSilence';

interface RawRegistration {
  id: string;
  device_code: string;
  label: string;
  status: string;
  last_seen_at: string | null;
  expires_at: string | null;
  rotated_at: string | null;
  created_at: string;
}

interface RawDenial {
  registration_id: string | null;
  created_at: string;
}

const toMillis = (value: string | null): number | null => {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const isStatus = (value: string): value is 'pending' | 'active' | 'revoked' =>
  value === 'pending' || value === 'active' || value === 'revoked';

export interface DeviceSilenceQuery {
  readonly verdicts: readonly DeviceSilenceVerdict[];
  readonly summary: DeviceSilenceSummary;
  readonly evaluatedAt: number | null;
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly refetch: () => void;
}

export function useDeviceSilence(): DeviceSilenceQuery {
  const query = useQuery({
    queryKey: ['device-silence'],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const evaluatedAt = Date.now();

      const { data: registrations, error: regError } = await supabase
        .from('device_registrations')
        .select('id, device_code, label, status, last_seen_at, expires_at, rotated_at, created_at')
        .order('device_code', { ascending: true });
      if (regError) throw regError;

      const { data: denials, error: denialError } = await supabase
        .from('device_registration_audit')
        .select('registration_id, created_at')
        .eq('event', 'auth_denied')
        .order('created_at', { ascending: false })
        .limit(500);
      if (denialError) throw denialError;

      // Só a recusa mais recente por registro importa; a ordem já veio do banco.
      const lastDenial = new Map<string, number>();
      for (const row of (denials ?? []) as RawDenial[]) {
        if (row.registration_id === null || lastDenial.has(row.registration_id)) continue;
        const at = toMillis(row.created_at);
        if (at !== null) lastDenial.set(row.registration_id, at);
      }

      const verdicts = ((registrations ?? []) as RawRegistration[]).map((row) =>
        classifyDeviceSilence(
          {
            registrationId: row.id,
            deviceCode: row.device_code,
            label: row.label,
            status: isStatus(row.status) ? row.status : 'pending',
            lastSeenAt: toMillis(row.last_seen_at),
            lastDeniedAt: lastDenial.get(row.id) ?? null,
            expiresAt: toMillis(row.expires_at),
            rotatedAt: toMillis(row.rotated_at),
            createdAt: toMillis(row.created_at) ?? evaluatedAt,
          },
          evaluatedAt,
        ),
      );

      return { verdicts: [...verdicts].sort(compareDeviceSilence), evaluatedAt };
    },
  });

  const summary = useMemo(
    () => summarizeDeviceSilence(query.data?.verdicts ?? []),
    [query.data?.verdicts],
  );

  return {
    verdicts: query.data?.verdicts ?? [],
    summary,
    evaluatedAt: query.data?.evaluatedAt ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
