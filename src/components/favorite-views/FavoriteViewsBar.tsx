/**
 * Onda 188 — Barra de visualizações favoritas.
 * Acesso rápido a arranjos salvos, ordenados por uso recente.
 */
import { memo } from 'react';
import { Star, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FavoriteView } from '@/hooks/useFavoriteViews';

interface FavoriteViewsBarProps {
  views: readonly FavoriteView[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatLastUsed(iso: string | null): string {
  if (!iso) return 'nunca usada';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'agora';
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

function FavoriteViewsBarImpl({ views, activeId, onSelect, onDelete }: FavoriteViewsBarProps) {
  if (views.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma visualização salva ainda. Monte um arranjo abaixo e salve como favorito.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {views.map((view) => {
        const active = view.id === activeId;
        return (
          <div
            key={view.id}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
              active ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-accent',
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(view.id)}
              className="flex items-center gap-2 text-left"
              aria-pressed={active}
            >
              <Star
                className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')}
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-foreground">{view.name}</span>
              <Badge variant="secondary" className="text-[10px]">
                {view.layout}
              </Badge>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {formatLastUsed(view.lastUsedAt)}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDelete(view.id)}
              aria-label={`Remover visualização ${view.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export const FavoriteViewsBar = memo(FavoriteViewsBarImpl);
