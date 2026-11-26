import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SegmentedControlOption {
  value: string;
  label: React.ReactNode;
  /** Nome acessível quando o rótulo visível é só um ícone. */
  ariaLabel?: string;
}

interface SegmentedControlProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SegmentedControlOption[];
  /** Descreve o grupo para leitores de tela, ex.: "Visualização do dashboard". */
  label: string;
  className?: string;
  listClassName?: string;
}

/**
 * Grupo de botões mutuamente exclusivos com aria-pressed.
 *
 * Substitui o padrão Tabs usado apenas como seletor de visualização: sem
 * TabsContent correspondente o Radix gera value órfão (aria-valid-attr-value) e
 * os gatilhos só-ícone ficam sem nome acessível.
 */
export function SegmentedControl({
  value,
  onValueChange,
  options,
  label,
  className,
  listClassName,
}: SegmentedControlProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            aria-label={option.ariaLabel}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
              listClassName
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
