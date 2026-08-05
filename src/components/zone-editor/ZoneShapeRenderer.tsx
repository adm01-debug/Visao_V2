import { memo } from 'react';
import { Zone, calculateArrowPoints } from './ZoneEditorTypes';

interface ZoneShapeRendererProps {
  zone: Zone;
  isSelected: boolean;
  readOnly: boolean;
  hoveredPointIndex: number | null;
  onSelect: (zoneId: string) => void;
  onDragStart: (index: number, zoneId: string) => void;
  onPointHover: (index: number | null) => void;
}

export const ZoneShapeRenderer = memo(function ZoneShapeRenderer({
  zone,
  isSelected,
  readOnly,
  hoveredPointIndex,
  onSelect,
  onDragStart,
  onPointHover,
}: ZoneShapeRendererProps) {
  const center =
    zone.geometry.points.length > 0
      ? {
          x: zone.geometry.points.reduce((s, p) => s + p.x, 0) / zone.geometry.points.length,
          y: zone.geometry.points.reduce((s, p) => s + p.y, 0) / zone.geometry.points.length,
        }
      : null;

  return (
    <g>
      {zone.geometry.shape === 'line' ? (
        <>
          <line
            x1={`${zone.geometry.points[0]?.x}%`}
            y1={`${zone.geometry.points[0]?.y}%`}
            x2={`${zone.geometry.points[1]?.x}%`}
            y2={`${zone.geometry.points[1]?.y}%`}
            stroke={zone.color}
            strokeWidth={isSelected ? 4 : 3}
            strokeDasharray="8,4"
            className="pointer-events-auto cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(zone.id);
            }}
          />
          <polygon
            points={calculateArrowPoints(zone.geometry.points[0]!, zone.geometry.points[1]!)}
            fill={zone.color}
          />
        </>
      ) : (
        <polygon
          points={zone.geometry.points.map((p) => `${p.x}%,${p.y}%`).join(' ')}
          fill={zone.color}
          fillOpacity={zone.opacity}
          stroke={zone.color}
          strokeWidth={isSelected ? 3 : 2}
          className="pointer-events-auto cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(zone.id);
          }}
        />
      )}

      {isSelected &&
        !readOnly &&
        zone.geometry.points.map((point, index) => (
          <circle
            key={index}
            cx={`${point.x}%`}
            cy={`${point.y}%`}
            r="7"
            fill={hoveredPointIndex === index ? zone.color : 'white'}
            stroke={zone.color}
            strokeWidth="2"
            className="pointer-events-auto cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart(index, zone.id);
            }}
            onMouseEnter={() => onPointHover(index)}
            onMouseLeave={() => onPointHover(null)}
          />
        ))}

      {zone.name && center && (
        <text
          x={`${center.x}%`}
          y={`${center.y}%`}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          fontSize="11"
          fontWeight="600"
          className="pointer-events-none text-foreground"
          style={{ textShadow: '0 1px 2px hsl(var(--background) / 0.8)' }}
        >
          {zone.name}
        </text>
      )}
    </g>
  );
});
