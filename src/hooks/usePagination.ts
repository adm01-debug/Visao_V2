import { useState, useMemo, useCallback } from 'react';

interface UsePaginationOptions {
  totalItems: number;
  initialPage?: number;
  itemsPerPage?: number;
}

export function usePagination({ totalItems, initialPage = 1, itemsPerPage = 10 }: UsePaginationOptions) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(itemsPerPage);

  const totalPages = useMemo(() => Math.ceil(totalItems / perPage), [totalItems, perPage]);
  const startIndex = useMemo(() => (currentPage - 1) * perPage, [currentPage, perPage]);
  const endIndex = useMemo(() => Math.min(startIndex + perPage, totalItems), [startIndex, perPage, totalItems]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);
  const firstPage = useCallback(() => goToPage(1), [goToPage]);
  const lastPage = useCallback(() => goToPage(totalPages), [totalPages, goToPage]);

  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  return { currentPage, totalPages, perPage, startIndex, endIndex, goToPage, nextPage, prevPage, firstPage, lastPage, hasNext, hasPrev, setPerPage };
}

export default usePagination;
