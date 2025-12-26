/**
 * Treemap Component
 * Hierarchical data visualization with nested rectangles
 */

import React, { useMemo, useState } from 'react';
import { cn } from '@/utils/cn';

export interface TreemapNode {
  id: string;
  name: string;
  value: number;
  color?: string;
  children?: TreemapNode[];
  data?: Record<string, unknown>;
}

export interface TreemapProps {
  data: TreemapNode;
  width?: number;
  height?: number;
  padding?: number;
  colorScale?: string[];
  showLabels?: boolean;
  showValues?: boolean;
  onNodeClick?: (node: TreemapNode, path: TreemapNode[]) => void;
  onNodeHover?: (node: TreemapNode | null) => void;
  formatValue?: (value: number) => string;
  className?: string;
}

interface LayoutNode extends TreemapNode {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// Squarified treemap layout algorithm
function squarify(
  nodes: TreemapNode[],
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number
): LayoutNode[] {
  if (nodes.length === 0) return [];

  const total = nodes.reduce((sum, n) => sum + n.value, 0);
  if (total === 0) return [];

  const result: LayoutNode[] = [];
  let currentX = x;
  let currentY = y;
  let remainingWidth = width;
  let remainingHeight = height;

  // Sort by value descending
  const sortedNodes = [...nodes].sort((a, b) => b.value - a.value);

  sortedNodes.forEach((node, index) => {
    const ratio = node.value / total;
    const isHorizontal = remainingWidth >= remainingHeight;

    let nodeWidth: number;
    let nodeHeight: number;

    if (isHorizontal) {
      nodeWidth = remainingWidth * ratio;
      nodeHeight = remainingHeight;
    } else {
      nodeWidth = remainingWidth;
      nodeHeight = remainingHeight * ratio;
    }

    result.push({
      ...node,
      x: currentX,
      y: currentY,
      width: Math.max(nodeWidth, 1),
      height: Math.max(nodeHeight, 1),
      depth,
    });

    if (isHorizontal) {
      currentX += nodeWidth;
      remainingWidth -= nodeWidth;
    } else {
      currentY += nodeHeight;
      remainingHeight -= nodeHeight;
    }
  });

  return result;
}

const TreemapRect: React.FC<{
  node: LayoutNode;
  colorIndex: number;
  colorScale: string[];
  showLabels: boolean;
  showValues: boolean;
  formatValue: (value: number) => string;
  onNodeClick?: (node: TreemapNode) => void;
  onNodeHover?: (node: TreemapNode | null) => void;
  isHovered: boolean;
}> = ({
  node,
  colorIndex,
  colorScale,
  showLabels,
  showValues,
  formatValue,
  onNodeClick,
  onNodeHover,
  isHovered,
}) => {
  const color = node.color || colorScale[colorIndex % colorScale.length];
  const minSize = 30;
  const canShowLabel = node.width > minSize && node.height > 20;
  const canShowValue = node.width > 50 && node.height > 35;

  return (
    <g
      className={cn(
        'cursor-pointer transition-opacity',
        isHovered && 'opacity-80'
      )}
      onClick={() => onNodeClick?.(node)}
      onMouseEnter={() => onNodeHover?.(node)}
      onMouseLeave={() => onNodeHover?.(null)}
    >
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        fill={color}
        stroke="white"
        strokeWidth={1}
        className="transition-all hover:brightness-110"
      />
      
      {showLabels && canShowLabel && (
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height / 2 - (canShowValue ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-medium fill-white pointer-events-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {node.name.length > 15 ? node.name.slice(0, 12) + '...' : node.name}
        </text>
      )}

      {showValues && canShowValue && (
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs fill-white/80 pointer-events-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {formatValue(node.value)}
        </text>
      )}
    </g>
  );
};

export const Treemap: React.FC<TreemapProps> = ({
  data,
  width = 600,
  height = 400,
  padding = 2,
  colorScale = COLORS,
  showLabels = true,
  showValues = true,
  onNodeClick,
  onNodeHover,
  formatValue = (v) => v.toLocaleString(),
  className,
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [path, setPath] = useState<TreemapNode[]>([]);

  const layoutNodes = useMemo(() => {
    const nodes = data.children || [data];
    return squarify(nodes, padding, padding, width - padding * 2, height - padding * 2, 0);
  }, [data, width, height, padding]);

  const handleNodeClick = (node: TreemapNode) => {
    if (node.children && node.children.length > 0) {
      setPath([...path, node]);
    }
    onNodeClick?.(node, [...path, node]);
  };

  const handleNodeHover = (node: TreemapNode | null) => {
    setHoveredNode(node?.id || null);
    onNodeHover?.(node);
  };

  const handleBreadcrumbClick = (index: number) => {
    setPath(path.slice(0, index));
  };

  const currentData = path.length > 0 ? path[path.length - 1] : data;
  const currentLayout = useMemo(() => {
    const nodes = currentData.children || [currentData];
    return squarify(nodes, padding, padding, width - padding * 2, height - padding * 2, 0);
  }, [currentData, width, height, padding]);

  return (
    <div className={cn('treemap', className)}>
      {/* Breadcrumb */}
      {path.length > 0 && (
        <div className="flex items-center gap-2 mb-2 text-sm">
          <button
            onClick={() => setPath([])}
            className="text-primary hover:underline"
          >
            {data.name}
          </button>
          {path.map((node, index) => (
            <React.Fragment key={node.id}>
              <span className="text-muted-foreground">/</span>
              <button
                onClick={() => handleBreadcrumbClick(index + 1)}
                className="text-primary hover:underline"
              >
                {node.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      <svg width={width} height={height} className="overflow-visible">
        {currentLayout.map((node, index) => (
          <TreemapRect
            key={node.id}
            node={node}
            colorIndex={index}
            colorScale={colorScale}
            showLabels={showLabels}
            showValues={showValues}
            formatValue={formatValue}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            isHovered={hoveredNode === node.id}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredNode && (
        <div className="fixed z-50 p-2 bg-popover text-popover-foreground rounded-lg shadow-lg text-sm pointer-events-none">
          {(() => {
            const node = currentLayout.find(n => n.id === hoveredNode);
            if (!node) return null;
            return (
              <>
                <div className="font-medium">{node.name}</div>
                <div className="text-muted-foreground">{formatValue(node.value)}</div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Treemap;
