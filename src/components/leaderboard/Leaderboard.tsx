import React from 'react';
import { cn } from '@/lib/utils';
import { Trophy, Medal } from 'lucide-react';

interface Player { id: string; name: string; score: number; avatar?: string; }
interface LeaderboardProps { players: Player[]; title?: string; className?: string; }

export function Leaderboard({ players, title = 'Ranking', className }: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="p-4 border-b flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" /><h3 className="font-semibold">{title}</h3></div>
      <div className="divide-y">
        {sorted.map((p, i) => (
          <div key={p.id} className={cn('flex items-center gap-3 p-3', i < 3 && 'bg-yellow-50/50')}>
            <span className="w-8 text-center font-bold">{i < 3 ? medals[i] : i + 1}</span>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-medium">{p.name[0]}</span>}
            </div>
            <span className="flex-1 font-medium">{p.name}</span>
            <span className="font-bold">{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Leaderboard;
