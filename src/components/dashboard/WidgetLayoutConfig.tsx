/**
 * VISÃO - Widget Layout Configurator
 * Permite ao usuário personalizar quais widgets aparecem no dashboard
 */
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LayoutGrid, RotateCcw, GripVertical } from 'lucide-react';
import type { WidgetConfig } from '@/hooks/useDashboardLayout';

interface WidgetLayoutConfigProps {
  widgets: WidgetConfig[];
  toggleWidget: (id: string) => void;
  reorderWidgets: (from: number, to: number) => void;
  resetLayout: () => void;
}

export function WidgetLayoutConfig({ widgets, toggleWidget, reorderWidgets, resetLayout }: WidgetLayoutConfigProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <LayoutGrid className="h-4 w-4 mr-2" />Personalizar
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Personalizar Dashboard</SheetTitle>
          <SheetDescription>Escolha quais widgets exibir e arraste para reordenar</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {widgets.map((widget, index) => (
            <div key={widget.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <div>
                  <Label className="text-sm font-medium">{widget.label}</Label>
                  <p className="text-[10px] text-muted-foreground">Tamanho: {widget.size}</p>
                </div>
              </div>
              <Switch checked={widget.visible} onCheckedChange={() => toggleWidget(widget.id)} />
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Button variant="outline" size="sm" className="w-full" onClick={resetLayout}>
            <RotateCcw className="h-3.5 w-3.5 mr-2" />Restaurar Padrão
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
