import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Save, RotateCcw, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWidgetDashboard } from '@/hooks/useWidgetDashboard';
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer';
import { WidgetCatalog } from '@/components/widgets/WidgetCatalog';
import { WIDGET_CATALOG } from '@/types/widgets';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function CustomizableDashboard() {
  const {
    layout,
    isEditing,
    setIsEditing,
    addWidget,
    removeWidget,
    updateWidget,
    reorderWidgets,
    resetLayout,
  } = useWidgetDashboard();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      reorderWidgets(active.id as string, over.id as string);
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      toast.success('Layout salvo com sucesso!');
    }
    setIsEditing(!isEditing);
  };

  const handleReset = () => {
    if (confirm('Tem certeza que deseja restaurar o layout padrão?')) {
      resetLayout();
      toast.info('Layout restaurado');
    }
  };

  const handleResize = (widgetId: string, size: { cols: number; rows: number }) => {
    updateWidget(widgetId, { size });
  };

  const activeWidgetIds = layout.widgets.map(w => w.widgetId);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card/50">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          {isEditing && (
            <Badge variant="secondary" className="animate-pulse">
              <Edit2 className="h-3 w-3 mr-1" />
              Modo de Edição
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <>
              <WidgetCatalog 
                onAddWidget={addWidget}
                activeWidgetIds={activeWidgetIds}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar
              </Button>
            </>
          )}
          
          <Button
            variant={isEditing ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleEdit}
            className="gap-2"
          >
            {isEditing ? (
              <>
                <Save className="h-4 w-4" />
                Salvar
              </>
            ) : (
              <>
                <Palette className="h-4 w-4" />
                Personalizar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Widget Grid */}
      <div className="flex-1 overflow-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={layout.widgets.map(w => w.id)}
            strategy={rectSortingStrategy}
          >
            <div 
              className={cn(
                'grid gap-4 auto-rows-[minmax(180px,1fr)]',
                `grid-cols-1 md:grid-cols-2 lg:grid-cols-${layout.columns}`,
              )}
              style={{
                gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
              }}
            >
              <AnimatePresence>
                {layout.widgets.map((widget) => (
                  <WidgetRenderer
                    key={widget.id}
                    widget={widget}
                    isEditing={isEditing}
                    onRemove={removeWidget}
                    onResize={handleResize}
                  />
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>

        {/* Empty state */}
        {layout.widgets.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <Palette className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Dashboard Vazio</h3>
            <p className="text-muted-foreground mb-4">
              Adicione widgets para personalizar seu dashboard
            </p>
            <WidgetCatalog 
              onAddWidget={addWidget}
              activeWidgetIds={[]}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default CustomizableDashboard;
