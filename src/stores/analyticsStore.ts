/**
 * Analytics Store
 */
import { create } from 'zustand';

export interface AnalyticsEvent { id: string; name: string; properties: Record<string, any>; timestamp: Date; }

interface AnalyticsState {
  events: AnalyticsEvent[];
  isEnabled: boolean;
  trackEvent: (name: string, properties?: Record<string, any>) => void;
  clearEvents: () => void;
  setEnabled: (enabled: boolean) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  events: [],
  isEnabled: true,
  trackEvent: (name, properties = {}) => set((s) => s.isEnabled ? { events: [...s.events, { id: crypto.randomUUID(), name, properties, timestamp: new Date() }].slice(-1000) } : s),
  clearEvents: () => set({ events: [] }),
  setEnabled: (isEnabled) => set({ isEnabled }),
}));

export default useAnalyticsStore;
