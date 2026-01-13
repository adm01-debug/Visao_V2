import React from 'react';
import { cn } from '@/lib/utils';
import { Medal, Trophy, Award } from 'lucide-react';

interface AchievementBadgeProps { title: string; description?: string; icon?: React.ReactNode; unlocked?: boolean; rarity?: 'common' | 'rare' | 'epic' | 'legendary'; className?: string; }

const rarityColors = { common: 'border-gray-300 bg-gray-50', rare: 'border-blue-400 bg-blue-50', epic: 'border-purple-400 bg-purple-50', legendary: 'border-yellow-400 bg-yellow-50' };
const rarityIcons = { common: Medal, rare: Award, epic: Trophy, legendary: Trophy };

export function AchievementBadge({ title, description, icon, unlocked = true, rarity = 'common', className }: AchievementBadgeProps) {
  const Icon = rarityIcons[rarity];
  return (
    <div className={cn('p-4 rounded-xl border-2 text-center transition-all', rarityColors[rarity], !unlocked && 'opacity-40 grayscale', className)}>
      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white flex items-center justify-center">{icon || <Icon className="h-8 w-8" />}</div>
      <h4 className="font-bold">{title}</h4>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-white capitalize">{rarity}</span>
    </div>
  );
}

export default AchievementBadge;
