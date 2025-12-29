/**
 * VISÃO - Sistema de Vigilância Inteligente
 * App Store - Store principal da aplicação
 * 
 * @module stores/appStore
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  // Estado global da aplicação
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Sidebar e navegação
  sidebarOpen: boolean;
  currentPage: string;
  
  // Actions
  setInitialized: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: string) => void;
  reset: () => void;
}

const initialState = {
  isInitialized: false,
  isLoading: false,
  error: null,
  sidebarOpen: true,
  currentPage: '/',
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        setInitialized: (value) => set({ isInitialized: value }),
        setLoading: (value) => set({ isLoading: value }),
        setError: (error) => set({ error }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setCurrentPage: (page) => set({ currentPage: page }),
        reset: () => set(initialState),
      }),
      {
        name: 'vis-o-app-store',
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    { name: 'AppStore' }
  )
);

// Seletores otimizados
export const useIsInitialized = () => useAppStore((state) => state.isInitialized);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useAppError = () => useAppStore((state) => state.error);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useCurrentPage = () => useAppStore((state) => state.currentPage);
