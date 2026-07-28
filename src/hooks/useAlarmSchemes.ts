/**
 * Onda 216 — Leitura dos esquemas de alarme persistidos (Onda 217) julgados
 * pela régua única da Onda 215.
 *
 * O hook nunca "conserta" o que vem do banco: linha malformada vira diagnóstico
 * inconsistente/inoperante, jamais é escondida. Apagar é pior que avisar.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  diagnoseScheme,
  detectDuplicatePairings,
  type AlarmActionDraft,
  type AlarmSchemeDraft,
  type DuplicatePairing,
  type SchemeDiagnosis,
} from '@/lib/alarms/alarmScheme';
import type { AlarmSchedule } from '@/lib/alarms/alarmAggregation';

export interface AlarmSchemeRow {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly eventType: string;
  readonly updatedAt: string;
}

export interface AlarmSchemeEntry {
  readonly row: AlarmSchemeRow;
  readonly diagnosis: SchemeDiagnosis;
}

/** Converte com desconfiança: nada vindo do banco é assumido bem-formado. */
const toDraft = (raw: Record<string, unknown>): AlarmSchemeDraft => {
  const actions = Array.isArray(raw.actions) ? (raw.actions as AlarmActionDraft[]) : [];
  return {
    id: String(raw.id ?? ''),
    name: typeof raw.name === 'string' ? raw.name : '',
    enabled: raw.enabled === true,
    eventType: typeof raw.event_type === 'string' ? raw.event_type : '',
    sourceIds: Array.isArray(raw.source_ids) ? (raw.source_ids as string[]) : [],
    missingSourceIds: Array.isArray(raw.missing_source_ids)
      ? (raw.missing_source_ids as string[])
      : [],
    actions,
    schedule: (raw.schedule as AlarmSchedule | null) ?? null,
    faceLibraryIds: Array.isArray(raw.face_library_ids) ? (raw.face_library_ids as string[]) : [],
    disconnectThresholdS:
      typeof raw.disconnect_threshold_s === 'number' ? raw.disconnect_threshold_s : null,
  };
};

export interface AlarmSchemesModel {
  readonly entries: readonly AlarmSchemeEntry[];
  readonly duplicates: readonly DuplicatePairing[];
  readonly counts: { ok: number; inconsistent: number; inoperative: number; disabled: number };
  readonly isLoading: boolean;
  readonly error: Error | null;
}

export function useAlarmSchemes(): AlarmSchemesModel {
  const query = useQuery({
    queryKey: ['alarm-schemes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alarm_schemes')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
  });

  return useMemo(() => {
    const rows = query.data ?? [];
    const entries: AlarmSchemeEntry[] = rows.map((raw) => {
      const draft = toDraft(raw);
      return {
        row: {
          id: draft.id,
          name: draft.name,
          enabled: draft.enabled,
          eventType: draft.eventType,
          updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : '',
        },
        diagnosis: diagnoseScheme(draft),
      };
    });

    const counts = { ok: 0, inconsistent: 0, inoperative: 0, disabled: 0 };
    for (const { diagnosis } of entries) {
      counts[diagnosis.health] += 1;
      if (!diagnosis.enabled) counts.disabled += 1;
    }

    return {
      entries,
      duplicates: detectDuplicatePairings(entries.map((e) => e.diagnosis)),
      counts,
      isLoading: query.isLoading,
      error: (query.error as Error | null) ?? null,
    };
  }, [query.data, query.isLoading, query.error]);
}
