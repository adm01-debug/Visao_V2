/**
 * VISÃO - Enhanced Widget Wrapper
 * Drag & drop sortable widget container
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@/lib/dnd-utilities';
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
  widget, config, isEditing, onRemove, onResize, children,
}: EnhancedWidgetWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const isExpanded = widget.size.cols > 1 || widget.size.rows > 1;

  const handleToggleSize = () => {
    onResize(isExpanded ? { cols: 1, rows: 1 } : { cols: 2, rows: 2 });
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative rounded-xl border bg-card overflow-hidden transition-all duration-200',
        isDragging ? 'z-50 shadow-2xl scale-105 border-primary' : 'shadow-sm',
        isEditing && 'ring-2 ring-primary/20',
        widget.size.cols === 2 && 'md:col-span-2',
        widget.size.rows === 2 && 'md:row-span-2',
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={isEditing ? { scale: 1.02 } : undefined}
    >
      <div className={cn('flex items-center gap-2 px-4 py-3 border-b border-border bg-gradient-to-r from-muted/30 to-transparent')}>
        {isEditing && (
          <motion.button {...attributes} {...listeners} className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-muted" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10"><span className="text-base">{config.icon}</span></div>
          <h3 className="font-semibold text-sm truncate">{config.title}</h3>
        </div>
        {isEditing && (
          <div className="flex items-center gap-1">
            <motion.button onClick={handleToggleSize} className="p-1.5 rounded-lg hover:bg-muted transition-colors" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title={isExpanded ? 'Reduzir' : 'Expandir'}>
              {isExpanded ? <Minimize2 className="w-4 h-4 text-muted-foreground" /> : <Maximize2 className="w-4 h-4 text-muted-foreground" />}
            </motion.button>
            <motion.button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Remover">
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </div>
      <div className={cn('p-4', widget.size.rows === 2 ? 'min-h-[300px]' : 'min-h-[150px]')}>{children}</div>
      {isEditing && (
        <motion.div className="absolute inset-0 bg-primary/5 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-xl" />
        </motion.div>
      )}
    </motion.div>
  );
}
