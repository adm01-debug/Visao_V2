import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, X, Maximize2, Minimize2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WidgetInstance, WidgetSize } from '@/types/widgets';

interface WidgetWrapperProps {
  widget: WidgetInstance;
  isEditing: boolean;
  onRemove: () => void;
  onResize?: (size: WidgetSize) => void;
  children: React.ReactNode;
  title: string;
  icon: string;
}

export function WidgetWrapper({
  widget,
  isEditing,
  onRemove,
  onResize,
  children,
  title,
  icon,
}: WidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    disabled: !isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${widget.size.cols}`,
    gridRow: `span ${widget.size.rows}`,
  };

  const isExpanded = widget.size.cols > 1 || widget.size.rows > 1;

  const handleToggleSize = () => {
    if (!onResize) return;
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
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isDragging ? 0.5 : 1, 
        scale: isDragging ? 1.02 : 1,
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'relative rounded-xl border bg-card overflow-hidden',
        'transition-shadow duration-200',
        isDragging && 'shadow-2xl ring-2 ring-primary z-50',
        isEditing && 'ring-1 ring-dashed ring-muted-foreground/30',
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2 border-b bg-muted/30',
        isEditing && 'cursor-grab active:cursor-grabbing',
      )}>
        <div className="flex items-center gap-2">
          {isEditing && (
            <div {...attributes} {...listeners} className="touch-none">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <span className="text-base">{icon}</span>
          <h3 className="font-medium text-sm">{title}</h3>
        </div>

        {isEditing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleToggleSize}
            >
              {isExpanded ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 h-[calc(100%-44px)] overflow-auto">
        {children}
      </div>

      {/* Edit overlay */}
      {isEditing && (
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      )}
    </motion.div>
  );
}
