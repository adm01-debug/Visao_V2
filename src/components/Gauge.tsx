/**
 * Gauge Component
 * Circular speedometer-style meter visualization
 */

import React, { useMemo } from 'react';
import { cn } from '@/utils/cn';

export interface GaugeSegment {
  value: number;
  color: string;
  label?: string;
}

export interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  segments?: GaugeSegment[];
  label?: string;
  unit?: string;
  size?: number;
  thickness?: number;
  startAngle?: number;
  endAngle?: number;
  showValue?: boolean;
  showLabels?: boolean;
  showTicks?: boolean;
  tickCount?: number;
  animated?: boolean;
  animationDuration?: number;
  formatValue?: (value: number) => string;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
}

const DEFAULT_SEGMENTS: GaugeSegment[] = [
  { value: 33, color: '#22c55e' },  // Green
  { value: 66, color: '#eab308' },  // Yellow
  { value: 100, color: '#ef4444' }, // Red
];

export const Gauge: React.FC<GaugeProps> = ({
  value,
  min = 0,
  max = 100,
  segments = DEFAULT_SEGMENTS,
  label,
  unit = '',
  size = 200,
  thickness = 20,
  startAngle = -135,
  endAngle = 135,
  showValue = true,
  showLabels = true,
  showTicks = true,
  tickCount = 5,
  animated = true,
  animationDuration = 1000,
  formatValue,
  className,
  valueClassName,
  labelClassName,
}) => {
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const angleRange = endAngle - startAngle;

  // Clamp value to min/max
  const clampedValue = Math.min(Math.max(value, min), max);
  const percentage = (clampedValue - min) / (max - min);

  // Calculate needle angle
  const needleAngle = startAngle + percentage * angleRange;

  // Convert angle to radians
  const toRadians = (angle: number) => (angle * Math.PI) / 180;

  // Get point on circle
  const getPoint = (angle: number, r: number) => {
    const rad = toRadians(angle);
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  // Create arc path
  const createArc = (startAng: number, endAng: number, r: number) => {
    const start = getPoint(startAng, r);
    const end = getPoint(endAng, r);
    const largeArc = endAng - startAng > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Generate segment arcs
  const segmentArcs = useMemo(() => {
    const arcs: { path: string; color: string }[] = [];
    let prevAngle = startAngle;
    let prevValue = min;

    segments.forEach(segment => {
      const segmentPercentage = (segment.value - prevValue) / (max - min);
      const segmentEndAngle = prevAngle + segmentPercentage * angleRange;
      
      arcs.push({
        path: createArc(prevAngle, segmentEndAngle, radius),
        color: segment.color,
      });

      prevAngle = segmentEndAngle;
      prevValue = segment.value;
    });

    return arcs;
  }, [segments, startAngle, angleRange, radius, min, max]);

  // Generate tick marks
  const ticks = useMemo(() => {
    const tickMarks: { x1: number; y1: number; x2: number; y2: number; value: number; labelPos: { x: number; y: number } }[] = [];
    
    for (let i = 0; i <= tickCount; i++) {
      const tickValue = min + (i / tickCount) * (max - min);
      const tickAngle = startAngle + (i / tickCount) * angleRange;
      
      const innerR = radius - thickness / 2 - 5;
      const outerR = radius - thickness / 2 + 5;
      const labelR = radius - thickness / 2 - 20;
      
      const innerPoint = getPoint(tickAngle, innerR);
      const outerPoint = getPoint(tickAngle, outerR);
      const labelPoint = getPoint(tickAngle, labelR);
      
      tickMarks.push({
        x1: innerPoint.x,
        y1: innerPoint.y,
        x2: outerPoint.x,
        y2: outerPoint.y,
        value: tickValue,
        labelPos: labelPoint,
      });
    }
    
    return tickMarks;
  }, [tickCount, min, max, startAngle, angleRange, radius, thickness]);

  // Needle path
  const needlePath = useMemo(() => {
    const needleLength = radius - thickness / 2 - 10;
    const needleWidth = 8;
    const tip = getPoint(needleAngle, needleLength);
    const base1 = getPoint(needleAngle + 90, needleWidth);
    const base2 = getPoint(needleAngle - 90, needleWidth);
    
    return `M ${tip.x} ${tip.y} L ${base1.x} ${base1.y} L ${base2.x} ${base2.y} Z`;
  }, [needleAngle, radius, thickness]);

  const displayValue = formatValue ? formatValue(clampedValue) : Math.round(clampedValue).toString();

  return (
    <div className={cn('gauge inline-flex flex-col items-center', className)}>
      <svg
        width={size}
        height={size * 0.75}
        viewBox={`0 0 ${size} ${size * 0.85}`}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={createArc(startAngle, endAngle, radius)}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          strokeLinecap="round"
          className="text-muted/20"
        />

        {/* Segment arcs */}
        {segmentArcs.map((arc, index) => (
          <path
            key={index}
            d={arc.path}
            fill="none"
            stroke={arc.color}
            strokeWidth={thickness}
            strokeLinecap="round"
            className="opacity-30"
          />
        ))}

        {/* Value arc (filled portion) */}
        <path
          d={createArc(startAngle, needleAngle, radius)}
          fill="none"
          stroke={segments.find(s => clampedValue <= s.value)?.color || segments[segments.length - 1].color}
          strokeWidth={thickness}
          strokeLinecap="round"
          className={cn(
            animated && 'transition-all',
          )}
          style={{
            transitionDuration: animated ? `${animationDuration}ms` : undefined,
          }}
        />

        {/* Tick marks */}
        {showTicks && ticks.map((tick, index) => (
          <g key={index}>
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="currentColor"
              strokeWidth={2}
              className="text-muted-foreground"
            />
            {showLabels && (
              <text
                x={tick.labelPos.x}
                y={tick.labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-muted-foreground"
              >
                {Math.round(tick.value)}
              </text>
            )}
          </g>
        ))}

        {/* Needle */}
        <g
          className={cn(
            animated && 'transition-transform origin-center',
          )}
          style={{
            transitionDuration: animated ? `${animationDuration}ms` : undefined,
            transformOrigin: `${center}px ${center}px`,
          }}
        >
          <path
            d={needlePath}
            fill="currentColor"
            className="text-foreground drop-shadow-md"
          />
          <circle
            cx={center}
            cy={center}
            r={10}
            fill="currentColor"
            className="text-foreground"
          />
          <circle
            cx={center}
            cy={center}
            r={6}
            fill="currentColor"
            className="text-background"
          />
        </g>

        {/* Center value */}
        {showValue && (
          <text
            x={center}
            y={center + 40}
            textAnchor="middle"
            className={cn('text-2xl font-bold fill-foreground', valueClassName)}
          >
            {displayValue}
            {unit && <tspan className="text-sm font-normal">{unit}</tspan>}
          </text>
        )}
      </svg>

      {/* Label */}
      {label && (
        <span className={cn('text-sm text-muted-foreground mt-2', labelClassName)}>
          {label}
        </span>
      )}
    </div>
  );
};

export default Gauge;
