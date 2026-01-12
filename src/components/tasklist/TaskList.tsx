import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Check, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Task { id: string; text: string; completed: boolean; }

interface TaskListProps {
  initialTasks?: Task[];
  onTasksChange?: (tasks: Task[]) => void;
  className?: string;
}

export function TaskList({ initialTasks = [], onTasksChange, className }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTask, setNewTask] = useState('');

  const updateTasks = (newTasks: Task[]) => { setTasks(newTasks); onTasksChange?.(newTasks); };
  const addTask = () => { if (!newTask.trim()) return; updateTasks([...tasks, { id: Date.now().toString(), text: newTask, completed: false }]); setNewTask(''); };
  const toggleTask = (id: string) => updateTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id: string) => updateTasks(tasks.filter(t => t.id !== id));

  const pending = tasks.filter(t => !t.completed).length;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex gap-2">
        <Input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="Nova tarefa..." />
        <Button onClick={addTask}><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className={cn('flex items-center gap-2 p-2 rounded border', task.completed && 'bg-muted/50')}>
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <button onClick={() => toggleTask(task.id)} className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center', task.completed ? 'bg-primary border-primary' : 'border-muted-foreground')}>
              {task.completed && <Check className="h-3 w-3 text-primary-foreground" />}
            </button>
            <span className={cn('flex-1', task.completed && 'line-through text-muted-foreground')}>{task.text}</span>
            <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{pending} tarefa{pending !== 1 ? 's' : ''} pendente{pending !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default TaskList;
