import React from 'react';
import { cn } from '@/lib/utils';
import { Globe, Shield, Zap, Clock } from 'lucide-react';

interface FeatureGridItem { icon: React.ReactNode; title: string; description: string; }
interface FeatureGridProps { features: FeatureGridItem[]; columns?: 2 | 3 | 4; className?: string; }

export function FeatureGrid({ features, columns = 3, className }: FeatureGridProps) {
  const gridCols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

  return (
    <div className={cn('grid gap-6', gridCols[columns], className)}>
      {features.map((f, i) => (
        <div key={i} className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">{f.icon}</div>
          <h3 className="font-bold mb-2">{f.title}</h3>
          <p className="text-sm text-muted-foreground">{f.description}</p>
        </div>
      ))}
    </div>
  );
}

export default FeatureGrid;
