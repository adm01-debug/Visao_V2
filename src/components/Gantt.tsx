/**
 * Gantt Chart Component
 * Timeline visualization for project management
 */

import React, { useMemo, useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { format, differenceInDays, addDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress?: number;
  dependencies?: string[];
  color?: string;
  group?: string;
  assignee?: string;
  isCollapsed?: boolean;
  children?: GanttTask[];
}

export interface GanttProps {
  tasks: GanttTask[];
  startDate?: Date;
  endDate?: Date;
  onTaskClick?: (task: GanttTask) => void;
  onTaskDoubleClick?: (task: GanttTask) => void;
  onTaskDrag?: (task: GanttTask, newStart: Date, newEnd: Date) => void;
  onTaskResize?: (task: GanttTask, newEnd: Date) => void;
  viewMode?: 'day' | 'week' | 'month';
  showProgress?: boolean;
  showDependencies?: boolean;
  showToday?: boolean;
  className?: string;
  rowHeight?: number;
  columnWidth?: number;
  locale?: Locale;
}

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
];

export const Gantt: React.FC<GanttProps> = ({
  tasks,
  startDate: propStartDate,
  endDate: propEndDate,
  onTaskClick,
  onTaskDoubleClick,
  onTaskDrag,
  onTaskResize,
  viewMode = 'day',
  showProgress = true,
  showDependencies = true,
  showToday = true,
  className,
  rowHeight = 40,
  columnWidth = 40,
  locale = ptBR,
}) => {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Calculate date range
  const { startDate, endDate, totalDays, dateHeaders } = useMemo(() => {
    const allDates = tasks.flatMap(t => [t.start, t.end]);
    const minDate = propStartDate || new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = propEndDate || new Date(Math.max(...allDates.map(d => d.getTime())));
    
    const start = startOfDay(addDays(minDate, -2));
    const end = endOfDay(addDays(maxDate, 2));
    const days = differenceInDays(end, start) + 1;

    // Generate headers
    const headers: { date: Date; label: string; isWeekend: boolean }[] = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(start, i);
      const dayOfWeek = date.getDay();
      headers.push({
        date,
        label: format(date, viewMode === 'day' ? 'd' : viewMode === 'week' ? 'EEE' : 'MMM', { locale }),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    return { startDate: start, endDate: end, totalDays: days, dateHeaders: headers };
  }, [tasks, propStartDate, propEndDate, viewMode, locale]);

  // Calculate task positions
  const taskPositions = useMemo(() => {
    return tasks.map((task, index) => {
      const taskStart = differenceInDays(task.start, startDate);
      const taskDuration = differenceInDays(task.end, task.start) + 1;
      const color = task.color || COLORS[index % COLORS.length];

      return {
        ...task,
        left: taskStart * columnWidth,
        width: taskDuration * columnWidth,
        top: index * rowHeight,
        color,
      };
    });
  }, [tasks, startDate, columnWidth, rowHeight]);

  // Today indicator position
  const todayPosition = useMemo(() => {
    const today = startOfDay(new Date());
    const daysFromStart = differenceInDays(today, startDate);
    if (daysFromStart >= 0 && daysFromStart <= totalDays) {
      return daysFromStart * columnWidth + columnWidth / 2;
    }
    return null;
  }, [startDate, totalDays, columnWidth]);

  const handleTaskClick = useCallback((task: GanttTask) => {
    setSelectedTask(task.id);
    onTaskClick?.(task);
  }, [onTaskClick]);

  const handleTaskDoubleClick = useCallback((task: GanttTask) => {
    onTaskDoubleClick?.(task);
  }, [onTaskDoubleClick]);

  return (
    <div className={cn('gantt-chart overflow-auto border rounded-lg', className)}>
      {/* Header */}
      <div className="flex sticky top-0 z-10 bg-background border-b">
        {/* Task names column */}
        <div className="w-64 flex-shrink-0 border-r bg-muted/30 p-2 font-medium">
          Tarefa
        </div>
        
        {/* Timeline header */}
        <div className="flex">
          {dateHeaders.map((header, index) => (
            <div
              key={index}
              className={cn(
                'flex-shrink-0 text-center text-xs p-1 border-r',
                header.isWeekend && 'bg-muted/50'
              )}
              style={{ width: columnWidth }}
            >
              {header.label}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex">
        {/* Task names */}
        <div className="w-64 flex-shrink-0 border-r">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={cn(
                'flex items-center px-2 border-b cursor-pointer transition-colors',
                'hover:bg-accent/50',
                selectedTask === task.id && 'bg-accent'
              )}
              style={{ height: rowHeight }}
              onClick={() => handleTaskClick(task)}
            >
              <span className="truncate text-sm">{task.name}</span>
              {task.assignee && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {task.assignee}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative" style={{ width: totalDays * columnWidth }}>
          {/* Grid lines */}
          <div className="absolute inset-0 flex">
            {dateHeaders.map((header, index) => (
              <div
                key={index}
                className={cn(
                  'flex-shrink-0 border-r',
                  header.isWeekend && 'bg-muted/30'
                )}
                style={{ width: columnWidth, height: tasks.length * rowHeight }}
              />
            ))}
          </div>

          {/* Today indicator */}
          {showToday && todayPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
              style={{ left: todayPosition }}
            >
              <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rounded-full" />
            </div>
          )}

          {/* Task bars */}
          {taskPositions.map((task) => (
            <div
              key={task.id}
              className={cn(
                'absolute rounded cursor-pointer transition-all',
                task.color,
                hoveredTask === task.id && 'ring-2 ring-offset-1 ring-primary',
                selectedTask === task.id && 'ring-2 ring-offset-1 ring-primary'
              )}
              style={{
                left: task.left,
                top: task.top + 4,
                width: task.width - 4,
                height: rowHeight - 8,
              }}
              onClick={() => handleTaskClick(task)}
              onDoubleClick={() => handleTaskDoubleClick(task)}
              onMouseEnter={() => setHoveredTask(task.id)}
              onMouseLeave={() => setHoveredTask(null)}
            >
              {/* Progress bar */}
              {showProgress && task.progress !== undefined && (
                <div
                  className="absolute inset-y-0 left-0 bg-black/20 rounded-l"
                  style={{ width: `${task.progress}%` }}
                />
              )}
              
              {/* Task label */}
              <div className="absolute inset-0 flex items-center px-2 text-white text-xs font-medium truncate">
                {task.name}
                {task.progress !== undefined && (
                  <span className="ml-auto opacity-75">{task.progress}%</span>
                )}
              </div>
            </div>
          ))}

          {/* Row separators */}
          {tasks.map((_, index) => (
            <div
              key={index}
              className="absolute left-0 right-0 border-b"
              style={{ top: (index + 1) * rowHeight }}
            />
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredTask && (
        <div className="fixed z-50 p-2 bg-popover text-popover-foreground rounded-lg shadow-lg text-sm pointer-events-none">
          {(() => {
            const task = tasks.find(t => t.id === hoveredTask);
            if (!task) return null;
            return (
              <>
                <div className="font-medium">{task.name}</div>
                <div className="text-xs text-muted-foreground">
                  {format(task.start, 'dd/MM/yyyy', { locale })} - {format(task.end, 'dd/MM/yyyy', { locale })}
                </div>
                {task.progress !== undefined && (
                  <div className="text-xs">Progresso: {task.progress}%</div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Gantt;
