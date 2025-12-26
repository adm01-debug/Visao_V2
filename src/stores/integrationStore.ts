/**
 * Integration Store
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Integration { id: string; name: string; type: string; isConnected: boolean; config?: Record<string, any>; lastSync?: Date; }

interface IntegrationState {
  integrations: Integration[];
  addIntegration: (integration: Integration) => void;
  updateIntegration: (id: string, updates: Partial<Integration>) => void;
  removeIntegration: (id: string) => void;
  connect: (id: string) => void;
  disconnect: (id: string) => void;
}

export const useIntegrationStore = create<IntegrationState>()(persist((set) => ({
  integrations: [],
  addIntegration: (integration) => set((s) => ({ integrations: [...s.integrations, integration] })),
  updateIntegration: (id, updates) => set((s) => ({ integrations: s.integrations.map(i => i.id === id ? { ...i, ...updates } : i) })),
  removeIntegration: (id) => set((s) => ({ integrations: s.integrations.filter(i => i.id !== id) })),
  connect: (id) => set((s) => ({ integrations: s.integrations.map(i => i.id === id ? { ...i, isConnected: true } : i) })),
  disconnect: (id) => set((s) => ({ integrations: s.integrations.map(i => i.id === id ? { ...i, isConnected: false } : i) })),
}), { name: 'integration-store' }));

export default useIntegrationStore;
