import React from 'react';
import { cn } from '@/lib/utils';
import { Lightbulb, X } from 'lucide-react';

interface TipBannerProps { title: string; description: string; onDismiss?: () => void; variant?: 'info' | 'tip' | 'warning'; className?: string; }

const variants = { info: 'bg-blue-50 border-blue-200', tip: 'bg-green-50 border-green-200', warning: 'bg-yellow-50 border-yellow-200' };

export function TipBanner({ title, description, onDismiss, variant = 'tip', className }: TipBannerProps) {
  return (
    <div className={cn('relative p-4 rounded-lg border', variants[variant], className)}>
      <div className="flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
        <div><h4 className="font-medium">{title}</h4><p className="text-sm text-muted-foreground mt-1">{description}</p></div>
      </div>
      {onDismiss && <button onClick={onDismiss} className="absolute top-3 right-3 p-1 hover:bg-black/10 rounded"><X className="h-4 w-4" /></button>}
    </div>
  );
}

export default TipBanner;
