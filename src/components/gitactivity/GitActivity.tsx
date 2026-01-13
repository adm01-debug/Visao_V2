import React from 'react';
import { cn } from '@/lib/utils';
import { GitBranch, GitCommit, GitPullRequest, GitMerge } from 'lucide-react';

interface GitActivityProps { activities: { type: 'commit' | 'branch' | 'pr' | 'merge'; message: string; author: string; date: Date; }[]; className?: string; }

const icons = { commit: GitCommit, branch: GitBranch, pr: GitPullRequest, merge: GitMerge };
const colors = { commit: 'text-green-500', branch: 'text-blue-500', pr: 'text-purple-500', merge: 'text-orange-500' };

export function GitActivity({ activities, className }: GitActivityProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {activities.map((a, i) => { const Icon = icons[a.type]; return (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
          <Icon className={cn('h-5 w-5 mt-0.5', colors[a.type])} />
          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{a.message}</p><p className="text-xs text-muted-foreground">{a.author} · {a.date.toLocaleString('pt-BR')}</p></div>
        </div>
      ); })}
    </div>
  );
}

export default GitActivity;
