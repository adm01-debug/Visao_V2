/**
 * VISÃO - Sistema de Vigilância Inteligente
 * DetectionOverlay Component
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';

export interface DetectionBox {
  id: string;
  type: 'face' | 'person' | 'vehicle' | 'object';
  label?: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

interface DetectionOverlayProps {
  detections: DetectionBox[];
  containerWidth: number;
  containerHeight: number;
  showLabels?: boolean;
  showConfidence?: boolean;
  className?: string;
}

const defaultColors: Record<DetectionBox['type'], string> = {
  face: '#22c55e',
  person: '#3b82f6',
  vehicle: '#f59e0b',
  object: '#8b5cf6',
};

function DetectionOverlayComponent({
  detections,
  containerWidth,
  containerHeight,
  showLabels = true,
  showConfidence = true,
  className
}: DetectionOverlayProps) {
  return (
    <svg
      className={cn("absolute inset-0 pointer-events-none", className)}
      width={containerWidth}
      height={containerHeight}
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
    >
      {detections.map((detection) => {
        const color = detection.color || defaultColors[detection.type];
        const label = detection.label || detection.type;
        const confidenceText = `${Math.round(detection.confidence * 100)}%`;
        
        return (
          <g key={detection.id}>
            {/* Bounding Box */}
            <rect
              x={detection.x}
              y={detection.y}
              width={detection.width}
              height={detection.height}
              fill="none"
              stroke={color}
              strokeWidth={2}
              rx={4}
              className="animate-pulse"
            />
            
            {/* Corner accents */}
            <path
              d={`
                M ${detection.x} ${detection.y + 10}
                L ${detection.x} ${detection.y}
                L ${detection.x + 10} ${detection.y}
              `}
              fill="none"
              stroke={color}
              strokeWidth={3}
            />
            <path
              d={`
                M ${detection.x + detection.width - 10} ${detection.y}
                L ${detection.x + detection.width} ${detection.y}
                L ${detection.x + detection.width} ${detection.y + 10}
              `}
              fill="none"
              stroke={color}
              strokeWidth={3}
            />
            <path
              d={`
                M ${detection.x + detection.width} ${detection.y + detection.height - 10}
                L ${detection.x + detection.width} ${detection.y + detection.height}
                L ${detection.x + detection.width - 10} ${detection.y + detection.height}
              `}
              fill="none"
              stroke={color}
              strokeWidth={3}
            />
            <path
              d={`
                M ${detection.x + 10} ${detection.y + detection.height}
                L ${detection.x} ${detection.y + detection.height}
                L ${detection.x} ${detection.y + detection.height - 10}
              `}
              fill="none"
              stroke={color}
              strokeWidth={3}
            />
            
            {/* Label background */}
            {showLabels && (
              <>
                <rect
                  x={detection.x}
                  y={detection.y - 22}
                  width={Math.max(
                    showConfidence 
                      ? (label.length * 7) + (confidenceText.length * 6) + 16
                      : (label.length * 7) + 8,
                    60
                  )}
                  height={20}
                  fill={color}
                  rx={4}
                />
                <text
                  x={detection.x + 4}
                  y={detection.y - 8}
                  fill="white"
                  fontSize={11}
                  fontWeight="500"
                  fontFamily="system-ui, sans-serif"
                >
                  {label}
                  {showConfidence && (
                    <tspan fill="rgba(255,255,255,0.8)" dx={4}>
                      {confidenceText}
                    </tspan>
                  )}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const DetectionOverlay = memo(DetectionOverlayComponent);
