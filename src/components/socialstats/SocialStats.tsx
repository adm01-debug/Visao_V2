import React from 'react';
import { cn } from '@/lib/utils';
import { Heart, Star, Eye, Share2 } from 'lucide-react';

interface SocialStatsProps { likes?: number; stars?: number; views?: number; shares?: number; compact?: boolean; className?: string; }

const formatNumber = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toString();

export function SocialStats({ likes, stars, views, shares, compact, className }: SocialStatsProps) {
  return (
    <div className={cn('flex items-center gap-4 text-muted-foreground', compact && 'gap-2 text-sm', className)}>
      {likes !== undefined && <span className="flex items-center gap-1"><Heart className={cn('text-red-500', compact ? 'h-3 w-3' : 'h-4 w-4')} />{formatNumber(likes)}</span>}
      {stars !== undefined && <span className="flex items-center gap-1"><Star className={cn('text-yellow-500', compact ? 'h-3 w-3' : 'h-4 w-4')} />{formatNumber(stars)}</span>}
      {views !== undefined && <span className="flex items-center gap-1"><Eye className={compact ? 'h-3 w-3' : 'h-4 w-4'} />{formatNumber(views)}</span>}
      {shares !== undefined && <span className="flex items-center gap-1"><Share2 className={compact ? 'h-3 w-3' : 'h-4 w-4'} />{formatNumber(shares)}</span>}
    </div>
  );
}

export default SocialStats;
