import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, Lock, Key, Eye, EyeOff } from 'lucide-react';

interface SecurityScoreProps { score: number; maxScore?: number; factors: { name: string; passed: boolean }[]; className?: string; }

export function SecurityScore({ score, maxScore = 100, factors, className }: SecurityScoreProps) {
  const pct = (score / maxScore) * 100;
  const color = pct >= 80 ? 'text-green-500' : pct >= 50 ? 'text-yellow-500' : 'text-red-500';
  return (
    <div className={cn('p-6 rounded-xl border bg-card', className)}>
      <div className="flex items-center gap-3 mb-4"><Shield className={cn('h-8 w-8', color)} /><div><p className="text-sm text-muted-foreground">Pontuação de Segurança</p><p className={cn('text-3xl font-bold', color)}>{score}/{maxScore}</p></div></div>
      <div className="space-y-2">
        {factors.map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">{f.passed ? <Lock className="h-4 w-4 text-green-500" /> : <Key className="h-4 w-4 text-red-500" />}<span className={f.passed ? 'text-muted-foreground' : 'text-red-600'}>{f.name}</span></div>
        ))}
      </div>
    </div>
  );
}

export default SecurityScore;
