import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

interface TaskItemProps { title: string; completed?: boolean; priority?: 'low' | 'medium' | 'high'; dueDate?: Date; onToggle?: () => void; className?: string; }

const priorityColors = { low: 'text-green-500', medium: 'text-yellow-500', high: 'text-red-500' };

export function TaskItem({ title, completed, priority, dueDate, onToggle, className }: TaskItemProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer', className)} onClick={onToggle}>
      {completed ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
      <span className={cn('flex-1', completed && 'line-through text-muted-foreground')}>{title}</span>
      {priority && <AlertCircle className={cn('h-4 w-4', priorityColors[priority])} />}
      {dueDate && <span className="text-xs text-muted-foreground">{dueDate.toLocaleDateString('pt-BR')}</span>}
    </div>
  );
}

export default TaskItem;
