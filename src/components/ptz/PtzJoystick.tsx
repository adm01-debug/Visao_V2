import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PtzJoystickProps {
  size?: number;
  onChange: (vec: { pan: number; tilt: number; magnitude: number }) => void;
  onRelease: () => void;
  disabled?: boolean;
}

/**
 * PtzJoystick — SVG interativo (mouse + touch) que emite vetor normalizado
 * (-1..1) enquanto o usuário arrasta e chama onRelease ao soltar.
 */
export function PtzJoystick({ size = 200, onChange, onRelease, disabled }: PtzJoystickProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const radius = size / 2;
  const knobRadius = size * 0.18;
  const maxDist = radius - knobRadius;

  const compute = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.min(Math.hypot(dx, dy), maxDist);
    const angle = Math.atan2(dy, dx);
    dx = Math.cos(angle) * dist;
    dy = Math.sin(angle) * dist;
    setKnob({ x: dx, y: dy });
    const pan = +(dx / maxDist).toFixed(3);
    const tilt = +(-dy / maxDist).toFixed(3);
    onChange({ pan, tilt, magnitude: dist / maxDist });
  }, [maxDist, onChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setActive(true);
    compute(e.clientX, e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active) return;
    compute(e.clientX, e.clientY);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!active) return;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    setActive(false);
    setKnob({ x: 0, y: 0 });
    onRelease();
  };

  return (
    <svg
      ref={svgRef}
      width={size} height={size}
      className={cn("touch-none select-none", disabled && "opacity-50 pointer-events-none")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="slider"
      aria-label="Joystick PTZ"
    >
      <circle cx={radius} cy={radius} r={radius - 2} className="fill-muted stroke-border" strokeWidth={2} />
      <circle cx={radius} cy={radius} r={radius * 0.65} className="fill-none stroke-border/50" strokeDasharray="4 4" />
      <line x1={radius} y1={8} x2={radius} y2={size - 8} className="stroke-border/30" />
      <line x1={8} y1={radius} x2={size - 8} y2={radius} className="stroke-border/30" />
      <circle
        cx={radius + knob.x}
        cy={radius + knob.y}
        r={knobRadius}
        className={cn("fill-primary stroke-primary-foreground transition-transform", active && "fill-primary/90")}
        strokeWidth={2}
      />
    </svg>
  );
}
