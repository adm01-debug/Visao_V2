/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useHeatmap
 * 
 * Mapa de calor de movimento (usando dados locais, sem tabela heatmap_data)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================
// TIPOS
// ============================================

export interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
  timestamp?: Date;
}

export interface HeatmapData {
  cameraId: string;
  width: number;
  height: number;
  gridSize: number;
  points: HeatmapPoint[];
  grid: number[][];
  maxValue: number;
  totalDetections: number;
  startTime: Date;
  endTime: Date;
}

export interface HeatmapConfig {
  gridSize: number;
  decayRate: number;
  minValue: number;
  maxAge: number;
  colorScheme: 'thermal' | 'rainbow' | 'grayscale';
  opacity: number;
  blur: number;
  showGrid: boolean;
  realtime: boolean;
}

export interface HeatmapStats {
  totalPoints: number;
  hotspots: { x: number; y: number; value: number }[];
  coldspots: { x: number; y: number; value: number }[];
  averageActivity: number;
  peakActivity: number;
  peakTime?: Date;
}

export type TimeRange = '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | 'custom';

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_CONFIG: HeatmapConfig = {
  gridSize: 20,
  decayRate: 0.01,
  minValue: 0.1,
  maxAge: 3600000,
  colorScheme: 'thermal',
  opacity: 0.7,
  blur: 15,
  showGrid: false,
  realtime: true,
};

const COLOR_SCHEMES = {
  thermal: [
    { stop: 0.0, color: 'rgba(0, 0, 255, 0)' },
    { stop: 0.2, color: 'rgba(0, 0, 255, 0.5)' },
    { stop: 0.4, color: 'rgba(0, 255, 255, 0.7)' },
    { stop: 0.6, color: 'rgba(0, 255, 0, 0.8)' },
    { stop: 0.8, color: 'rgba(255, 255, 0, 0.9)' },
    { stop: 1.0, color: 'rgba(255, 0, 0, 1)' },
  ],
  rainbow: [
    { stop: 0.0, color: 'rgba(128, 0, 255, 0)' },
    { stop: 0.2, color: 'rgba(0, 0, 255, 0.6)' },
    { stop: 0.4, color: 'rgba(0, 255, 0, 0.7)' },
    { stop: 0.6, color: 'rgba(255, 255, 0, 0.8)' },
    { stop: 0.8, color: 'rgba(255, 128, 0, 0.9)' },
    { stop: 1.0, color: 'rgba(255, 0, 0, 1)' },
  ],
  grayscale: [
    { stop: 0.0, color: 'rgba(255, 255, 255, 0)' },
    { stop: 0.5, color: 'rgba(128, 128, 128, 0.5)' },
    { stop: 1.0, color: 'rgba(0, 0, 0, 1)' },
  ],
};

// ============================================
// HOOK PRINCIPAL
// ============================================

interface UseHeatmapOptions {
  cameraId: string;
  width: number;
  height: number;
  config?: Partial<HeatmapConfig>;
  onHotspotDetected?: (hotspot: { x: number; y: number; value: number }) => void;
}

interface UseHeatmapReturn {
  heatmapData: HeatmapData | null;
  stats: HeatmapStats;
  isRecording: boolean;
  addPoint: (x: number, y: number, value?: number) => void;
  addPoints: (points: { x: number; y: number; value?: number }[]) => void;
  addDetection: (bbox: [number, number, number, number]) => void;
  start: () => void;
  stop: () => void;
  clear: () => void;
  loadHistory: (timeRange: TimeRange, customRange?: { from: Date; to: Date }) => Promise<void>;
  saveSnapshot: () => Promise<string | null>;
  renderToCanvas: (canvas: HTMLCanvasElement) => void;
  getImageData: () => string | null;
  config: HeatmapConfig;
  updateConfig: (updates: Partial<HeatmapConfig>) => void;
}

export function useHeatmap(options: UseHeatmapOptions): UseHeatmapReturn {
  const {
    cameraId,
    width,
    height,
    config: initialConfig,
    onHotspotDetected,
  } = options;

  const [config, setConfig] = useState<HeatmapConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [points, setPoints] = useState<HeatmapPoint[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const decayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const gridCols = Math.ceil(width / config.gridSize);
  const gridRows = Math.ceil(height / config.gridSize);

  const createEmptyGrid = useCallback((): number[][] => {
    return Array(gridRows).fill(null).map(() => Array(gridCols).fill(0));
  }, [gridRows, gridCols]);

  const pointsToGrid = useCallback((pts: HeatmapPoint[]): number[][] => {
    const grid = createEmptyGrid();
    
    pts.forEach(point => {
      const col = Math.floor(point.x / config.gridSize);
      const row = Math.floor(point.y / config.gridSize);
      
      if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
        grid[row][col] += point.value;
      }
    });

    return grid;
  }, [config.gridSize, gridRows, gridCols, createEmptyGrid]);

  const heatmapData = useMemo((): HeatmapData | null => {
    if (points.length === 0) return null;

    const grid = pointsToGrid(points);
    const maxValue = Math.max(...grid.flat());

    return {
      cameraId,
      width,
      height,
      gridSize: config.gridSize,
      points,
      grid,
      maxValue: maxValue || 1,
      totalDetections: points.length,
      startTime: points[0]?.timestamp || new Date(),
      endTime: points[points.length - 1]?.timestamp || new Date(),
    };
  }, [points, cameraId, width, height, config.gridSize, pointsToGrid]);

  const stats = useMemo((): HeatmapStats => {
    if (!heatmapData) {
      return {
        totalPoints: 0,
        hotspots: [],
        coldspots: [],
        averageActivity: 0,
        peakActivity: 0,
      };
    }

    const cells: { x: number; y: number; value: number }[] = [];
    
    heatmapData.grid.forEach((row, rowIdx) => {
      row.forEach((value, colIdx) => {
        if (value > 0) {
          cells.push({
            x: colIdx * config.gridSize + config.gridSize / 2,
            y: rowIdx * config.gridSize + config.gridSize / 2,
            value,
          });
        }
      });
    });

    const sortedCells = [...cells].sort((a, b) => b.value - a.value);
    const hotspots = sortedCells.slice(0, 5);
    const coldspots = sortedCells.slice(-5).reverse();

    const totalActivity = cells.reduce((sum, c) => sum + c.value, 0);
    const averageActivity = cells.length > 0 ? totalActivity / cells.length : 0;

    let peakActivity = 0;
    let peakTime: Date | undefined;
    
    const timeGroups = new Map<number, number>();
    points.forEach(p => {
      if (p.timestamp) {
        const minute = Math.floor(p.timestamp.getTime() / 60000);
        timeGroups.set(minute, (timeGroups.get(minute) || 0) + p.value);
      }
    });

    timeGroups.forEach((value, minute) => {
      if (value > peakActivity) {
        peakActivity = value;
        peakTime = new Date(minute * 60000);
      }
    });

    return {
      totalPoints: points.length,
      hotspots,
      coldspots,
      averageActivity,
      peakActivity,
      peakTime,
    };
  }, [heatmapData, points, config.gridSize]);

  const addPoint = useCallback((x: number, y: number, value: number = 1) => {
    const point: HeatmapPoint = {
      x,
      y,
      value,
      timestamp: new Date(),
    };

    setPoints(prev => [...prev, point]);

    if (onHotspotDetected && heatmapData) {
      const col = Math.floor(x / config.gridSize);
      const row = Math.floor(y / config.gridSize);
      
      if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
        const cellValue = heatmapData.grid[row]?.[col] || 0;
        if (cellValue > heatmapData.maxValue * 0.8) {
          onHotspotDetected({
            x: col * config.gridSize + config.gridSize / 2,
            y: row * config.gridSize + config.gridSize / 2,
            value: cellValue,
          });
        }
      }
    }
  }, [config.gridSize, gridRows, gridCols, heatmapData, onHotspotDetected]);

  const addPoints = useCallback((newPoints: { x: number; y: number; value?: number }[]) => {
    const now = new Date();
    const heatmapPoints: HeatmapPoint[] = newPoints.map(p => ({
      x: p.x,
      y: p.y,
      value: p.value || 1,
      timestamp: now,
    }));

    setPoints(prev => [...prev, ...heatmapPoints]);
  }, []);

  const addDetection = useCallback((bbox: [number, number, number, number]) => {
    const [x, y, w, h] = bbox;
    addPoint(x + w / 2, y + h / 2, 1);
    addPoint(x + w / 2, y + h, 0.5);
  }, [addPoint]);

  useEffect(() => {
    if (!config.realtime || !isRecording) return;

    decayIntervalRef.current = setInterval(() => {
      const now = Date.now();
      
      setPoints(prev => {
        const filtered = prev.filter(p => {
          if (!p.timestamp) return true;
          return now - p.timestamp.getTime() < config.maxAge;
        });

        return filtered.map(p => ({
          ...p,
          value: Math.max(0, p.value - config.decayRate),
        })).filter(p => p.value >= config.minValue);
      });
    }, 1000);

    return () => {
      if (decayIntervalRef.current) {
        clearInterval(decayIntervalRef.current);
      }
    };
  }, [config.realtime, config.maxAge, config.decayRate, config.minValue, isRecording]);

  const start = useCallback(() => {
    setIsRecording(true);
  }, []);

  const stop = useCallback(() => {
    setIsRecording(false);
  }, []);

  const clear = useCallback(() => {
    setPoints([]);
  }, []);

  // Carregar histórico (dados simulados localmente)
  const loadHistory = useCallback(async (
    _timeRange: TimeRange,
    _customRange?: { from: Date; to: Date }
  ) => {
    // Simular dados históricos
    const simulatedPoints: HeatmapPoint[] = [];
    const now = Date.now();
    
    for (let i = 0; i < 100; i++) {
      simulatedPoints.push({
        x: Math.random() * width,
        y: Math.random() * height,
        value: Math.random() * 2,
        timestamp: new Date(now - Math.random() * 3600000),
      });
    }
    
    setPoints(simulatedPoints);
  }, [width, height]);

  // Salvar snapshot (retorna imagem base64)
  const saveSnapshot = useCallback(async (): Promise<string | null> => {
    return getImageData();
  }, []);

  const getImageData = useCallback((): string | null => {
    if (!canvasRef.current) return null;
    return canvasRef.current.toDataURL('image/png');
  }, []);

  const renderToCanvas = useCallback((canvas: HTMLCanvasElement) => {
    if (!heatmapData) return;
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const colors = COLOR_SCHEMES[config.colorScheme];

    heatmapData.grid.forEach((row, rowIdx) => {
      row.forEach((value, colIdx) => {
        if (value < config.minValue) return;

        const normalizedValue = value / heatmapData.maxValue;
        const x = colIdx * config.gridSize + config.gridSize / 2;
        const y = rowIdx * config.gridSize + config.gridSize / 2;
        const radius = config.gridSize * Math.min(normalizedValue + 0.3, 1);

        ctx.save();
        ctx.translate(x, y);

        const cellGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        
        colors.forEach((c, i) => {
          if (i === 0) {
            cellGradient.addColorStop(c.stop, c.color.replace(/[\d.]+\)$/, `${normalizedValue * config.opacity})`));
          } else {
            cellGradient.addColorStop(c.stop, c.color);
          }
        });

        ctx.globalAlpha = normalizedValue * config.opacity;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = cellGradient;
        ctx.fill();
        ctx.restore();
      });
    });

    if (config.blur > 0) {
      ctx.filter = `blur(${config.blur}px)`;
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    }

    if (config.showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      for (let x = 0; x <= width; x += config.gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y <= height; y += config.gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
  }, [heatmapData, width, height, config]);

  const updateConfig = useCallback((updates: Partial<HeatmapConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    heatmapData,
    stats,
    isRecording,
    addPoint,
    addPoints,
    addDetection,
    start,
    stop,
    clear,
    loadHistory,
    saveSnapshot,
    renderToCanvas,
    getImageData,
    config,
    updateConfig,
  };
}

export default useHeatmap;
