import React from 'react';
import { cn } from '@/lib/utils';
import { Plus, Bug, Zap, AlertTriangle } from 'lucide-react';

interface ChangelogEntryProps {
  version: string;
  date: Date;
  changes: { type: 'feature' | 'fix' | 'improvement' | 'breaking'; description: string }[];
  className?: string;
}

const icons = { feature: Plus, fix: Bug, improvement: Zap, breaking: AlertTriangle };
const colors = { feature: 'text-green-500', fix: 'text-blue-500', improvement: 'text-purple-500', breaking: 'text-red-500' };
const labels = { feature: 'Novo', fix: 'Correção', improvement: 'Melhoria', breaking: 'Breaking' };

export function ChangelogEntry({ version, date, changes, className }: ChangelogEntryProps) {
  return (
    <div className={cn('p-4 rounded-lg border', className)}>
      <div className="flex items-center gap-3 mb-3">
        <span className="font-bold text-lg">v{version}</span>
        <span className="text-sm text-muted-foreground">{date.toLocaleDateString('pt-BR')}</span>
      </div>
      <ul className="space-y-2">
        {changes.map((change, i) => {
          const Icon = icons[change.type];
          return (
            <li key={i} className="flex items-start gap-2">
              <Icon className={cn('h-4 w-4 mt-0.5', colors[change.type])} />
              <span className="text-sm"><span className="font-medium">[{labels[change.type]}]</span> {change.description}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ChangelogEntry;
