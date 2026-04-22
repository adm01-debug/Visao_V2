import { create } from 'zustand';
import { toast } from 'sonner';

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
  /**
   * @deprecated Prefira `useManagedFilters({ scope, ... })` para confirmação,
   * undo, persistência por usuário e toast detalhado.
   */
  clearFilters: () => void;
}

const defaultFilters: Filters = {
  search: '',
  status: [],
  dateRange: { start: null, end: null },
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const STORAGE_KEY = 'managed-filters:legacy-store';

export const useFilterStore = create<FilterStore>((set, get) => ({
  ...defaultFilters,
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setDateRange: (dateRange) => set({ dateRange }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  clearFilters: () => {
    const prev = get();
    const snapshot: Filters = {
      search: prev.search,
      status: prev.status,
      dateRange: prev.dateRange,
      sortBy: prev.sortBy,
      sortOrder: prev.sortOrder,
    };
    const previousLocal = localStorage.getItem(STORAGE_KEY);
    set(defaultFilters);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }

    const cleared: string[] = [];
    if (snapshot.search) cleared.push('busca');
    if (snapshot.status.length) cleared.push('status');
    if (snapshot.dateRange.start || snapshot.dateRange.end) cleared.push('período');

    toast.success('Filtros limpos', {
      description: `Removido: ${cleared.join(', ') || 'nenhum'} • localStorage: ${STORAGE_KEY}`,
      duration: 10000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          set(snapshot);
          if (previousLocal) {
            try {
              localStorage.setItem(STORAGE_KEY, previousLocal);
            } catch {
              /* ignore */
            }
          }
          toast.success('Filtros restaurados');
        },
      },
    });
  },
}));

export default useFilterStore;
