import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerOverlayProps {
  visible: boolean;
  message?: string;
  blur?: boolean;
  className?: string;
}

export function SpinnerOverlay({ visible, message, blur = true, className }: SpinnerOverlayProps) {
  if (!visible) return null;

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center', blur ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/70', className)}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 text-white animate-spin" />
        {message && <p className="text-white text-sm">{message}</p>}
      </div>
    </div>
  );
}

export default SpinnerOverlay;
