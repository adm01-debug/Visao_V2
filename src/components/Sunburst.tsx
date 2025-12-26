/**
 * Sunburst Chart Component
 * Hierarchical pie chart with concentric rings
 */

import React, { useMemo, useState } from 'react';
import { cn } from '@/utils/cn';

export interface SunburstNode {
  id: string;
  name: string;
  value?: number;
  color?: string;
  children?: SunburstNode[];
}

export interface SunburstProps {
  data: SunburstNode;
  width?: number;
  height?: number;
  innerRadius?: number;
  showLabels?: boolean;
  showTooltip?: boolean;
  onNodeClick?: (node: SunburstNode, path: SunburstNode[]) => void;
  colorScale?: string[];
  className?: string;
}

interface ArcData extends SunburstNode {
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  depth: number;
  parent?: ArcData;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

function computeValue(node: SunburstNode): number {
  if (node.value !== undefined) return node.value;
  if (!node.children) return 0;
  return node.children.reduce((sum, child) => sum + computeValue(child), 0);
}

function computeArcs(
  node: SunburstNode,
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  depth: number,
  ringWidth: number,
  parent?: ArcData
): ArcData[] {
  const nodeValue = computeValue(node);
  const arc: ArcData = {
    ...node,
    value: nodeValue,
    startAngle,
    endAngle,
    innerRadius,
    outerRadius,
    depth,
    parent,
  };

  const result: ArcData[] = [arc];

  if (node.children && node.children.length > 0) {
    const total = node.children.reduce((sum, child) => sum + computeValue(child), 0);
    let currentAngle = startAngle;

    node.children.forEach(child => {
      const childValue = computeValue(child);
      const childAngle = total > 0 ? (childValue / total) * (endAngle - startAngle) : 0;
      
      const childArcs = computeArcs(
        child,
        currentAngle,
        currentAngle + childAngle,
        outerRadius,
        outerRadius + ringWidth,
        depth + 1,
        ringWidth,
        arc
      );
      
      result.push(...childArcs);
      currentAngle += childAngle;
    });
  }

  return result;
}

const describeArc = (
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string => {
  const startRad = (startAngle - 90) * Math.PI / 180;
  const endRad = (endAngle - 90) * Math.PI / 180;

  const x1 = cx + innerRadius * Math.cos(startRad);
  const y1 = cy + innerRadius * Math.sin(startRad);
  const x2 = cx + outerRadius * Math.cos(startRad);
  const y2 = cy + outerRadius * Math.sin(startRad);
  const x3 = cx + outerRadius * Math.cos(endRad);
  const y3 = cy + outerRadius * Math.sin(endRad);
  const x4 = cx + innerRadius * Math.cos(endRad);
  const y4 = cy + innerRadius * Math.sin(endRad);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `
    M ${x1} ${y1}
    L ${x2} ${y2}
    A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3}
    L ${x4} ${y4}
    A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1}
    Z
  `;
};

export const Sunburst: React.FC<SunburstProps> = ({
  data,
  width = 400,
  height = 400,
  innerRadius = 30,
  showLabels = true,
  showTooltip = true,
  onNodeClick,
  colorScale = COLORS,
  className,
}) => {
  const [hoveredArc, setHoveredArc] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<SunburstNode | null>(null);

  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) / 2 - 10;

  const arcs = useMemo(() => {
    const rootNode = focusedNode || data;
    const maxDepth = 4;
    const ringWidth = (maxRadius - innerRadius) / maxDepth;
    
    return computeArcs(rootNode, 0, 360, innerRadius, innerRadius + ringWidth, 0, ringWidth);
  }, [data, focusedNode, innerRadius, maxRadius]);

  const getColor = (arc: ArcData): string => {
    if (arc.color) return arc.color;
    
    // Find root ancestor to determine color
    let root = arc;
    while (root.parent && root.parent.depth > 0) {
      root = root.parent;
    }
    
    const rootIndex = arcs.filter(a => a.depth === 0).findIndex(a => a.id === root.id);
    return colorScale[rootIndex % colorScale.length];
  };

  const handleClick = (arc: ArcData) => {
    if (arc.children && arc.children.length > 0) {
      setFocusedNode(arc);
    }
    
    // Build path
    const path: SunburstNode[] = [];
    let current: ArcData | undefined = arc;
    while (current) {
      path.unshift(current);
      current = current.parent;
    }
    
    onNodeClick?.(arc, path);
  };

  const handleReset = () => {
    setFocusedNode(null);
  };

  return (
    <div className={cn('sunburst relative', className)}>
      {/* Reset button */}
      {focusedNode && (
        <button
          onClick={handleReset}
          className="absolute top-2 left-2 px-2 py-1 text-xs bg-background border rounded hover:bg-accent"
        >
          ← Voltar
        </button>
      )}

      <svg width={width} height={height}>
        {/* Center circle */}
        <circle
          cx={cx}
          cy={cy}
          r={innerRadius - 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          className="text-border"
        />

        {/* Arcs */}
        {arcs.filter(arc => arc.depth > 0 || arcs.length === 1).map((arc, index) => {
          const angleDiff = arc.endAngle - arc.startAngle;
          if (angleDiff < 0.5) return null; // Skip very small arcs

          const color = getColor(arc);
          const isHovered = hoveredArc === arc.id;
          const midAngle = (arc.startAngle + arc.endAngle) / 2;
          const midRad = (midAngle - 90) * Math.PI / 180;
          const labelRadius = (arc.innerRadius + arc.outerRadius) / 2;
          const labelX = cx + labelRadius * Math.cos(midRad);
          const labelY = cy + labelRadius * Math.sin(midRad);

          return (
            <g key={arc.id || index}>
              <path
                d={describeArc(cx, cy, arc.innerRadius, arc.outerRadius, arc.startAngle, arc.endAngle)}
                fill={color}
                stroke="white"
                strokeWidth={1}
                className={cn(
                  'cursor-pointer transition-all',
                  isHovered && 'brightness-110'
                )}
                style={{
                  opacity: isHovered ? 1 : 0.85,
                }}
                onClick={() => handleClick(arc)}
                onMouseEnter={() => setHoveredArc(arc.id)}
                onMouseLeave={() => setHoveredArc(null)}
              />

              {/* Label */}
              {showLabels && angleDiff > 15 && arc.outerRadius - arc.innerRadius > 25 && (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-white pointer-events-none font-medium"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  transform={`rotate(${midAngle > 90 && midAngle < 270 ? midAngle + 180 : midAngle}, ${labelX}, ${labelY})`}
                >
                  {arc.name.length > 10 ? arc.name.slice(0, 8) + '...' : arc.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Center label */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-medium fill-foreground"
        >
          {focusedNode?.name || data.name}
        </text>
      </svg>

      {/* Tooltip */}
      {showTooltip && hoveredArc && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 bg-popover text-popover-foreground rounded-lg shadow-lg text-sm">
          {(() => {
            const arc = arcs.find(a => a.id === hoveredArc);
            if (!arc) return null;
            return (
              <>
                <div className="font-medium">{arc.name}</div>
                <div className="text-muted-foreground">{arc.value?.toLocaleString()}</div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Sunburst;
