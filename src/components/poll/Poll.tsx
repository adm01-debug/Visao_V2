import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Option { id: string; text: string; votes: number; }
interface PollProps { question: string; options: Option[]; onVote?: (optionId: string) => void; voted?: string; className?: string; }

export function Poll({ question, options, onVote, voted, className }: PollProps) {
  const [selected, setSelected] = useState<string | null>(voted || null);
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
  const hasVoted = !!selected;

  const handleVote = () => { if (selected && !voted) onVote?.(selected); };

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <h3 className="font-medium mb-4">{question}</h3>
      <div className="space-y-2">
        {options.map(opt => {
          const pct = totalVotes ? Math.round((opt.votes / totalVotes) * 100) : 0;
          return (
            <div key={opt.id} onClick={() => !hasVoted && setSelected(opt.id)}
              className={cn('relative p-3 rounded border cursor-pointer', selected === opt.id ? 'border-primary' : '', hasVoted && 'cursor-default')}>
              {hasVoted && <div className="absolute inset-0 bg-primary/10 rounded" style={{width: pct+'%'}} />}
              <div className="relative flex items-center justify-between">
                <span>{opt.text}</span>
                <span className="text-sm text-muted-foreground">{hasVoted ? pct+'%' : ''}</span>
              </div>
              {selected === opt.id && hasVoted && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />}
            </div>
          );
        })}
      </div>
      {!hasVoted && <Button className="mt-4 w-full" onClick={handleVote} disabled={!selected}>Votar</Button>}
      <p className="text-xs text-muted-foreground mt-2">{totalVotes} voto{totalVotes !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default Poll;
