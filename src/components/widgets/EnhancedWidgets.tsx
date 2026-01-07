import React from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetInstance, WidgetConfig } from '@/types/widgets';

interface EnhancedWidgetWrapperProps {
  widget: WidgetInstance;
  config: WidgetConfig;
  isEditing: boolean;
  onRemove: () => void;
  onResize: (size: { cols: number; rows: number }) => void;
  children: React.ReactNode;
}

export function EnhancedWidgetWrapper({
  widget,
  config,
  isEditing,
  onRemove,
  onResize,
  children,
}: EnhancedWidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = config.icon;
  const isExpanded = widget.size.cols > 1 || widget.size.rows > 1;

  const handleToggleSize = () => {
    if (isExpanded) {
      onResize({ cols: 1, rows: 1 });
    } else {
      onResize({ cols: 2, rows: 2 });
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative rounded-xl border bg-card overflow-hidden',
        'transition-all duration-200',
        isDragging ? 'z-50 shadow-2xl scale-105 border-primary' : 'shadow-sm',
        isEditing && 'ring-2 ring-primary/20',
        // Grid span based on widget size
        widget.size.cols === 2 && 'md:col-span-2',
        widget.size.rows === 2 && 'md:row-span-2'
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={isEditing ? { scale: 1.02 } : undefined}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-3 border-b border-border',
        'bg-gradient-to-r from-muted/30 to-transparent'
      )}>
        {/* Drag Handle */}
        {isEditing && (
          <motion.button
            {...attributes}
            {...listeners}
            className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-muted"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}

        {/* Icon & Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn(
            'p-1.5 rounded-lg',
            'bg-primary/10'
          )}>
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm truncate">
            {config.title}
          </h3>
        </div>

        {/* Actions */}
        {isEditing && (
          <div className="flex items-center gap-1">
            <motion.button
              onClick={handleToggleSize}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={isExpanded ? 'Reduzir' : 'Expandir'}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Maximize2 className="w-4 h-4 text-muted-foreground" />
              )}
            </motion.button>

            <motion.button
              onClick={onRemove}
              className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Remover"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        'p-4',
        widget.size.rows === 2 ? 'min-h-[300px]' : 'min-h-[150px]'
      )}>
        {children}
      </div>

      {/* Edit Mode Overlay */}
      {isEditing && (
        <motion.div
          className="absolute inset-0 bg-primary/5 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-xl" />
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// WIDGET GRID CONTAINER
// ============================================

interface WidgetGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function WidgetGrid({ children, columns = 3, className }: WidgetGridProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={cn(
      'grid gap-4 auto-rows-min',
      colClasses[columns],
      className
    )}>
      {children}
    </div>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export function StatCard({ 
  label, 
  value, 
  icon, 
  trend, 
  color = 'primary',
  className 
}: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <motion.div
      className={cn(
        'p-4 rounded-xl border border-border bg-card',
        'hover:shadow-md transition-shadow',
        className
      )}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label}
          </p>
          <motion.p 
            className="text-2xl font-bold mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={value}
          >
            {value}
          </motion.p>
          
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-1 text-xs font-medium',
              trend.direction === 'up' ? 'text-success' : 'text-destructive'
            )}>
              <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs ontem</span>
            </div>
          )}
        </div>
        
        <div className={cn(
          'p-2 rounded-lg',
          colorClasses[color]
        )}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// MINI CHART COMPONENT
// ============================================

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export function MiniChart({ data, color = 'hsl(var(--primary))', height = 40, className }: MiniChartProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((max - value) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg 
      className={cn('w-full', className)} 
      height={height} 
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      
      {/* Area */}
      <motion.path
        d={`M0,${height} L${points} L100,${height} Z`}
        fill="url(#chartGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Line */}
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}
