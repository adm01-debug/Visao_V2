/**
 * Offline Store
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OfflineState {
  isOnline: boolean;
  offlineData: Record<string, any>;
  pendingRequests: { id: string; url: string; method: string; body?: any }[];
  setOnline: (online: boolean) => void;
  saveOfflineData: (key: string, data: any) => void;
  getOfflineData: (key: string) => any;
  addPendingRequest: (request: Omit<OfflineState['pendingRequests'][0], 'id'>) => void;
  removePendingRequest: (id: string) => void;
  clearPendingRequests: () => void;
}

export const useOfflineStore = create<OfflineState>()(persist((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  offlineData: {},
  pendingRequests: [],
  setOnline: (isOnline) => set({ isOnline }),
  saveOfflineData: (key, data) => set((s) => ({ offlineData: { ...s.offlineData, [key]: data } })),
  getOfflineData: (key) => get().offlineData[key],
  addPendingRequest: (request) => set((s) => ({ pendingRequests: [...s.pendingRequests, { ...request, id: crypto.randomUUID() }] })),
  removePendingRequest: (id) => set((s) => ({ pendingRequests: s.pendingRequests.filter(r => r.id !== id) })),
  clearPendingRequests: () => set({ pendingRequests: [] }),
}), { name: 'offline-store' }));

export default useOfflineStore;
