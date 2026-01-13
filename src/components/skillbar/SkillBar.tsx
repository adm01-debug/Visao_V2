import React from 'react';
import { cn } from '@/lib/utils';

interface SkillBarProps { skills: { name: string; level: number; color?: string }[]; maxLevel?: number; showPercentage?: boolean; className?: string; }

export function SkillBar({ skills, maxLevel = 100, showPercentage = true, className }: SkillBarProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {skills.map((skill, i) => (
        <div key={i}>
          <div className="flex justify-between mb-1"><span className="text-sm font-medium">{skill.name}</span>{showPercentage && <span className="text-sm text-muted-foreground">{skill.level}%</span>}</div>
          <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${(skill.level / maxLevel) * 100}%`, backgroundColor: skill.color || '#3b82f6' }} /></div>
        </div>
      ))}
    </div>
  );
}

export default SkillBar;
