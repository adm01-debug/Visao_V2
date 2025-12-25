import { create } from 'zustand';

interface Filters {
  search: string;
  status: string[];
  dateRange: { start: Date | null; end: Date | null };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface FilterStore extends Filters {
  setSearch: (search: string) => void;
  setStatus: (status: string[]) => void;
  setDateRange: (range: { start: Date | null; end: Date | null }) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  clearFilters: () => void;
}

const defaultFilters: Filters = {
  search: '',
  status: [],
  dateRange: { start: null, end: null },
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...defaultFilters,
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setDateRange: (dateRange) => set({ dateRange }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  clearFilters: () => set(defaultFilters),
}));

export default useFilterStore;
