import React from 'react';
import { cn } from '@/lib/utils';
import { Grid, List } from 'lucide-react';

interface ViewToggleProps { view: 'grid' | 'list'; onViewChange: (view: 'grid' | 'list') => void; className?: string; }

export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex rounded-lg border p-1', className)}>
      <button onClick={() => onViewChange('grid')} className={cn('p-2 rounded', view === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
        <Grid className="h-4 w-4" />
      </button>
      <button onClick={() => onViewChange('list')} className={cn('p-2 rounded', view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

export default ViewToggle;
