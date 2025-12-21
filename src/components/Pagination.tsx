import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange }) => (
  <div className="flex items-center justify-center gap-2">
    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
      <ChevronLeft className="w-4 h-4" />
    </Button>
    <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
      <ChevronRight className="w-4 h-4" />
    </Button>
  </div>
);

export default Pagination;
