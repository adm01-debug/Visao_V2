import { useState } from 'react';
import { Filter, X, Calendar, AlertTriangle, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format, startOfDay, endOfDay, subDays, subHours, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type AlertType = 'security' | 'safety' | 'operations' | 'access' | 'analytics' | 'all';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical' | 'all';
export type DateRange = 'all' | '1h' | '24h' | '7d' | '30d' | 'custom';

export interface AlertFilters {
  type: AlertType;
  severity: AlertSeverity;
  dateRange: DateRange;
  customDateStart?: Date;
  customDateEnd?: Date;
}

interface AlertFiltersProps {
  filters: AlertFilters;
  onFiltersChange: (filters: AlertFilters) => void;
}

const TYPE_LABELS: Record<AlertType, string> = {
  all: 'Todos os tipos',
  security: 'Segurança',
  safety: 'EPI',
  operations: 'Operações',
  access: 'Acesso',
  analytics: 'Analytics',
};

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  all: 'Todas',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: 'Todo o período',
  '1h': 'Última hora',
  '24h': 'Últimas 24h',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  custom: 'Personalizado',
};

export function AlertFiltersComponent({ filters, onFiltersChange }: AlertFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const activeFiltersCount = [
    filters.type !== 'all',
    filters.severity !== 'all',
    filters.dateRange !== 'all',
  ].filter(Boolean).length;

  const handleReset = () => {
    onFiltersChange({
      type: 'all',
      severity: 'all',
      dateRange: 'all',
      customDateStart: undefined,
      customDateEnd: undefined,
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
            <Select
              value={filters.severity}
              onValueChange={(value: AlertSeverity) => onFiltersChange({ ...filters, severity: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                      onSelect={(date) => {
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

// Utility function to filter alerts
export function filterAlerts<T extends { type: string; severity: string; timestamp: string | Date }>(
  alerts: T[],
  filters: AlertFilters
): T[] {
  return alerts.filter(alert => {
    // Type filter
    if (filters.type !== 'all' && alert.type !== filters.type) {
      return false;
    }

    // Severity filter
    if (filters.severity !== 'all' && alert.severity !== filters.severity) {
      return false;
    }

    // Date filter
    if (filters.dateRange !== 'all') {
      const alertDate = new Date(alert.timestamp);
      const now = new Date();

      switch (filters.dateRange) {
        case '1h':
          if (alertDate < subHours(now, 1)) return false;
          break;
        case '24h':
          if (alertDate < subHours(now, 24)) return false;
          break;
        case '7d':
          if (alertDate < subDays(now, 7)) return false;
          break;
        case '30d':
          if (alertDate < subDays(now, 30)) return false;
          break;
        case 'custom':
          if (filters.customDateStart && filters.customDateEnd) {
            if (!isWithinInterval(alertDate, {
              start: startOfDay(filters.customDateStart),
              end: endOfDay(filters.customDateEnd),
            })) {
              return false;
            }
          }
          break;
      }
    }

    return true;
  });
}

export const defaultFilters: AlertFilters = {
  type: 'all',
  severity: 'all',
  dateRange: 'all',
};
