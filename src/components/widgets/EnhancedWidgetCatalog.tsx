import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, Search, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { WIDGET_CATALOG, type WidgetConfig, type WidgetType } from '@/types/widgets';

interface EnhancedWidgetCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (type: WidgetType) => void;
  activeWidgets: WidgetType[];
}

export function EnhancedWidgetCatalog({
  isOpen,
  onClose,
  onAddWidget,
  activeWidgets,
}: EnhancedWidgetCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group widgets by category
  const categories = useMemo(() => {
    const cats: Record<string, WidgetConfig[]> = {};
    WIDGET_CATALOG.forEach(widget => {
      const category = getCategoryFromType(widget.type);
      if (!cats[category]) cats[category] = [];
      cats[category].push(widget);
    });
    return cats;
  }, []);

  // Filter widgets
  const filteredWidgets = useMemo(() => {
    let widgets = WIDGET_CATALOG;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      widgets = widgets.filter(w => 
        w.title.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory) {
      widgets = widgets.filter(w => 
        getCategoryFromType(w.type) === selectedCategory
      );
    }
    
    return widgets;
  }, [searchQuery, selectedCategory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:max-w-2xl max-h-[80vh] bg-background rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold">Adicionar Widget</h2>
                <p className="text-sm text-muted-foreground">
                  Escolha widgets para personalizar seu dashboard
                </p>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Search & Filters */}
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar widgets..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                <CategoryPill
                  label="Todos"
                  isActive={selectedCategory === null}
                  onClick={() => setSelectedCategory(null)}
                />
                {Object.keys(categories).map(category => (
                  <CategoryPill
                    key={category}
                    label={category}
                    isActive={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                  />
                ))}
              </div>
            </div>

            {/* Widget Grid */}
            <div className="p-4 overflow-auto max-h-[50vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredWidgets.map(widget => {
                  const isActive = activeWidgets.includes(widget.type);
                  const Icon = widget.icon;

                  return (
                    <motion.button
                      key={widget.type}
                      onClick={() => !isActive && onAddWidget(widget.type)}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-xl border text-left',
                        'transition-all duration-200',
                        isActive
                          ? 'bg-primary/10 border-primary/50 cursor-default'
                          : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                      )}
                      whileHover={!isActive ? { scale: 1.02 } : undefined}
                      whileTap={!isActive ? { scale: 0.98 } : undefined}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        isActive ? 'bg-primary/20' : 'bg-muted'
                      )}>
                        <Icon className={cn(
                          'w-5 h-5',
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        )} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={cn(
                            'font-medium text-sm',
                            isActive && 'text-primary'
                          )}>
                            {widget.title}
                          </h3>
                          {isActive && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        {widget.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {widget.description}
                          </p>
                        )}
                      </div>

                      {!isActive && (
                        <Plus className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {filteredWidgets.length === 0 && (
                <div className="py-12 text-center">
                  <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum widget encontrado para "{searchQuery}"
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// CATEGORY PILL
// ============================================

interface CategoryPillProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function CategoryPill({ label, isActive, onClick }: CategoryPillProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {label}
    </motion.button>
  );
}

// ============================================
// HELPERS
// ============================================

function getCategoryFromType(type: WidgetType): string {
  const categoryMap: Record<string, string> = {
    'stats-overview': 'Estatísticas',
    'cameras-grid': 'Câmeras',
    'alerts-list': 'Alertas',
    'activity-feed': 'Atividade',
    'quick-actions': 'Ações',
    'people-count': 'Pessoas',
    'system-health': 'Sistema',
    'alerts-chart': 'Gráficos',
    'camera-map': 'Mapas',
  };
  return categoryMap[type] || 'Outros';
}
