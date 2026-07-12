/**
 * VISÃO - Alert Filters Component
 * Popover com filtros de tipo, severidade, câmera e período
 */
import { useState } from 'react';
import { Filter, X, Calendar, AlertTriangle, Gauge, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Re-export types for backward compatibility
export type { AlertType, AlertSeverity, DateRange, CameraOption, AlertFilters } from './alerts/alertFilterTypes';
export { defaultFilters } from './alerts/alertFilterTypes';
export { filterAlerts } from './alerts/filterAlerts';

import type { AlertType, DateRange, AlertFilters as AlertFiltersType, CameraOption } from './alerts/alertFilterTypes';
import { TYPE_LABELS, DATE_RANGE_LABELS, SEVERITY_BUTTON_OPTIONS } from './alerts/alertFilterTypes';

interface AlertFiltersProps {
  filters: AlertFiltersType;
  onFiltersChange: (filters: AlertFiltersType) => void;
  cameras?: CameraOption[];
}

export function AlertFiltersComponent({ filters, onFiltersChange, cameras = [] }: AlertFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const activeFiltersCount = [
    filters.type !== 'all',
    filters.severity !== 'all',
    filters.dateRange !== 'all',
    filters.cameraId !== 'all',
  ].filter(Boolean).length;

  const handleReset = () => {
    onFiltersChange({
      type: 'all',
      severity: 'all',
      dateRange: 'all',
      customDateStart: undefined,
      customDateEnd: undefined,
      cameraId: 'all',
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Filtros de Alertas</h4>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <Separator />

          {/* Type Filter */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Tipo
            </Label>
            <Select
              value={filters.type}
              onValueChange={(value: AlertType) => onFiltersChange({ ...filters, type: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity Filter */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              Severidade
            </Label>
            <div className="flex gap-1.5 flex-wrap">
              {SEVERITY_BUTTON_OPTIONS.map(({ value, label, icon: SevIcon, activeClass, tooltip }) => {
                const isActive = filters.severity === value;
                return (
                  <Tooltip key={value}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onFiltersChange({ ...filters, severity: value })}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                          isActive
                            ? activeClass
                            : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <SevIcon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-center">
                      <p className="text-xs">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Camera Filter */}
          {cameras.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Camera className="w-3 h-3" />
                Câmera
              </Label>
              <Select
                value={filters.cameraId}
                onValueChange={(value) => onFiltersChange({ ...filters, cameraId: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as câmeras</SelectItem>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.id} value={camera.id}>
                      {camera.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Período
            </Label>
            <Select
              value={filters.dateRange}
              onValueChange={(value: DateRange) => onFiltersChange({ ...filters, dateRange: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
              <div className="space-y-1">
                <Label className="text-xs">Data inicial</Label>
                <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.customDateStart
                        ? format(filters.customDateStart, 'dd/MM/yyyy', { locale: ptBR })
                        : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filters.customDateStart}
                      onSelect={(date: Date | undefined) => {
                        onFiltersChange({ ...filters, customDateStart: date });
                        setShowStartCalendar(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Data final</Label>
                <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.customDateEnd
                        ? format(filters.customDateEnd, 'dd/MM/yyyy', { locale: ptBR })
                        : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filters.customDateEnd}
                      onSelect={(date) => {
                        onFiltersChange({ ...filters, customDateEnd: date });
                        setShowEndCalendar(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
