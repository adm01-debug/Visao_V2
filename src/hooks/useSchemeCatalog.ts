/**
 * Onda 220 — Catálogo real de origens (câmeras) e bibliotecas de faces.
 *
 * O hook só **lê**; toda decisão sobre o que está presente, ausente ou
 * verificável é da régua pura `schemeCatalog.ts`. A distinção que importa aqui
 * é entre "não existe" e "ainda não sei": enquanto a consulta não terminar (ou
 * se falhar), `known` é `false` e ninguém pode ser acusado de ter sumido.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  buildSchemeContext,
  type CatalogSnapshot,
  type FaceLibraryOption,
} from '@/lib/alarms/schemeCatalog';
import type { SchemeContext } from '@/lib/alarms/alarmScheme';

export interface SchemeCatalogModel {
  readonly cameras: CatalogSnapshot;
  readonly libraries: CatalogSnapshot;
  readonly libraryOptions: readonly FaceLibraryOption[];
  readonly context: SchemeContext;
  readonly isLoading: boolean;
  readonly error: Error | null;
}

interface CameraRow {
  id: string;
  name: string | null;
  location: string | null;
  status: string | null;
}

interface PersonRow {
  list_type: string | null;
  is_active: boolean | null;
}

interface FaceConfigRow {
  camera_id: string | null;
  enabled: boolean | null;
}

const LIST_LABEL: Record<string, string> = {
  whitelist: 'Lista branca',
  blacklist: 'Lista negra',
  vip: 'VIP',
  staff: 'Colaboradores',
  visitors: 'Visitantes',
};

export function useSchemeCatalog(enabled = true): SchemeCatalogModel {
  const camerasQuery = useQuery({
    queryKey: ['scheme-catalog', 'cameras'],
    enabled,
    queryFn: async (): Promise<CameraRow[]> => {
      const { data, error } = await supabase
        .from('cameras')
        .select('id,name,location,status')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as CameraRow[];
    },
  });

  const librariesQuery = useQuery({
    queryKey: ['scheme-catalog', 'face-libraries'],
    enabled,
    queryFn: async () => {
      const [people, configs] = await Promise.all([
        supabase.from('registered_persons').select('list_type,is_active'),
        supabase.from('face_recognition_configs').select('camera_id,enabled'),
      ]);
      if (people.error) throw new Error(people.error.message);
      if (configs.error) throw new Error(configs.error.message);
      return {
        people: (people.data ?? []) as PersonRow[],
        configs: (configs.data ?? []) as FaceConfigRow[],
      };
    },
  });

  return useMemo(() => {
    const camerasKnown = camerasQuery.isSuccess;
    const cameras: CatalogSnapshot = {
      known: camerasKnown,
      options: (camerasQuery.data ?? []).map((row) => ({
        id: row.id,
        label: row.name?.trim() || row.id,
        hint: [row.location?.trim(), row.status?.trim()].filter(Boolean).join(' · ') || undefined,
      })),
    };

    const librariesKnown = librariesQuery.isSuccess;
    const payload = librariesQuery.data;

    // Só dispositivos com reconhecimento facial ligado carregam biblioteca —
    // dizer o contrário faria S6 aprovar um vínculo que o equipamento nunca
    // executaria.
    const faceDeviceIds = Array.from(
      new Set(
        (payload?.configs ?? [])
          .filter((c) => c.enabled !== false && typeof c.camera_id === 'string')
          .map((c) => c.camera_id as string),
      ),
    );

    const counts = new Map<string, number>();
    for (const person of payload?.people ?? []) {
      const list = (person.list_type ?? '').trim();
      if (list.length === 0) continue;
      if (person.is_active === false) continue;
      counts.set(list, (counts.get(list) ?? 0) + 1);
    }

    const libraryOptions: FaceLibraryOption[] = Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([list, total]) => ({
        id: list,
        label: LIST_LABEL[list] ?? list,
        hint: `${total} face(s) ativa(s)`,
        deviceIds: faceDeviceIds,
      }));

    const libraries: CatalogSnapshot = {
      known: librariesKnown,
      options: libraryOptions.map(({ id, label, hint }) => ({ id, label, hint })),
    };

    return {
      cameras,
      libraries,
      libraryOptions,
      context: buildSchemeContext(libraryOptions, librariesKnown),
      isLoading: camerasQuery.isLoading || librariesQuery.isLoading,
      error:
        ((camerasQuery.error ?? librariesQuery.error) as Error | null) ?? null,
    };
  }, [
    camerasQuery.data,
    camerasQuery.isSuccess,
    camerasQuery.isLoading,
    camerasQuery.error,
    librariesQuery.data,
    librariesQuery.isSuccess,
    librariesQuery.isLoading,
    librariesQuery.error,
  ]);
}
