import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  language: string;
  timezone: string;
  dateFormat: string;
  autoRefresh: boolean;
  refreshInterval: number;
  notifications: boolean;
  sounds: boolean;
  gridLayout: '2x2' | '3x3' | '4x4';
}

interface SettingsStore extends Settings {
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  dateFormat: 'dd/MM/yyyy',
  autoRefresh: true,
  refreshInterval: 30000,
  notifications: true,
  sounds: true,
  gridLayout: '2x2',
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
      resetSettings: () => set(defaultSettings),
    }),
    { name: 'settings-store' }
  )
);

export default useSettingsStore;
