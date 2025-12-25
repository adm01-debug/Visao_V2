import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchStore {
  query: string;
  recentSearches: string[];
  results: any[];
  loading: boolean;
  setQuery: (query: string) => void;
  addRecentSearch: (search: string) => void;
  clearRecentSearches: () => void;
  setResults: (results: any[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      query: '',
      recentSearches: [],
      results: [],
      loading: false,
      setQuery: (query) => set({ query }),
      addRecentSearch: (search) => set((state) => ({
        recentSearches: [search, ...state.recentSearches.filter(s => s !== search)].slice(0, 10),
      })),
      clearRecentSearches: () => set({ recentSearches: [] }),
      setResults: (results) => set({ results }),
      setLoading: (loading) => set({ loading }),
    }),
    { name: 'search-store', partialize: (state) => ({ recentSearches: state.recentSearches }) }
  )
);

export default useSearchStore;
