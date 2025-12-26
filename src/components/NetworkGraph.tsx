/**
 * Network Graph Component
 * Interactive force-directed graph visualization
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/utils/cn';

export interface GraphNode {
  id: string;
  label: string;
  group?: string;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  data?: Record<string, unknown>;
}

export interface GraphLink {
  source: string;
  target: string;
  value?: number;
  color?: string;
  label?: string;
}

export interface NetworkGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  nodeRadius?: number;
  linkDistance?: number;
  chargeStrength?: number;
  showLabels?: boolean;
  showLinkLabels?: boolean;
  zoomable?: boolean;
  draggable?: boolean;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  onLinkClick?: (link: GraphLink) => void;
  className?: string;
  colorScale?: string[];
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

interface SimNode extends GraphNode {
  vx: number;
  vy: number;
}

interface SimLink extends GraphLink {
  sourceNode: SimNode;
  targetNode: SimNode;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  links,
  width = 800,
  height = 600,
  nodeRadius = 20,
  linkDistance = 100,
  chargeStrength = -300,
  showLabels = true,
  showLinkLabels = false,
  zoomable = true,
  draggable = true,
  onNodeClick,
  onNodeHover,
  onLinkClick,
  className,
  colorScale = COLORS,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState({ x: 0, y: 0, k: 1 });
  const animationRef = useRef<number>();

  // Initialize simulation
  useEffect(() => {
    const nodeMap = new Map<string, SimNode>();
    
    // Create nodes with initial positions
    const initialNodes: SimNode[] = nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const radius = Math.min(width, height) / 4;
      const simNode: SimNode = {
        ...node,
        x: node.x ?? width / 2 + radius * Math.cos(angle),
        y: node.y ?? height / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      };
      nodeMap.set(node.id, simNode);
      return simNode;
    });

    // Create links with node references
    const initialLinks: SimLink[] = links.map(link => ({
      ...link,
      sourceNode: nodeMap.get(link.source)!,
      targetNode: nodeMap.get(link.target)!,
    })).filter(link => link.sourceNode && link.targetNode);

    setSimNodes(initialNodes);
    setSimLinks(initialLinks);
  }, [nodes, links, width, height]);

  // Simple force simulation
  useEffect(() => {
    if (simNodes.length === 0) return;

    const simulate = () => {
      const alpha = 0.1;
      const alphaDecay = 0.99;

      setSimNodes(prevNodes => {
        const newNodes = prevNodes.map(node => ({ ...node }));
        const nodeMap = new Map(newNodes.map(n => [n.id, n]));

        // Apply forces
        newNodes.forEach(node => {
          if (node.fx !== undefined && node.fx !== null) {
            node.x = node.fx;
            node.vx = 0;
          }
          if (node.fy !== undefined && node.fy !== null) {
            node.y = node.fy;
            node.vy = 0;
          }

          // Charge force (repulsion between all nodes)
          newNodes.forEach(other => {
            if (node.id === other.id) return;
            const dx = (node.x || 0) - (other.x || 0);
            const dy = (node.y || 0) - (other.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = chargeStrength / (dist * dist);
            node.vx += (dx / dist) * force * alpha;
            node.vy += (dy / dist) * force * alpha;
          });

          // Center force
          const cx = width / 2;
          const cy = height / 2;
          node.vx += (cx - (node.x || 0)) * 0.01 * alpha;
          node.vy += (cy - (node.y || 0)) * 0.01 * alpha;
        });

        // Link force
        simLinks.forEach(link => {
          const source = nodeMap.get(link.source);
          const target = nodeMap.get(link.target);
          if (!source || !target) return;

          const dx = (target.x || 0) - (source.x || 0);
          const dy = (target.y || 0) - (source.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - linkDistance) * 0.1 * alpha;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        });

        // Apply velocity
        newNodes.forEach(node => {
          if (node.fx === undefined || node.fx === null) {
            node.vx *= 0.9;
            node.x = (node.x || 0) + node.vx;
          }
          if (node.fy === undefined || node.fy === null) {
            node.vy *= 0.9;
            node.y = (node.y || 0) + node.vy;
          }

          // Boundary
          node.x = Math.max(nodeRadius, Math.min(width - nodeRadius, node.x || 0));
          node.y = Math.max(nodeRadius, Math.min(height - nodeRadius, node.y || 0));
        });

        return newNodes;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [simNodes.length, simLinks, width, height, linkDistance, chargeStrength, nodeRadius]);

  const getNodeColor = useCallback((node: GraphNode, index: number) => {
    if (node.color) return node.color;
    if (node.group) {
      const groups = [...new Set(nodes.map(n => n.group))];
      const groupIndex = groups.indexOf(node.group);
      return colorScale[groupIndex % colorScale.length];
    }
    return colorScale[index % colorScale.length];
  }, [nodes, colorScale]);

  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (!draggable) return;
    e.preventDefault();
    setDraggedNode(nodeId);

    setSimNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, fx: n.x, fy: n.y } : n
    ));
  }, [draggable]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedNode || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - zoom.x) / zoom.k;
    const y = (e.clientY - rect.top - zoom.y) / zoom.k;

    setSimNodes(prev => prev.map(n => 
      n.id === draggedNode ? { ...n, fx: x, fy: y, x, y } : n
    ));
  }, [draggedNode, zoom]);

  const handleMouseUp = useCallback(() => {
    if (draggedNode) {
      setSimNodes(prev => prev.map(n => 
        n.id === draggedNode ? { ...n, fx: null, fy: null } : n
      ));
      setDraggedNode(null);
    }
  }, [draggedNode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!zoomable) return;
    e.preventDefault();

    const delta = -e.deltaY * 0.001;
    const newK = Math.max(0.5, Math.min(3, zoom.k * (1 + delta)));

    setZoom(prev => ({
      ...prev,
      k: newK,
    }));
  }, [zoomable, zoom.k]);

  return (
    <div className={cn('network-graph', className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${zoom.x}, ${zoom.y}) scale(${zoom.k})`}>
          {/* Links */}
          <g className="links">
            {simLinks.map((link, index) => {
              const source = simNodes.find(n => n.id === link.source);
              const target = simNodes.find(n => n.id === link.target);
              if (!source || !target) return null;

              return (
                <g key={`${link.source}-${link.target}-${index}`}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={link.color || '#94a3b8'}
                    strokeWidth={link.value ? Math.max(1, link.value / 2) : 1}
                    strokeOpacity={0.6}
                    className={cn(
                      onLinkClick && 'cursor-pointer hover:stroke-primary'
                    )}
                    onClick={() => onLinkClick?.(link)}
                  />
                  {showLinkLabels && link.label && (
                    <text
                      x={((source.x || 0) + (target.x || 0)) / 2}
                      y={((source.y || 0) + (target.y || 0)) / 2}
                      textAnchor="middle"
                      className="text-xs fill-muted-foreground"
                    >
                      {link.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {simNodes.map((node, index) => (
              <g
                key={node.id}
                transform={`translate(${node.x || 0}, ${node.y || 0})`}
                className={cn(
                  'cursor-pointer transition-transform',
                  hoveredNode === node.id && 'scale-110'
                )}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                onMouseEnter={() => {
                  setHoveredNode(node.id);
                  onNodeHover?.(node);
                }}
                onMouseLeave={() => {
                  setHoveredNode(null);
                  onNodeHover?.(null);
                }}
                onClick={() => onNodeClick?.(node)}
              >
                <circle
                  r={node.size || nodeRadius}
                  fill={getNodeColor(node, index)}
                  stroke="white"
                  strokeWidth={2}
                  className="drop-shadow-md"
                />
                {showLabels && (
                  <text
                    y={-(node.size || nodeRadius) - 5}
                    textAnchor="middle"
                    className="text-xs font-medium fill-foreground pointer-events-none"
                  >
                    {node.label}
                  </text>
                )}
              </g>
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
};

export default NetworkGraph;
