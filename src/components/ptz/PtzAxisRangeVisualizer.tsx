import { useMemo } from 'react';

export type PtzAxis = 'pan' | 'tilt' | 'zoom';

interface Range {
  min: number;
  max: number;
}

interface PtzAxisRangeVisualizerProps {
  axis: PtzAxis;
  bounds: [number, number];
  calibrated: Range;
  observed?: Range;
  position: number;
  moving?: boolean;
}

const AXIS_LABEL: Record<PtzAxis, string> = {
  pan: 'Pan',
  tilt: 'Tilt',
  zoom: 'Zoom',
};

const HEIGHT = 40;
const PAD_X = 4;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Régua visual read-only mostrando range físico, intervalo calibrado,
 * medição observada e posição estimada de um eixo PTZ.
 */
export function PtzAxisRangeVisualizer({
  axis,
  bounds,
  calibrated,
  observed,
  position,
  moving = false,
}: PtzAxisRangeVisualizerProps) {
  const [lo, hi] = bounds;
  const span = hi - lo || 1;

  const toPct = (v: number) => ((clamp(v, lo, hi) - lo) / span) * 100;

  const calibratedMin = Math.min(calibrated.min, calibrated.max);
  const calibratedMax = Math.max(calibrated.min, calibrated.max);
  const outOfRange = position < calibratedMin || position > calibratedMax;

  const ticks = useMemo(() => {
    const t = [lo, hi];
    if (axis !== 'zoom' && lo < 0 && hi > 0) t.push(0);
    return t;
  }, [axis, lo, hi]);

  const posPct = toPct(position);
  const calMinPct = toPct(calibratedMin);
  const calMaxPct = toPct(calibratedMax);

  const label = `${AXIS_LABEL[axis]} em ${position.toFixed(2)}, ${
    outOfRange ? 'fora do intervalo' : 'dentro do intervalo'
  } calibrado ${calibratedMin.toFixed(2)} a ${calibratedMax.toFixed(2)}`;

  return (
    <div
      role="img"
      aria-label={label}
      className="relative w-full select-none"
      style={{ height: HEIGHT }}
    >
      <svg
        viewBox={`0 0 100 ${HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={HEIGHT}
        className="overflow-visible"
      >
        {/* trilho físico */}
        <rect
          x={PAD_X}
          y={HEIGHT / 2 - 4}
          width={100 - PAD_X * 2}
          height={8}
          rx={2}
          className="fill-muted"
        />

        {/* intervalo calibrado */}
        <rect
          x={PAD_X + (calMinPct * (100 - PAD_X * 2)) / 100}
          y={HEIGHT / 2 - 6}
          width={Math.max(0.5, ((calMaxPct - calMinPct) * (100 - PAD_X * 2)) / 100)}
          height={12}
          rx={2}
          className="fill-primary/25 stroke-primary"
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
          data-testid="calibrated-band"
        />

        {/* marcas do observado */}
        {observed ? (
          <g data-testid="observed-marks">
            {[observed.min, observed.max].map((v, i) => {
              const p = PAD_X + (toPct(v) * (100 - PAD_X * 2)) / 100;
              return (
                <line
                  key={i}
                  x1={p}
                  x2={p}
                  y1={HEIGHT / 2 - 10}
                  y2={HEIGHT / 2 + 10}
                  className="stroke-muted-foreground/40"
                  strokeWidth={0.75}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>
        ) : null}

        {/* ticks */}
        {ticks.map((v) => {
          const p = PAD_X + (toPct(v) * (100 - PAD_X * 2)) / 100;
          return (
            <line
              key={`tick-${v}`}
              x1={p}
              x2={p}
              y1={HEIGHT / 2 + 6}
              y2={HEIGHT / 2 + 10}
              className="stroke-muted-foreground"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {/* marcador de posição */}
        {(() => {
          const p = PAD_X + (posPct * (100 - PAD_X * 2)) / 100;
          return (
            <g data-testid="position-marker">
              <line
                x1={p}
                x2={p}
                y1={4}
                y2={HEIGHT - 4}
                className={outOfRange ? 'stroke-destructive' : 'stroke-foreground'}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={p}
                cy={HEIGHT / 2}
                r={2.5}
                className={
                  outOfRange
                    ? 'fill-destructive stroke-destructive'
                    : moving
                      ? 'fill-primary stroke-primary animate-pulse'
                      : 'fill-primary stroke-primary'
                }
                strokeWidth={0.75}
                vectorEffect="non-scaling-stroke"
                data-out-of-range={outOfRange ? 'true' : 'false'}
              />
            </g>
          );
        })()}
      </svg>

      {/* rótulos dos extremos */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-1 font-mono text-[9px] text-muted-foreground">
        <span>{lo.toFixed(2)}</span>
        {axis !== 'zoom' && lo < 0 && hi > 0 ? <span>0</span> : null}
        <span>{hi.toFixed(2)}</span>
      </div>
    </div>
  );
}
