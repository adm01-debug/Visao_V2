import { memo } from 'react';
import { DrawingMode, Point } from './ZoneEditorTypes';

interface ZoneDrawingPreviewProps {
  mode: DrawingMode;
  isDrawing: boolean;
  currentPoints: Point[];
  previewPoint: Point | null;
  selectedColor: string;
}

export const ZoneDrawingPreview = memo(function ZoneDrawingPreview({
  mode, isDrawing, currentPoints, previewPoint, selectedColor,
}: ZoneDrawingPreviewProps) {
  if (!isDrawing || currentPoints.length === 0 || !previewPoint) return null;

  if (mode === 'rectangle') {
    const start = currentPoints[0]!;
    return (
      <rect
        x={`${Math.min(start.x, previewPoint.x)}%`}
        y={`${Math.min(start.y, previewPoint.y)}%`}
        width={`${Math.abs(previewPoint.x - start.x)}%`}
        height={`${Math.abs(previewPoint.y - start.y)}%`}
        fill={selectedColor} fillOpacity={0.2}
        stroke={selectedColor} strokeWidth="2" strokeDasharray="5,5"
      />
    );
  }

  if (mode === 'polygon') {
    const allPoints = [...currentPoints, previewPoint];
    const lastPt = currentPoints[currentPoints.length - 1]!;
    const firstPt = currentPoints[0]!;
    return (
      <>
        <polygon
          points={allPoints.map(p => `${p.x}%,${p.y}%`).join(' ')}
          fill={selectedColor} fillOpacity={0.15}
          stroke={selectedColor} strokeWidth="2" strokeDasharray="5,5"
        />
        <line
          x1={`${lastPt.x}%`} y1={`${lastPt.y}%`}
          x2={`${previewPoint.x}%`} y2={`${previewPoint.y}%`}
          stroke={selectedColor} strokeWidth="2" strokeDasharray="3,3"
        />
        {currentPoints.length >= 2 && (
          <line
            x1={`${previewPoint.x}%`} y1={`${previewPoint.y}%`}
            x2={`${firstPt.x}%`} y2={`${firstPt.y}%`}
            stroke={selectedColor} strokeWidth="1" strokeDasharray="3,3" opacity={0.5}
          />
        )}
        {currentPoints.map((point, index) => (
          <circle
            key={index}
            cx={`${point.x}%`} cy={`${point.y}%`}
            r={index === 0 ? 8 : 5}
            fill={index === 0 ? selectedColor : 'white'}
            stroke={selectedColor} strokeWidth="2"
            className={index === 0 ? 'cursor-pointer' : ''}
          />
        ))}
      </>
    );
  }

  if (mode === 'line') {
    const start = currentPoints[0]!;
    return (
      <>
        <line
          x1={`${start.x}%`} y1={`${start.y}%`}
          x2={`${previewPoint.x}%`} y2={`${previewPoint.y}%`}
          stroke={selectedColor} strokeWidth="3" strokeDasharray="8,4"
        />
        <circle cx={`${start.x}%`} cy={`${start.y}%`} r="6" fill="white" stroke={selectedColor} strokeWidth="2" />
        <circle cx={`${previewPoint.x}%`} cy={`${previewPoint.y}%`} r="6" fill="white" stroke={selectedColor} strokeWidth="2" opacity={0.7} />
      </>
    );
  }

  return null;
});
