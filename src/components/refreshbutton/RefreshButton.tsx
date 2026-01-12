import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  lastUpdated?: Date;
  className?: string;
}

export function RefreshButton({ onRefresh, lastUpdated, className }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try { await onRefresh(); } finally { setLoading(false); }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {lastUpdated && <span className="text-xs text-muted-foreground">Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}</span>}
      <Button variant="ghost" size="sm" onClick={handleClick} disabled={loading}>
        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
      </Button>
    </div>
  );
}

export default RefreshButton;
