import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { WIDGET_CATALOG, type WidgetConfig } from '@/types/widgets';
import { cn } from '@/lib/utils';

interface WidgetCatalogProps {
  onAddWidget: (widgetId: string) => void;
  activeWidgetIds: string[];
}

export function WidgetCatalog({ onAddWidget, activeWidgetIds }: WidgetCatalogProps) {
  const [open, setOpen] = React.useState(false);

  const handleAdd = (widgetId: string) => {
    onAddWidget(widgetId);
    // Don't close - allow adding multiple
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Widget
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Catálogo de Widgets</SheetTitle>
          <SheetDescription>
            Arraste ou clique para adicionar widgets ao dashboard
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          <div className="grid gap-3 pr-4">
            <AnimatePresence>
              {WIDGET_CATALOG.map((widget, index) => {
                const count = activeWidgetIds.filter(id => id === widget.id).length;
                
                return (
                  <motion.div
                    key={widget.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <WidgetCatalogCard
                      widget={widget}
                      instanceCount={count}
                      onAdd={() => handleAdd(widget.id)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface WidgetCatalogCardProps {
  widget: WidgetConfig;
  instanceCount: number;
  onAdd: () => void;
}

function WidgetCatalogCard({ widget, instanceCount, onAdd }: WidgetCatalogCardProps) {
  return (
    <div className={cn(
      'relative flex items-start gap-3 p-3 rounded-lg border',
      'bg-card hover:bg-accent/50 transition-colors cursor-pointer',
      'group'
    )} onClick={onAdd}>
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
        {widget.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">{widget.title}</h4>
          {instanceCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
              {instanceCount}x
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{widget.description}</p>
        <div className="text-[10px] text-muted-foreground mt-1">
          Tamanho: {widget.defaultSize.cols}x{widget.defaultSize.rows}
        </div>
      </div>

      {/* Add button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
