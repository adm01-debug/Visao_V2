/**
 * VISÃO - ZoneEditor (Refactored)
 * Editor visual para desenhar zonas de interesse
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DrawingMode, Point, ZoneEditorProps } from './zone-editor/ZoneEditorTypes';
import { ZoneDrawingPreview } from './zone-editor/ZoneDrawingPreview';
import { ZoneShapeRenderer } from './zone-editor/ZoneShapeRenderer';
import { DrawingInstructions } from './zone-editor/DrawingInstructions';

export function ZoneEditor({
  existingZones = [], onZoneCreated, onZoneUpdated, onZoneDeleted,
  // eslint-disable-next-line visao/no-hardcoded-colors -- cor padrão de zona (HSL literal usada pelo Canvas)
  selectedColor = 'hsl(217, 91%, 60%)', drawingMode: externalMode, className, readOnly = false,
}: ZoneEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<DrawingMode>(externalMode || 'rectangle');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [dragPointIndex, setDragPointIndex] = useState<number | null>(null);
  const [dragZoneId, setDragZoneId] = useState<string | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);

  useEffect(() => { if (externalMode) { setMode(externalMode); cancelDrawing(); } }, [externalMode]);

  const getMousePosition = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const cancelDrawing = useCallback(() => { setIsDrawing(false); setCurrentPoints([]); setPreviewPoint(null); }, []);

  const finishZone = useCallback((shape: 'polygon' | 'rectangle' | 'line', points: Point[]) => {
    onZoneCreated?.({ geometry: { shape, points }, color: selectedColor, opacity: 0.3 });
    setIsDrawing(false); setCurrentPoints([]); setPreviewPoint(null);
    toast.success(shape === 'line' ? 'Linha criada!' : 'Zona criada!');
  }, [selectedColor, onZoneCreated]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    const pos = getMousePosition(e);

    if (mode === 'select') { setSelectedZoneId(null); return; }

    if (mode === 'rectangle') {
      if (!isDrawing) { setIsDrawing(true); setCurrentPoints([pos]); }
      else {
        const s = currentPoints[0]!;
        finishZone('rectangle', [
          { x: Math.min(s.x, pos.x), y: Math.min(s.y, pos.y) }, { x: Math.max(s.x, pos.x), y: Math.min(s.y, pos.y) },
          { x: Math.max(s.x, pos.x), y: Math.max(s.y, pos.y) }, { x: Math.min(s.x, pos.x), y: Math.max(s.y, pos.y) },
        ]);
      }
    }

    if (mode === 'polygon') {
      if (!isDrawing) { setIsDrawing(true); setCurrentPoints([pos]); }
      else {
        const dist = Math.sqrt(Math.pow(pos.x - currentPoints[0]!.x, 2) + Math.pow(pos.y - currentPoints[0]!.y, 2));
        if (dist < 3 && currentPoints.length >= 3) finishZone('polygon', currentPoints);
        else setCurrentPoints([...currentPoints, pos]);
      }
    }

    if (mode === 'line') {
      if (!isDrawing) { setIsDrawing(true); setCurrentPoints([pos]); }
      else finishZone('line', [...currentPoints, pos]);
    }
  }, [mode, isDrawing, currentPoints, readOnly, getMousePosition, finishZone]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePosition(e);
    if (isDrawing) setPreviewPoint(pos);
    if (dragPointIndex !== null && dragZoneId && onZoneUpdated) {
      const zone = existingZones.find(z => z.id === dragZoneId);
      if (zone) {
        const newPoints = [...zone.geometry.points]; newPoints[dragPointIndex] = pos;
        onZoneUpdated({ ...zone, geometry: { ...zone.geometry, points: newPoints } });
      }
    }
  }, [isDrawing, dragPointIndex, dragZoneId, existingZones, getMousePosition, onZoneUpdated]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (mode === 'polygon' && isDrawing && currentPoints.length >= 3) finishZone('polygon', currentPoints);
  }, [mode, isDrawing, currentPoints, finishZone]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { cancelDrawing(); setSelectedZoneId(null); }
      if (e.key === 'Delete' && selectedZoneId) { onZoneDeleted?.(selectedZoneId); setSelectedZoneId(null); }
      if (e.key === 'Backspace' && isDrawing && currentPoints.length > 1) setCurrentPoints(currentPoints.slice(0, -1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDrawing, currentPoints, selectedZoneId, cancelDrawing, onZoneDeleted]);

  const cursorClass = useMemo(() => {
    if (readOnly) return 'cursor-default';
    if (dragPointIndex !== null) return 'cursor-grabbing';
    return mode === 'select' ? 'cursor-pointer' : 'cursor-crosshair';
  }, [mode, readOnly, dragPointIndex]);

  return (
    <div ref={containerRef} className={cn('relative w-full h-full select-none', cursorClass, className)}
      onClick={handleClick} onMouseMove={handleMouseMove} onDoubleClick={handleDoubleClick}
      onMouseUp={() => { setDragPointIndex(null); setDragZoneId(null); }}
      onMouseLeave={() => { setPreviewPoint(null); setDragPointIndex(null); }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {existingZones.map(zone => (
          <ZoneShapeRenderer key={zone.id} zone={zone} isSelected={selectedZoneId === zone.id} readOnly={readOnly}
            hoveredPointIndex={hoveredPointIndex} onSelect={setSelectedZoneId}
            onDragStart={(idx, id) => { setDragPointIndex(idx); setDragZoneId(id); }}
            onPointHover={setHoveredPointIndex} />
        ))}
        <ZoneDrawingPreview mode={mode} isDrawing={isDrawing} currentPoints={currentPoints} previewPoint={previewPoint} selectedColor={selectedColor} />
      </svg>

      <DrawingInstructions mode={mode} isDrawing={isDrawing} pointCount={currentPoints.length} onCancel={cancelDrawing} />

      {selectedZoneId && !readOnly && (
        <div className="absolute top-2 right-2">
          <Button variant="destructive" size="sm" className="h-8" onClick={(e) => { e.stopPropagation(); onZoneDeleted?.(selectedZoneId); setSelectedZoneId(null); }}>
            <Trash2 className="w-3 h-3 mr-1" />Excluir
          </Button>
        </div>
      )}
    </div>
  );
}

// Re-export types
export type { DrawingMode, Point, ZoneEditorProps } from './zone-editor/ZoneEditorTypes';
export type { Zone, ZoneGeometry } from './zone-editor/ZoneEditorTypes';
export default memo(ZoneEditor);
