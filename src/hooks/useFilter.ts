import { useState, useMemo, useCallback } from 'react';

type FilterValue = string | number | boolean | string[];

export function useFilter<T extends Record<string, unknown>>(items: T[], initialFilters: Record<string, FilterValue> = {}) {
  const [filters, setFilters] = useState<Record<string, FilterValue>>(initialFilters);
  const [sortBy, setSortBy] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilter = useCallback((key: string) => {
    setFilters(prev => { const { [key]: _, ...rest } = prev; return rest; });
  }, []);

  const clearAllFilters = useCallback(() => setFilters({}), []);

  const filteredItems = useMemo(() => {
    let result = [...items];
    Object.entries(filters).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) return;
      result = result.filter(item => {
        const itemValue = item[key];
        if (Array.isArray(value)) return value.includes(String(itemValue));
        if (typeof value === 'string') return String(itemValue).toLowerCase().includes(value.toLowerCase());
        return itemValue === value;
      });
    });
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = a[sortBy], bVal = b[sortBy];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [items, filters, sortBy, sortOrder]);

  return { filters, filteredItems, setFilter, clearFilter, clearAllFilters, sortBy, sortOrder, setSortBy, setSortOrder };
}

export default useFilter;
