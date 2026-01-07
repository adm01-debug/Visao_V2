import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode, ThemeVariant, ThemeState } from '@/types/themes';

interface ThemeStore extends ThemeState {
  setMode: (mode: ThemeMode) => void;
  setVariant: (variant: ThemeVariant) => void;
  toggle: () => void;
  reset: () => void;
}

const defaultState: ThemeState = {
  mode: 'dark',
  variant: 'default',
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      setMode: (mode) => set({ mode }),
      setVariant: (variant) => set({ variant }),
      toggle: () => set((state) => ({ 
        mode: state.mode === 'dark' ? 'light' : 'dark' 
      })),
      reset: () => set(defaultState),
    }),
    { name: 'visao-theme-store' }
  )
);

export default useThemeStore;
