// Search Store - Projeto VISÃO
// Gerenciamento de busca com tipagem forte

import { create } from 'zustand';

export type SearchCategory = 'all' | 'cameras' | 'alerts' | 'people' | 'recordings' | 'zones';

export interface SearchResult {
  id: string;
  type: SearchCategory;
  title: string;
  description?: string;
  url: string;
  thumbnail?: string;
  metadata?: Record<string, string | number>;
  score: number;
  highlight?: string;
}

export interface SearchFilters {
  category: SearchCategory;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  filters: SearchFilters;
  isLoading: boolean;
  error: string | null;
  recentSearches: string[];
  totalResults: number;
  page: number;
  pageSize: number;
}

export interface SearchActions {
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  search: () => Promise<void>;
  clearResults: () => void;
  addToRecent: (query: string) => void;
  clearRecent: () => void;
  nextPage: () => void;
  prevPage: () => void;
}

const initialState: SearchState = {
  query: '',
  results: [],
  filters: { category: 'all' },
  isLoading: false,
  error: null,
  recentSearches: [],
  totalResults: 0,
  page: 1,
  pageSize: 20,
};

export const useSearchStore = create<SearchState & SearchActions>((set, get) => ({
  ...initialState,

  setQuery: (query) => set({ query }),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
    page: 1,
  })),

  search: async () => {
    const { query, filters, page, pageSize } = get();
    if (!query.trim()) return;

    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams({
        q: query,
        category: filters.category,
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      set({
        results: data.results,
        totalResults: data.total,
        isLoading: false,
      });

      get().addToRecent(query);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro na busca',
        isLoading: false,
      });
    }
  },

  clearResults: () => set({ results: [], totalResults: 0, page: 1 }),

  addToRecent: (query) => set((state) => ({
    recentSearches: [query, ...state.recentSearches.filter(q => q !== query)].slice(0, 10),
  })),

  clearRecent: () => set({ recentSearches: [] }),

  nextPage: () => set((state) => ({ page: state.page + 1 })),

  prevPage: () => set((state) => ({ page: Math.max(1, state.page - 1) })),
}));

export default useSearchStore;
