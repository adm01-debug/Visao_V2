import React from 'react';
import { cn } from '@/lib/utils';
import { FileX } from 'lucide-react';

interface EmptyListProps {
  icon?: React.ReactNode;
  message?: string;
  className?: string;
}

export function EmptyList({ icon, message = 'Nenhum item encontrado', className }: EmptyListProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 text-muted-foreground', className)}>
      {icon || <FileX className="h-10 w-10 mb-2" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default EmptyList;
