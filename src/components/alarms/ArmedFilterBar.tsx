/**
 * Onda 224 — Barra de filtro por estado de armamento.
 *
 * Botões (não dropdown): o operador precisa ver o número de cada balde sem
 * abrir nada. Padrão de filtros visuais do projeto.
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { filterLabel, type ArmedFilter, type RosterCounts } from '@/lib/alarms/armedRoster';

interface ArmedFilterBarProps {
  value: ArmedFilter;
  onChange: (filter: ArmedFilter) => void;
  counts: RosterCounts;
  /** Quantos itens cada filtro exibiria — vem do mesmo roster (R1). */
  sizes: Record<ArmedFilter, number>;
}

const ORDER: ArmedFilter[] = ['all', 'armed', 'attention', 'off'];

const TONE: Record<ArmedFilter, string> = {
  all: 'data-[active=true]:border-primary/50 data-[active=true]:bg-primary/10',
  armed: 'data-[active=true]:border-success/50 data-[active=true]:bg-success/10',
  attention: 'data-[active=true]:border-warning/50 data-[active=true]:bg-warning/10',
  off: 'data-[active=true]:border-border data-[active=true]:bg-muted',
};

export function ArmedFilterBar({ value, onChange, counts, sizes }: ArmedFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado de armamento">
      {ORDER.map((filter) => (
        <Button
          key={filter}
          type="button"
          variant="outline"
          size="sm"
          data-active={value === filter}
          aria-pressed={value === filter}
          onClick={() => onChange(filter)}
          className={cn('gap-2', TONE[filter])}
        >
          {filterLabel(filter)}
          <span className="rounded bg-muted px-1.5 text-xs tabular-nums">{sizes[filter]}</span>
        </Button>
      ))}

      {counts.degraded > 0 && (
        <span className="text-xs text-warning">
          {counts.degraded} armado{counts.degraded > 1 ? 's' : ''} com ressalva (contado como
          vigilância ativa)
        </span>
      )}
      {counts.unknown > 0 && (
        <span className="text-xs text-muted-foreground">
          {counts.unknown} indeterminado{counts.unknown > 1 ? 's' : ''} — relógio inválido
        </span>
      )}
    </div>
  );
}
