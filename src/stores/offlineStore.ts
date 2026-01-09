// Offline Store - Projeto VISÃO
// Gerenciamento de dados offline com tipagem forte

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiry: number;
  key: string;
}

export interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

export interface OfflineState {
  isOnline: boolean;
  cache: Map<string, CacheEntry>;
  pendingActions: PendingAction[];
  lastSync: Date | null;
  syncInProgress: boolean;
}

export interface OfflineActions {
  setOnline: (isOnline: boolean) => void;
  cacheData: <T>(key: string, data: T, ttl?: number) => void;
  getCached: <T>(key: string) => T | null;
  invalidateCache: (key: string) => void;
  clearCache: () => void;
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'retries'>) => void;
  removePendingAction: (id: string) => void;
  sync: () => Promise<void>;
}

const DEFAULT_TTL = 5 * 60 * 1000;

const initialState: OfflineState = {
  isOnline: navigator.onLine,
  cache: new Map(),
  pendingActions: [],
  lastSync: null,
  syncInProgress: false,
};

export const useOfflineStore = create<OfflineState & OfflineActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOnline: (isOnline) => {
        set({ isOnline });
        if (isOnline) get().sync();
      },

      cacheData: <T>(key: string, data: T, ttl = DEFAULT_TTL) => {
        const entry: CacheEntry<T> = {
          key,
          data,
          timestamp: Date.now(),
          expiry: Date.now() + ttl,
        };
        set((state) => {
          const newCache = new Map(state.cache);
          newCache.set(key, entry as CacheEntry);
          return { cache: newCache };
        });
      },

      getCached: <T>(key: string): T | null => {
        const entry = get().cache.get(key) as CacheEntry<T> | undefined;
        if (!entry) return null;
        if (Date.now() > entry.expiry) {
          get().invalidateCache(key);
          return null;
        }
        return entry.data;
      },

      invalidateCache: (key) => set((state) => {
        const newCache = new Map(state.cache);
        newCache.delete(key);
        return { cache: newCache };
      }),

      clearCache: () => set({ cache: new Map() }),

      addPendingAction: (action) => {
        const pendingAction: PendingAction = {
          ...action,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          retries: 0,
        };
        set((state) => ({
          pendingActions: [...state.pendingActions, pendingAction],
        }));
      },

      removePendingAction: (id) => set((state) => ({
        pendingActions: state.pendingActions.filter((a) => a.id !== id),
      })),

      sync: async () => {
        const { isOnline, pendingActions, syncInProgress } = get();
        if (!isOnline || syncInProgress || pendingActions.length === 0) return;

        set({ syncInProgress: true });

        for (const action of pendingActions) {
          try {
            await fetch(`/api/${action.resource}`, {
              method: action.type === 'delete' ? 'DELETE' : action.type === 'create' ? 'POST' : 'PUT',
              body: JSON.stringify(action.data),
            });
            get().removePendingAction(action.id);
          } catch {
            set((state) => ({
              pendingActions: state.pendingActions.map((a) =>
                a.id === action.id ? { ...a, retries: a.retries + 1 } : a
              ),
            }));
          }
        }

        set({ syncInProgress: false, lastSync: new Date() });
      },
    }),
    {
      name: 'visao-offline-store',
      partialize: (state) => ({
        pendingActions: state.pendingActions,
        lastSync: state.lastSync,
      }),
    }
  )
);

export default useOfflineStore;
