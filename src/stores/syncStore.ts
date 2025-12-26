/**
 * Sync Store
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SyncState {
  lastSyncAt: Date | null;
  isSyncing: boolean;
  pendingChanges: number;
  syncErrors: string[];
  startSync: () => void;
  endSync: (success: boolean, error?: string) => void;
  addPendingChange: () => void;
  clearPendingChanges: () => void;
}

export const useSyncStore = create<SyncState>()(persist((set) => ({
  lastSyncAt: null,
  isSyncing: false,
  pendingChanges: 0,
  syncErrors: [],
  startSync: () => set({ isSyncing: true }),
  endSync: (success, error) => set((s) => ({ isSyncing: false, lastSyncAt: success ? new Date() : s.lastSyncAt, pendingChanges: success ? 0 : s.pendingChanges, syncErrors: error ? [...s.syncErrors, error] : s.syncErrors })),
  addPendingChange: () => set((s) => ({ pendingChanges: s.pendingChanges + 1 })),
  clearPendingChanges: () => set({ pendingChanges: 0 }),
}), { name: 'sync-store' }));

export default useSyncStore;
