/**
 * Onda Shinobi 2 — DigitalZoomOverlay
 *
 * Toolbar flutuante que expõe os controles de zoom digital.
 * Renderiza apenas os botões — o transform em si é aplicado pelo consumidor
 * usando `useDigitalZoom().transform` na `<video>` ou `<img>` alvo.
 */
import { memo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { UseDigitalZoomReturn } from '@/hooks/useDigitalZoom';

interface DigitalZoomOverlayProps {
  zoom: UseDigitalZoomReturn;
  className?: string;
}

function DigitalZoomOverlayImpl({ zoom, className }: DigitalZoomOverlayProps) {
  return (
    <div
      className={cn(
        'absolute top-3 right-3 z-20 flex items-center gap-1 rounded-lg bg-foreground/60 backdrop-blur-sm px-2 py-1',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-background hover:bg-background/20"
            onClick={zoom.zoomOut}
            disabled={zoom.scale <= 1.001}
            aria-label="Diminuir zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Diminuir zoom (-)</TooltipContent>
      </Tooltip>

      <span
        className="font-mono text-xs text-background px-1 tabular-nums select-none"
        aria-live="polite"
      >
        {zoom.scale.toFixed(1)}x
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-background hover:bg-background/20"
            onClick={zoom.zoomIn}
            disabled={zoom.scale >= 7.999}
            aria-label="Aumentar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Aumentar zoom (+)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-background hover:bg-background/20"
            onClick={zoom.reset}
            disabled={!zoom.isZoomed}
            aria-label="Resetar zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Resetar (0)</TooltipContent>
      </Tooltip>
    </div>
  );
}

export const DigitalZoomOverlay = memo(DigitalZoomOverlayImpl);
