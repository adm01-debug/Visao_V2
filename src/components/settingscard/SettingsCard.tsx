import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function SettingsCard({ icon, title, description, onClick, action, className }: SettingsCardProps) {
  return (
    <div onClick={onClick} className={cn('flex items-center gap-4 p-4 rounded-lg border bg-card', onClick && 'cursor-pointer hover:bg-accent/50', className)}>
      <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action || (onClick && <ChevronRight className="h-5 w-5 text-muted-foreground" />)}
    </div>
  );
}

export default SettingsCard;
