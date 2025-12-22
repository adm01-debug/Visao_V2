import { useOnClickOutside } from "@/hooks";
import { memo } from "react";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: ZoneEditor
 * 
 * Editor visual para desenhar zonas de interesse:
 * - Desenho de polígonos
 * - Desenho de retângulos
 * - Desenho de linhas (tripwire)
 * - Edição de pontos existentes
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Pencil,
  Square,
  Minus,
  Trash2,
  Check,
  X,
  RotateCcw,
  MousePointer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type DrawingMode = 'select' | 'rectangle' | 'polygon' | 'line';
type Point = { x: number; y: number };

interface ZoneGeometry {
  shape: 'polygon' | 'rectangle' | 'line';
  points: Point[];
}

interface Zone {
  id: string;
  name: string;
  geometry: ZoneGeometry;
  color: string;
  opacity: number;
}

interface ZoneEditorProps {
  existingZones?: Zone[];
  onZoneCreated?: (zone: Partial<Zone>) => void;
  onZoneUpdated?: (zone: Zone) => void;
  onZoneDeleted?: (zoneId: string) => void;
  selectedColor?: string;
  drawingMode?: DrawingMode;
  className?: string;
  readOnly?: boolean;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ZoneEditor({
  existingZones = [],
  onZoneCreated,
  onZoneUpdated,
  onZoneDeleted,
  selectedColor = '#3B82F6',
  drawingMode: externalMode,
  className,
  readOnly = false,
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

  // Sincronizar mode externo
  useEffect(() => {
    if (externalMode) {
      setMode(externalMode);
      cancelDrawing();
    }
  }, [externalMode]);

  // Converter coordenadas do mouse para porcentagem
  const getMousePosition = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  // Cancelar desenho
  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setCurrentPoints([]);
    setPreviewPoint(null);
  }, []);

  // Handler de clique
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    
    const pos = getMousePosition(e);

    if (mode === 'select') {
      setSelectedZoneId(null);
      return;
    }

    if (mode === 'rectangle') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([pos]);
      } else {
        const startPoint = currentPoints[0];
        const endPoint = pos;
        
        // Criar retângulo com 4 pontos
        const rectPoints: Point[] = [
          { x: Math.min(startPoint.x, endPoint.x), y: Math.min(startPoint.y, endPoint.y) },
          { x: Math.max(startPoint.x, endPoint.x), y: Math.min(startPoint.y, endPoint.y) },
          { x: Math.max(startPoint.x, endPoint.x), y: Math.max(startPoint.y, endPoint.y) },
          { x: Math.min(startPoint.x, endPoint.x), y: Math.max(startPoint.y, endPoint.y) },
        ];

        onZoneCreated?.({
          geometry: {
            shape: 'rectangle',
            points: rectPoints,
          },
          color: selectedColor,
          opacity: 0.3,
        });

        setIsDrawing(false);
        setCurrentPoints([]);
        setPreviewPoint(null);
        toast.success('Zona criada!');
      }
    }

    if (mode === 'polygon') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([pos]);
      } else {
        // Verificar se clicou perto do primeiro ponto para fechar
        const firstPoint = currentPoints[0];
        const distance = Math.sqrt(
          Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2)
        );

        if (distance < 3 && currentPoints.length >= 3) {
          // Fechar polígono
          onZoneCreated?.({
            geometry: {
              shape: 'polygon',
              points: currentPoints,
            },
            color: selectedColor,
            opacity: 0.3,
          });

          setIsDrawing(false);
          setCurrentPoints([]);
          setPreviewPoint(null);
          toast.success('Zona criada!');
        } else {
          // Adicionar ponto
          setCurrentPoints([...currentPoints, pos]);
        }
      }
    }

    if (mode === 'line') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([pos]);
      } else {
        // Finalizar linha
        onZoneCreated?.({
          geometry: {
            shape: 'line',
            points: [...currentPoints, pos],
          },
          color: selectedColor,
          opacity: 0.3,
        });

        setIsDrawing(false);
        setCurrentPoints([]);
        setPreviewPoint(null);
        toast.success('Linha criada!');
      }
    }
  }, [mode, isDrawing, currentPoints, selectedColor, readOnly, getMousePosition, onZoneCreated]);

  // Handler de movimento
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePosition(e);
    
    // Atualizar preview
    if (isDrawing) {
      setPreviewPoint(pos);
    }

    // Arrastar ponto de zona existente
    if (dragPointIndex !== null && dragZoneId && onZoneUpdated) {
      const zone = existingZones.find(z => z.id === dragZoneId);
      if (zone) {
        const newPoints = [...zone.geometry.points];
        newPoints[dragPointIndex] = pos;
        onZoneUpdated({
          ...zone,
          geometry: { ...zone.geometry, points: newPoints },
        });
      }
    }
  }, [isDrawing, dragPointIndex, dragZoneId, existingZones, getMousePosition, onZoneUpdated]);

  // Handler de double-click (finalizar polígono)
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (mode === 'polygon' && isDrawing && currentPoints.length >= 3) {
      onZoneCreated?.({
        geometry: {
          shape: 'polygon',
          points: currentPoints,
        },
        color: selectedColor,
        opacity: 0.3,
      });

      setIsDrawing(false);
      setCurrentPoints([]);
      setPreviewPoint(null);
      toast.success('Zona criada!');
    }
  }, [mode, isDrawing, currentPoints, selectedColor, onZoneCreated]);

  // Handler de teclas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDrawing();
        setSelectedZoneId(null);
      }
      if (e.key === 'Delete' && selectedZoneId) {
        onZoneDeleted?.(selectedZoneId);
        setSelectedZoneId(null);
      }
      if (e.key === 'Backspace' && isDrawing && currentPoints.length > 1) {
        setCurrentPoints(currentPoints.slice(0, -1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, currentPoints, selectedZoneId, cancelDrawing, onZoneDeleted]);

  // Cursor baseado no modo
  const cursorClass = useMemo(() => {
    if (readOnly) return 'cursor-default';
    if (dragPointIndex !== null) return 'cursor-grabbing';
    switch (mode) {
      case 'select': return 'cursor-pointer';
      default: return 'cursor-crosshair';
    }
  }, [mode, readOnly, dragPointIndex]);

  // Renderizar preview do desenho
  const renderPreview = () => {
    if (!isDrawing || currentPoints.length === 0 || !previewPoint) return null;

    if (mode === 'rectangle') {
      const start = currentPoints[0];
      const end = previewPoint;
      return (
        <rect
          x={`${Math.min(start.x, end.x)}%`}
          y={`${Math.min(start.y, end.y)}%`}
          width={`${Math.abs(end.x - start.x)}%`}
          height={`${Math.abs(end.y - start.y)}%`}
          fill={selectedColor}
          fillOpacity={0.2}
          stroke={selectedColor}
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      );
    }

    if (mode === 'polygon') {
      const allPoints = [...currentPoints, previewPoint];
      return (
        <>
          <polygon
            points={allPoints.map(p => `${p.x}%,${p.y}%`).join(' ')}
            fill={selectedColor}
            fillOpacity={0.15}
            stroke={selectedColor}
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          {/* Linha do último ponto ao preview */}
          <line
            x1={`${currentPoints[currentPoints.length - 1].x}%`}
            y1={`${currentPoints[currentPoints.length - 1].y}%`}
            x2={`${previewPoint.x}%`}
            y2={`${previewPoint.y}%`}
            stroke={selectedColor}
            strokeWidth="2"
            strokeDasharray="3,3"
          />
          {/* Linha de fechamento (preview) */}
          {currentPoints.length >= 2 && (
            <line
              x1={`${previewPoint.x}%`}
              y1={`${previewPoint.y}%`}
              x2={`${currentPoints[0].x}%`}
              y2={`${currentPoints[0].y}%`}
              stroke={selectedColor}
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity={0.5}
            />
          )}
          {/* Pontos */}
          {currentPoints.map((point, index) => (
            <circle
              key={index}
              cx={`${point.x}%`}
              cy={`${point.y}%`}
              r={index === 0 ? 8 : 5}
              fill={index === 0 ? selectedColor : 'white'}
              stroke={selectedColor}
              strokeWidth="2"
              className={index === 0 ? 'cursor-pointer' : ''}
            />
          ))}
        </>
      );
    }

    if (mode === 'line') {
      const start = currentPoints[0];
      return (
        <>
          <line
            x1={`${start.x}%`}
            y1={`${start.y}%`}
            x2={`${previewPoint.x}%`}
            y2={`${previewPoint.y}%`}
            stroke={selectedColor}
            strokeWidth="3"
            strokeDasharray="8,4"
          />
          <circle
            cx={`${start.x}%`}
            cy={`${start.y}%`}
            r="6"
            fill="white"
            stroke={selectedColor}
            strokeWidth="2"
          />
          <circle
            cx={`${previewPoint.x}%`}
            cy={`${previewPoint.y}%`}
            r="6"
            fill="white"
            stroke={selectedColor}
            strokeWidth="2"
            opacity={0.7}
          />
        </>
      );
    }

    return null;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full select-none',
        cursorClass,
        className
      )}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onDoubleClick={handleDoubleClick}
      onMouseUp={() => {
        setDragPointIndex(null);
        setDragZoneId(null);
      }}
      onMouseLeave={() => {
        setPreviewPoint(null);
        setDragPointIndex(null);
      }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {/* Zonas existentes */}
        {existingZones.map(zone => {
          const isSelected = selectedZoneId === zone.id;
          
          return (
            <g key={zone.id}>
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
                      setSelectedZoneId(zone.id);
                    }}
                  />
                  {/* Setas de direção */}
                  <polygon
                    points={calculateArrowPoints(zone.geometry.points[0], zone.geometry.points[1])}
                    fill={zone.color}
                  />
                </>
              ) : (
                <polygon
                  points={zone.geometry.points.map(p => `${p.x}%,${p.y}%`).join(' ')}
                  fill={zone.color}
                  fillOpacity={zone.opacity}
                  stroke={zone.color}
                  strokeWidth={isSelected ? 3 : 2}
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedZoneId(zone.id);
                  }}
                />
              )}

              {/* Pontos de controle (quando selecionada) */}
              {isSelected && !readOnly && zone.geometry.points.map((point, index) => (
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
                    setDragPointIndex(index);
                    setDragZoneId(zone.id);
                  }}
                  onMouseEnter={() => setHoveredPointIndex(index)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                />
              ))}

              {/* Label da zona no centro */}
              {zone.name && zone.geometry.points.length > 0 && (
                <text
                  x={`${zone.geometry.points.reduce((sum, p) => sum + p.x, 0) / zone.geometry.points.length}%`}
                  y={`${zone.geometry.points.reduce((sum, p) => sum + p.y, 0) / zone.geometry.points.length}%`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="600"
                  className="pointer-events-none"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {zone.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Preview do desenho atual */}
        {renderPreview()}
      </svg>

      {/* Instruções de desenho */}
      {isDrawing && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center">
          <div className="bg-black/80 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-3">
            {mode === 'rectangle' && (
              <span>Clique para definir o segundo canto do retângulo</span>
            )}
            {mode === 'polygon' && (
              <>
                <span>
                  {currentPoints.length < 3 
                    ? 'Clique para adicionar pontos (mín. 3)' 
                    : 'Clique no primeiro ponto ou duplo-clique para fechar'}
                </span>
                <span className="opacity-60">|</span>
                <span className="opacity-60">ESC para cancelar</span>
              </>
            )}
            {mode === 'line' && (
              <span>Clique para definir o ponto final da linha</span>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                cancelDrawing();
              }}
            >
              <X className="w-3 h-3 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Ações da zona selecionada */}
      {selectedZoneId && !readOnly && (
        <div className="absolute top-2 right-2">
          <Button
            variant="destructive"
            size="sm"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation();
              onZoneDeleted?.(selectedZoneId);
              setSelectedZoneId(null);
            }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Excluir
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper para calcular pontos da seta de direção
function calculateArrowPoints(start: Point, end: Point): string {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const arrowSize = 1.5; // porcentagem
  
  const p1x = midX + arrowSize * Math.cos(angle);
  const p1y = midY + arrowSize * Math.sin(angle);
  const p2x = midX - arrowSize * Math.cos(angle - Math.PI / 6);
  const p2y = midY - arrowSize * Math.sin(angle - Math.PI / 6);
  const p3x = midX - arrowSize * Math.cos(angle + Math.PI / 6);
  const p3y = midY - arrowSize * Math.sin(angle + Math.PI / 6);
  
  return `${p1x}%,${p1y}% ${p2x}%,${p2y}% ${p3x}%,${p3y}%`;
}

export default ZoneEditor;
