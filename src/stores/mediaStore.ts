/**
 * Media Store
 * State management for media (videos, photos)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MediaItem { id: string; type: 'video' | 'image' | 'audio'; url: string; thumbnail?: string; name: string; size: number; duration?: number; createdAt: Date; }

interface MediaState {
  items: MediaItem[];
  selectedIds: string[];
  isLoading: boolean;
  error: string | null;
  addItem: (item: MediaItem) => void;
  removeItem: (id: string) => void;
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMediaStore = create<MediaState>()(persist((set) => ({
  items: [],
  selectedIds: [],
  isLoading: false,
  error: null,
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
  selectItem: (id) => set((s) => ({ selectedIds: [...s.selectedIds, id] })),
  deselectItem: (id) => set((s) => ({ selectedIds: s.selectedIds.filter(i => i !== id) })),
  clearSelection: () => set({ selectedIds: [] }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}), { name: 'media-store' }));

export default useMediaStore;
