import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFilterConfirmation } from '@/providers/FilterPersistenceProvider';

export type FilterScope =
  | 'alerts'
  | 'cameras'
  | 'people'
  | 'zones'
  | 'recordings'
  | 'recognition-logs'
  | 'analysis-history'
  | 'license-plate-history';

export interface UseManagedFiltersOptions<T extends Record<string, unknown>> {
  scope: FilterScope | string;
  defaults: T;
  /** Mapa de chave do filtro → label legível em pt-BR usado no toast e modal. */
  labels?: Partial<Record<keyof T & string, string>>;
  /** Chaves extras de localStorage que devem ser limpas junto e restauradas no undo. */
  persistKeys?: string[];
  /** Pular modal de confirmação. Default: true (com confirmação). */
  confirm?: boolean;
  /** Predicate para decidir se um valor "está ativo". Default: !== default && não-vazio. */
  isActive?: (key: keyof T, value: T[keyof T], defaultValue: T[keyof T]) => boolean;
}

const STORAGE_PREFIX = 'managed-filters:';
const SYNC_DEBOUNCE_MS = 800;
const UNDO_WINDOW_MS = 10000;

const defaultIsActive = <T,>(_k: keyof T, value: unknown, defaultValue: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '' && value !== defaultValue;
  return value !== defaultValue;
};

interface Snapshot<T> {
  filters: T;
  persistedKeys: Record<string, string | null>;
}

export function useManagedFilters<T extends Record<string, unknown>>(
  opts: UseManagedFiltersOptions<T>
) {
  const {
    scope,
    defaults,
    labels = {},
    persistKeys = [],
    confirm = true,
    isActive = defaultIsActive,
  } = opts;

  const storageKey = `${STORAGE_PREFIX}${scope}`;
  const { requestConfirmation } = useFilterConfirmation();
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoSnapshotRef = useRef<Snapshot<T> | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Hidratação local-first
  const [filters, setFiltersState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return { ...defaults, ...JSON.parse(raw) } as T;
    } catch {
      /* ignore parse errors */
    }
    return defaults;
  });

  // Persistir local + agendar sync remoto
  const persistAndSync = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* quota / private mode */
      }
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(async () => {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return;
        await supabase
          .from('user_filter_preferences')
          .upsert(
            { user_id: auth.user.id, scope: String(scope), filters: next as never },
            { onConflict: 'user_id,scope' }
          );
      }, SYNC_DEBOUNCE_MS);
    },
    [storageKey, scope]
  );

  const setFilters = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setFiltersState((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
        persistAndSync(next);
        return next;
      });
    },
    [persistAndSync]
  );

  // Sync inicial vindo do Supabase (background)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from('user_filter_preferences')
        .select('filters')
        .eq('user_id', auth.user.id)
        .eq('scope', String(scope))
        .maybeSingle();
      if (cancelled || !data?.filters) return;
      const remote = { ...defaults, ...(data.filters as Record<string, unknown>) } as T;
      setFiltersState(remote);
      try {
        localStorage.setItem(storageKey, JSON.stringify(remote));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, storageKey, defaults]);

  const activeEntries = useMemo(() => {
    const entries: Array<{ key: keyof T; label: string }> = [];
    (Object.keys(defaults) as Array<keyof T>).forEach((key) => {
      if (isActive(key, filters[key], defaults[key])) {
        entries.push({ key, label: (labels as Record<string, string>)[String(key)] ?? String(key) });
      }
    });
    return entries;
  }, [filters, defaults, isActive, labels]);

  const hasActiveFilters = activeEntries.length > 0;

  const performClear = useCallback(() => {
    // Snapshot para undo
    const persistedKeys: Record<string, string | null> = {
      [storageKey]: localStorage.getItem(storageKey),
    };
    persistKeys.forEach((k) => {
      persistedKeys[k] = localStorage.getItem(k);
    });
    undoSnapshotRef.current = { filters, persistedKeys };

    // Limpa
    setFiltersState(defaults);
    persistAndSync(defaults);
    persistKeys.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });

    const fieldList = activeEntries.map((e) => e.label).join(', ') || 'nenhum';
    const keyList = [storageKey, ...persistKeys].join(', ');

    toast.success('Filtros limpos', {
      description: `Removido: ${fieldList} • localStorage: ${keyList}`,
      duration: UNDO_WINDOW_MS,
      action: {
        label: 'Desfazer',
        onClick: () => {
          const snap = undoSnapshotRef.current;
          if (!snap) return;
          setFiltersState(snap.filters);
          persistAndSync(snap.filters);
          Object.entries(snap.persistedKeys).forEach(([k, v]) => {
            try {
              if (v === null) localStorage.removeItem(k);
              else localStorage.setItem(k, v);
            } catch {
              /* ignore */
            }
          });
          undoSnapshotRef.current = null;
          toast.success('Filtros restaurados');
        },
      },
    });

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      undoSnapshotRef.current = null;
    }, UNDO_WINDOW_MS);
  }, [filters, defaults, persistAndSync, storageKey, persistKeys, activeEntries]);

  const clearFilters = useCallback(() => {
    if (!hasActiveFilters) {
      toast.info('Nenhum filtro ativo para limpar');
      return;
    }
    if (!confirm) {
      performClear();
      return;
    }
    const fieldList = activeEntries.map((e) => e.label).join(', ');
    requestConfirmation({
      title: 'Limpar filtros?',
      description: `Você vai limpar: ${fieldList}. Esta ação pode ser desfeita por 10 segundos.`,
      confirmLabel: 'Limpar filtros',
      onConfirm: performClear,
    });
  }, [confirm, hasActiveFilters, activeEntries, performClear, requestConfirmation]);

  return { filters, setFilters, clearFilters, hasActiveFilters, activeEntries };
}
