/**
 * Onda 188 — Grade editável do arranjo favorito.
 *
 * Cada célula é uma posição fixa: limpar uma célula deixa buraco, nunca
 * desloca as vizinhas. Vacância sempre exibe o motivo declarado pela regra.
 */
import { memo } from 'react';
import { Camera as CameraIcon, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { MonitorLayout, RestoredCell, VacancyReason } from '@/lib/views/favoriteViewRestore';

export interface GridCameraOption {
  id: string;
  name: string;
}

interface FavoriteArrangementGridProps {
  layout: MonitorLayout;
  cells: readonly RestoredCell[];
  cameras: readonly GridCameraOption[];
  onAssign: (slotIndex: number, cameraId: string | null) => void;
  /** Onda 189 — destaca a câmera da célula numa janela de segundo monitor. */
  onDetach?: (cameraId: string) => void;
}

const VACANCY_TEXT: Record<Exclude<VacancyReason, 'empty'>, string> = {
  camera_removed: 'Câmera indisponível',
  duplicate_camera: 'Câmera repetida',
};

function gridClass(layout: MonitorLayout): string {
  switch (layout) {
    case '1x1':
      return 'grid grid-cols-1 gap-3';
    case '2x2':
      return 'grid grid-cols-1 sm:grid-cols-2 gap-3';
    case '3x3':
      return 'grid grid-cols-2 sm:grid-cols-3 gap-3';
    case '4x4':
      return 'grid grid-cols-2 sm:grid-cols-4 gap-3';
    case '1+5':
      return 'grid grid-cols-2 sm:grid-cols-3 gap-3';
    case '2+8':
      return 'grid grid-cols-2 sm:grid-cols-5 gap-3';
    default:
      return 'grid grid-cols-2 gap-3';
  }
}

function FavoriteArrangementGridImpl({
  layout,
  cells,
  cameras,
  onAssign,
  onDetach,
}: FavoriteArrangementGridProps) {
  const nameById = new Map(cameras.map((c) => [c.id, c.name]));

  return (
    <div className={gridClass(layout)}>
      {cells.map((cell) => {
        const degraded = cell.vacancy !== null && cell.vacancy !== 'empty';
        return (
          <div
            key={cell.slotIndex}
            className={cn(
              'rounded-lg border bg-card p-3 flex flex-col gap-2 min-h-[7rem] transition-colors',
              degraded ? 'border-destructive/50 bg-destructive/5' : 'border-border'
            )}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Posição {cell.slotIndex + 1}</span>
              {cell.cameraId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onAssign(cell.slotIndex, null)}
                  aria-label={`Limpar posição ${cell.slotIndex + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {degraded && (
              <p className="text-xs text-destructive">
                {VACANCY_TEXT[cell.vacancy as Exclude<VacancyReason, 'empty'>]}
              </p>
            )}

            <div className="flex items-center gap-2">
              <CameraIcon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <Select
                value={cell.cameraId ?? '__empty__'}
                onValueChange={(v) => onAssign(cell.slotIndex, v === '__empty__' ? null : v)}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  aria-label={`Câmera da posição ${cell.slotIndex + 1}`}
                >
                  <SelectValue placeholder="Vazia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Vazia</SelectItem>
                  {cameras.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cell.cameraId && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-foreground truncate">
                  {nameById.get(cell.cameraId) ?? cell.cameraId}
                </p>
                {onDetach && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 px-2 text-xs"
                    onClick={() => onDetach(cell.cameraId as string)}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" aria-hidden="true" />
                    Destacar
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const FavoriteArrangementGrid = memo(FavoriteArrangementGridImpl);
