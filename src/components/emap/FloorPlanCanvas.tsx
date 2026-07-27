import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  clusterMarkers,
  fitImage,
  toContainerPixels,
  toNormalizedPoint,
  type FittedImageRect,
  type MapMarkerStatus,
  type MapPlacement,
  type NormalizedPoint,
} from '@/lib/emap/floorPlanGeometry';

export interface FloorPlanCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  placements: MapPlacement[];
  selectedId: string | null;
  onSelect: (placementId: string | null) => void;
  onMove: (placementId: string, position: NormalizedPoint) => void;
  /**
   * Onda 164: câmeras que acabaram de piorar. O halo é redundante com a cor
   * (movimento + cor), porque cor sozinha não alcança quem não a distingue.
   */
  pulsingCameraIds?: ReadonlySet<string>;
  className?: string;
}

/**
 * Cor do marcador por estado. Cada estado também tem forma/rótulo distintos no
 * cartão lateral — cor sozinha não é acessível para daltônicos, e um mapa de
 * situação não pode depender só dela.
 */
const STATUS_CLASS: Record<MapMarkerStatus, string> = {
  alert: 'bg-destructive text-destructive-foreground ring-destructive/40',
  offline: 'bg-muted-foreground text-background ring-muted-foreground/40',
  warning: 'bg-warning text-warning-foreground ring-warning/40',
  online: 'bg-success text-success-foreground ring-success/40',
  unknown: 'bg-secondary text-secondary-foreground ring-secondary/40',
};

const CONE_RADIUS_RATIO = 0.14;

/** Constrói o setor do campo de visão em coordenadas do contêiner. */
function conePath(
  center: { x: number; y: number },
  headingDeg: number,
  fovDeg: number,
  radius: number,
): string | null {
  if (fovDeg <= 0 || radius <= 0) return null;
  if (fovDeg >= 360) return null;

  // 0° = para cima (norte da planta), crescendo no sentido horário.
  const toXY = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: center.x + radius * Math.cos(rad), y: center.y + radius * Math.sin(rad) };
  };
  const start = toXY(headingDeg - fovDeg / 2);
  const end = toXY(headingDeg + fovDeg / 2);
  const largeArc = fovDeg > 180 ? 1 : 0;

  return `M ${center.x} ${center.y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function FloorPlanCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  placements,
  selectedId,
  onSelect,
  onMove,
  pulsingCameraIds,
  className,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const draggingRef = useRef<string | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setSize({ width: box.width, height: box.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rect: FittedImageRect = fitImage(imageWidth, imageHeight, size.width, size.height);
  const coneRadius = Math.min(rect.width, rect.height) * CONE_RADIUS_RATIO;

  const pointerToNormalized = useCallback(
    (event: React.PointerEvent): NormalizedPoint => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return { x: 0.5, y: 0.5 };
      return toNormalizedPoint(
        { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
        rect,
      ).point;
    },
    [rect],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      const id = draggingRef.current;
      if (!id) return;
      onMove(id, pointerToNormalized(event));
    },
    [onMove, pointerToNormalized],
  );

  const endDrag = useCallback(() => {
    draggingRef.current = null;
  }, []);

  // Agrupamos por proximidade em PIXEL, não em fração da planta: o que importa
  // é se dois marcadores ficam ilegíveis na tela atual.
  const clusters = clusterMarkers(placements, { minSeparationPx: 28, rect });

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full overflow-hidden rounded-lg border bg-muted/30', className)}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onClick={(event) => {
        if (event.target === event.currentTarget) onSelect(null);
      }}
    >
      {rect.width > 0 && (
        <>
          <img
            src={imageUrl}
            alt="Planta baixa do local"
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          />

          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
            role="presentation"
          >
            {placements.map((placement) => {
              const center = toContainerPixels(placement.position, rect);
              const path = conePath(center, placement.headingDeg, placement.fovDeg, coneRadius);
              if (!path) return null;
              return (
                <path
                  key={`cone-${placement.id}`}
                  d={path}
                  className={cn(
                    'fill-primary/20 stroke-primary/40',
                    placement.id === selectedId && 'fill-primary/35 stroke-primary',
                  )}
                  strokeWidth={1}
                />
              );
            })}
          </svg>

          {clusters.map((cluster) => {
            const anchor = cluster.members[0];
            if (!anchor) return null;
            const grouped = cluster.members.length > 1;
            const center = toContainerPixels(grouped ? cluster.center : anchor.position, rect);
            const selected = cluster.members.some((member) => member.id === selectedId);
            const pulsing = pulsingCameraIds
              ? cluster.members.some((member) => pulsingCameraIds.has(member.cameraId))
              : false;

            return (
              <Fragment key={cluster.key}>
                {pulsing && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute h-7 w-7 rounded-full ring-2',
                      'motion-safe:animate-marker-pulse',
                      STATUS_CLASS[cluster.status],
                    )}
                    style={{ left: center.x, top: center.y }}
                  />
                )}
              <button
                key={cluster.key}
                type="button"
                aria-label={
                  grouped
                    ? `${cluster.members.length} câmeras agrupadas, estado mais grave: ${cluster.status}`
                    : `${anchor.label}, estado ${anchor.status}`
                }
                aria-pressed={selected}
                className={cn(
                  'absolute flex h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-2 text-xs font-semibold shadow-md ring-2 transition-transform focus-visible:outline-none focus-visible:ring-4',
                  STATUS_CLASS[cluster.status],
                  selected && 'scale-125 ring-4',
                  'touch-none',
                )}
                style={{ left: center.x, top: center.y }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onSelect(anchor.id);
                  // Agrupamento não é arrastável: mover "cinco câmeras de uma
                  // vez" seria destruir posicionamento feito em campo.
                  if (!grouped) {
                    draggingRef.current = anchor.id;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }
                }}
                onKeyDown={(event) => {
                  if (grouped) return;
                  const step = event.shiftKey ? 0.05 : 0.01;
                  const deltas: Record<string, [number, number]> = {
                    ArrowUp: [0, -step],
                    ArrowDown: [0, step],
                    ArrowLeft: [-step, 0],
                    ArrowRight: [step, 0],
                  };
                  const delta = deltas[event.key];
                  if (!delta) return;
                  event.preventDefault();
                  onMove(anchor.id, {
                    x: anchor.position.x + delta[0],
                    y: anchor.position.y + delta[1],
                  });
                }}
              >
                {grouped ? cluster.members.length : ''}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
