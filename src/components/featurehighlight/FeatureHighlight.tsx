import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureHighlightProps {
  title: string;
  description: string;
  badge?: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  className?: string;
}

export function FeatureHighlight({ title, description, badge = 'Novo', action, onDismiss, className }: FeatureHighlightProps) {
  return (
    <div className={cn('p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20', className)}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-primary/10"><Sparkles className="h-5 w-5 text-primary" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{title}</h4>
            {badge && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">{badge}</span>}
          </div>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          {action && <Button size="sm" onClick={action.onClick}>{action.label}</Button>}
        </div>
        {onDismiss && <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
      </div>
    </div>
  );
}

export default FeatureHighlight;
