import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Filter, X, Eye, AlertTriangle } from 'lucide-react';

export type TypeFilter = 'all' | 'analysis' | 'alert';
export type SeverityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';

interface AnalysisHistoryFiltersProps {
  typeFilter: TypeFilter;
  severityFilter: SeverityFilter;
  onTypeChange: (v: TypeFilter) => void;
  onSeverityChange: (v: SeverityFilter) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function AnalysisHistoryFilters({
  typeFilter,
  severityFilter,
  onTypeChange,
  onSeverityChange,
  onClear,
  hasActiveFilters,
}: AnalysisHistoryFiltersProps) {
  return (
    <div className="px-4 py-3 border-b space-y-2.5 shrink-0">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filtros
        </span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClear}
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-[11px] text-muted-foreground">Tipo</span>
        <ToggleGroup
          type="single"
          value={typeFilter}
          onValueChange={(v) => v && onTypeChange(v as TypeFilter)}
          className="justify-start gap-1"
        >
          <ToggleGroupItem value="all" size="sm" className="h-7 px-2.5 text-xs rounded-full">
            Todos
          </ToggleGroupItem>
          <ToggleGroupItem value="analysis" size="sm" className="h-7 px-2.5 text-xs rounded-full">
            <Eye className="h-3 w-3 mr-1" />
            Análises
          </ToggleGroupItem>
          <ToggleGroupItem value="alert" size="sm" className="h-7 px-2.5 text-xs rounded-full">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Alertas
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-1">
        <span className="text-[11px] text-muted-foreground">Severidade</span>
        <ToggleGroup
          type="single"
          value={severityFilter}
          onValueChange={(v) => v && onSeverityChange(v as SeverityFilter)}
          className="justify-start gap-1"
        >
          <ToggleGroupItem value="all" size="sm" className="h-7 px-2.5 text-xs rounded-full">
            Todas
          </ToggleGroupItem>
          <ToggleGroupItem value="low" size="sm" className="h-7 px-2.5 text-xs rounded-full">
            Low
          </ToggleGroupItem>
          <ToggleGroupItem value="medium" size="sm" className="h-7 px-2.5 text-xs rounded-full">
            Medium
          </ToggleGroupItem>
          <ToggleGroupItem value="high" size="sm" className="h-7 px-2.5 text-xs rounded-full">
            High
          </ToggleGroupItem>
          <ToggleGroupItem value="critical" size="sm" className="h-7 px-2.5 text-xs rounded-full">
            Critical
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
