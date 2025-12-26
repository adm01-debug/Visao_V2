/**
 * Sankey Diagram Component
 * Flow visualization for data relationships
 */

import React, { useMemo } from 'react';
import { cn } from '@/utils/cn';

export interface SankeyNode {
  id: string;
  label: string;
  color?: string;
  value?: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color?: string;
}

export interface SankeyProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
  nodeWidth?: number;
  nodePadding?: number;
  linkOpacity?: number;
  showLabels?: boolean;
  showValues?: boolean;
  onNodeClick?: (node: SankeyNode) => void;
  onLinkClick?: (link: SankeyLink) => void;
  className?: string;
}

interface ComputedNode extends SankeyNode {
  x: number;
  y: number;
  height: number;
  layer: number;
  sourceLinks: ComputedLink[];
  targetLinks: ComputedLink[];
}

interface ComputedLink extends SankeyLink {
  sourceNode: ComputedNode;
  targetNode: ComputedNode;
  width: number;
  y0: number;
  y1: number;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export const Sankey: React.FC<SankeyProps> = ({
  nodes,
  links,
  width = 800,
  height = 400,
  nodeWidth = 20,
  nodePadding = 10,
  linkOpacity = 0.5,
  showLabels = true,
  showValues = true,
  onNodeClick,
  onLinkClick,
  className,
}) => {
  // Compute layout
  const { computedNodes, computedLinks } = useMemo(() => {
    // Group nodes into layers
    const nodeMap = new Map<string, ComputedNode>();
    nodes.forEach((node, index) => {
      nodeMap.set(node.id, {
        ...node,
        x: 0,
        y: 0,
        height: 0,
        layer: 0,
        color: node.color || COLORS[index % COLORS.length],
        sourceLinks: [],
        targetLinks: [],
      });
    });

    // Build adjacency and compute layers
    const sourceNodes = new Set(links.map(l => l.source));
    const targetNodes = new Set(links.map(l => l.target));
    
    // Nodes that are only sources (leftmost)
    const startNodes = nodes.filter(n => sourceNodes.has(n.id) && !targetNodes.has(n.id));
    // Nodes that are only targets (rightmost)
    const endNodes = nodes.filter(n => targetNodes.has(n.id) && !sourceNodes.has(n.id));
    // Middle nodes
    const middleNodes = nodes.filter(n => sourceNodes.has(n.id) && targetNodes.has(n.id));

    // Assign layers
    startNodes.forEach(n => {
      const node = nodeMap.get(n.id)!;
      node.layer = 0;
    });

    middleNodes.forEach(n => {
      const node = nodeMap.get(n.id)!;
      node.layer = 1;
    });

    endNodes.forEach(n => {
      const node = nodeMap.get(n.id)!;
      node.layer = 2;
    });

    const maxLayer = Math.max(...Array.from(nodeMap.values()).map(n => n.layer));
    const layerWidth = (width - nodeWidth) / (maxLayer || 1);

    // Group nodes by layer
    const layers: ComputedNode[][] = [];
    for (let i = 0; i <= maxLayer; i++) {
      layers.push(Array.from(nodeMap.values()).filter(n => n.layer === i));
    }

    // Compute node values based on links
    nodeMap.forEach(node => {
      const incoming = links.filter(l => l.target === node.id).reduce((sum, l) => sum + l.value, 0);
      const outgoing = links.filter(l => l.source === node.id).reduce((sum, l) => sum + l.value, 0);
      node.value = Math.max(incoming, outgoing, node.value || 0);
    });

    // Calculate total value per layer for scaling
    const layerTotals = layers.map(layer => 
      layer.reduce((sum, node) => sum + (node.value || 0), 0)
    );
    const maxTotal = Math.max(...layerTotals);

    // Position nodes
    layers.forEach((layer, layerIndex) => {
      const x = layerIndex * layerWidth;
      const availableHeight = height - (layer.length - 1) * nodePadding;
      
      let currentY = 0;
      layer.forEach(node => {
        node.x = x;
        node.height = maxTotal > 0 ? ((node.value || 0) / maxTotal) * availableHeight : 20;
        node.height = Math.max(node.height, 10); // Minimum height
        node.y = currentY;
        currentY += node.height + nodePadding;
      });

      // Center vertically
      const totalHeight = currentY - nodePadding;
      const offset = (height - totalHeight) / 2;
      layer.forEach(node => {
        node.y += offset;
      });
    });

    // Compute links
    const computedLinksList: ComputedLink[] = links.map((link, index) => {
      const sourceNode = nodeMap.get(link.source)!;
      const targetNode = nodeMap.get(link.target)!;
      
      // Calculate link width proportional to value
      const sourceTotal = links.filter(l => l.source === link.source).reduce((sum, l) => sum + l.value, 0);
      const targetTotal = links.filter(l => l.target === link.target).reduce((sum, l) => sum + l.value, 0);
      
      const sourceRatio = sourceTotal > 0 ? link.value / sourceTotal : 1;
      const targetRatio = targetTotal > 0 ? link.value / targetTotal : 1;
      
      const linkWidth = Math.min(sourceNode.height * sourceRatio, targetNode.height * targetRatio);

      // Calculate y positions
      const prevSourceLinks = links.filter(l => l.source === link.source).slice(0, index);
      const prevTargetLinks = links.filter(l => l.target === link.target).slice(0, index);
      
      const sourceOffset = prevSourceLinks.reduce((sum, l) => {
        const ratio = sourceTotal > 0 ? l.value / sourceTotal : 0;
        return sum + sourceNode.height * ratio;
      }, 0);
      
      const targetOffset = prevTargetLinks.reduce((sum, l) => {
        const ratio = targetTotal > 0 ? l.value / targetTotal : 0;
        return sum + targetNode.height * ratio;
      }, 0);

      return {
        ...link,
        sourceNode,
        targetNode,
        width: linkWidth,
        y0: sourceNode.y + sourceOffset,
        y1: targetNode.y + targetOffset,
        color: link.color || sourceNode.color,
      };
    });

    return {
      computedNodes: Array.from(nodeMap.values()),
      computedLinks: computedLinksList,
    };
  }, [nodes, links, width, height, nodeWidth, nodePadding]);

  // Generate link path
  const getLinkPath = (link: ComputedLink) => {
    const x0 = link.sourceNode.x + nodeWidth;
    const x1 = link.targetNode.x;
    const y0 = link.y0;
    const y1 = link.y1;
    const curvature = 0.5;
    
    const xi = (x0 + x1) / 2;
    
    return `
      M${x0},${y0}
      C${xi},${y0} ${xi},${y1} ${x1},${y1}
      L${x1},${y1 + link.width}
      C${xi},${y1 + link.width} ${xi},${y0 + link.width} ${x0},${y0 + link.width}
      Z
    `;
  };

  return (
    <div className={cn('sankey-diagram', className)}>
      <svg width={width} height={height} className="overflow-visible">
        {/* Links */}
        <g className="links">
          {computedLinks.map((link, index) => (
            <path
              key={`${link.source}-${link.target}-${index}`}
              d={getLinkPath(link)}
              fill={link.color}
              fillOpacity={linkOpacity}
              className={cn(
                'transition-opacity',
                onLinkClick && 'cursor-pointer hover:opacity-80'
              )}
              onClick={() => onLinkClick?.(link)}
            >
              <title>
                {link.sourceNode.label} → {link.targetNode.label}: {link.value}
              </title>
            </path>
          ))}
        </g>

        {/* Nodes */}
        <g className="nodes">
          {computedNodes.map(node => (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={nodeWidth}
                height={node.height}
                fill={node.color}
                className={cn(
                  'transition-opacity',
                  onNodeClick && 'cursor-pointer hover:opacity-80'
                )}
                onClick={() => onNodeClick?.(node)}
              >
                <title>{node.label}: {node.value}</title>
              </rect>

              {/* Label */}
              {showLabels && (
                <text
                  x={node.layer === 0 ? node.x - 5 : node.x + nodeWidth + 5}
                  y={node.y + node.height / 2}
                  dy="0.35em"
                  textAnchor={node.layer === 0 ? 'end' : 'start'}
                  className="text-xs fill-foreground"
                >
                  {node.label}
                  {showValues && ` (${node.value})`}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default Sankey;
