/**
 * Onda 220 — Seletor de itens do catálogo (origens e bibliotecas).
 *
 * Três comportamentos que o campo de texto anterior não tinha:
 *
 *  • enquanto o catálogo é desconhecido (carregando/erro), o seletor **não
 *    esvazia** nada e diz que não sabe (K2);
 *  • um id escolhido que sumiu do catálogo continua visível, marcado como
 *    ausente e removível (K1/K6) — some da lista de opções, nunca do cadastro;
 *  • modo exclusivo para S6, onde "exatamente uma biblioteca" é lei.
 */

import { AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { parseIdList } from '@/lib/alarms/alarmSchemeForm';
import {
  idsToText,
  reconcileSelection,
  selectSingle,
  toggleSelection,
  type CatalogSnapshot,
} from '@/lib/alarms/schemeCatalog';

interface CatalogSelectorProps {
  id: string;
  label: string;
  description?: string;
  snapshot: CatalogSnapshot;
  /** Estado do formulário é texto (Onda 218). */
  value: string;
  onChange: (next: string) => void;
  mode?: 'multi' | 'single';
  emptyLabel?: string;
}

export function CatalogSelector({
  id,
  label,
  description,
  snapshot,
  value,
  onChange,
  mode = 'multi',
  emptyLabel = 'Nenhum item disponível no catálogo.',
}: CatalogSelectorProps) {
  const selected = parseIdList(value);
  const view = reconcileSelection(selected, snapshot);

  const apply = (optionId: string) => {
    const next =
      mode === 'single' ? selectSingle(view.selected, optionId) : toggleSelection(view.selected, optionId);
    onChange(idsToText(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {view.selected.length} selecionado(s)
        </span>
      </div>

      {!view.catalogKnown ? (
        <div className="space-y-2">
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="cam-01, cam-02"
          />
          <p className="text-xs text-muted-foreground">
            Catálogo indisponível no momento — a seleção atual foi preservada e nada foi marcado
            como removido.
          </p>
        </div>
      ) : (
        <ScrollArea className="h-40 rounded-md border border-border">
          <ul id={id} className="divide-y divide-border">
            {snapshot.options.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">{emptyLabel}</li>
            )}
            {snapshot.options.map((option) => {
              const active = view.selected.includes(option.id);
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => apply(option.id)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active && 'bg-primary/10',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border',
                        active && 'border-primary bg-primary text-primary-foreground',
                      )}
                      aria-hidden="true"
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.hint && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {option.hint}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}

      {view.missingIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <span className="text-xs text-foreground">
            Selecionado, mas fora do catálogo (o esquema degrada até você decidir):
          </span>
          {view.missingIds.map((missing) => (
            <Badge key={missing} variant="outline" className="gap-1 border-warning/60">
              {missing}
              <button
                type="button"
                aria-label={`Remover ${missing} da seleção`}
                onClick={() => apply(missing)}
                className="rounded-sm hover:text-destructive"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {mode === 'single' && view.selected.length > 1 && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
          Limpar seleção ambígua
        </Button>
      )}
    </div>
  );
}

export default CatalogSelector;
