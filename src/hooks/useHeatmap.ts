/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useHeatmap
 * 
 * Mapa de calor de movimento:
 * - Acumulação de detecções de pessoas
 * - Visualização de zonas quentes/frias
 * - Histórico temporal
 * - Exportação de dados
 * - Integração com analytics
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  gridSize: number;        // Tamanho da célula (ex: 20px)
  decayRate: number;       // Taxa de decaimento (0-1)
  minValue: number;        // Valor mínimo para exibir
  maxAge: number;          // Idade máxima dos pontos (ms)
  colorScheme: 'thermal' | 'rainbow' | 'grayscale';
  opacity: number;         // Opacidade do overlay (0-1)
  blur: number;            // Blur do heatmap (px)
  showGrid: boolean;       // Mostrar grid
  realtime: boolean;       // Modo tempo real
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
  maxAge: 3600000, // 1 hora
  colorScheme: 'thermal',
  opacity: 0.7,
  blur: 15,
  showGrid: false,
  realtime: true,
};

// Esquemas de cores
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
  // Estado
  heatmapData: HeatmapData | null;
  stats: HeatmapStats;
  isRecording: boolean;
  
  // Adicionar pontos
  addPoint: (x: number, y: number, value?: number) => void;
  addPoints: (points: { x: number; y: number; value?: number }[]) => void;
  addDetection: (bbox: [number, number, number, number]) => void;
  
  // Controles
  start: () => void;
  stop: () => void;
  clear: () => void;
  
  // Histórico
  loadHistory: (timeRange: TimeRange, customRange?: { from: Date; to: Date }) => Promise<void>;
  saveSnapshot: () => Promise<string | null>;
  
  // Renderização
  renderToCanvas: (canvas: HTMLCanvasElement) => void;
  getImageData: () => string | null;
  
  // Config
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

  // Calcular dimensões do grid
  const gridCols = Math.ceil(width / config.gridSize);
  const gridRows = Math.ceil(height / config.gridSize);

  // Criar grid vazio
  const createEmptyGrid = useCallback((): number[][] => {
    return Array(gridRows).fill(null).map(() => Array(gridCols).fill(0));
  }, [gridRows, gridCols]);

  // Converter pontos para grid
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

  // Calcular dados do heatmap
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

  // Calcular estatísticas
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

    // Encontrar pico de atividade
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

  // Adicionar ponto
  const addPoint = useCallback((x: number, y: number, value: number = 1) => {
    const point: HeatmapPoint = {
      x,
      y,
      value,
      timestamp: new Date(),
    };

    setPoints(prev => [...prev, point]);

    // Verificar hotspot
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

  // Adicionar múltiplos pontos
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

  // Adicionar detecção (bounding box)
  const addDetection = useCallback((bbox: [number, number, number, number]) => {
    const [x, y, w, h] = bbox;
    // Adicionar ponto no centro da detecção
    addPoint(x + w / 2, y + h / 2, 1);
    // Também adicionar nos pés (parte inferior)
    addPoint(x + w / 2, y + h, 0.5);
  }, [addPoint]);

  // Aplicar decaimento
  useEffect(() => {
    if (!config.realtime || !isRecording) return;

    decayIntervalRef.current = setInterval(() => {
      const now = Date.now();
      
      setPoints(prev => {
        // Remover pontos muito antigos
        const filtered = prev.filter(p => {
          if (!p.timestamp) return true;
          return now - p.timestamp.getTime() < config.maxAge;
        });

        // Aplicar decaimento
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

  // Iniciar gravação
  const start = useCallback(() => {
    setIsRecording(true);
  }, []);

  // Parar gravação
  const stop = useCallback(() => {
    setIsRecording(false);
  }, []);

  // Limpar dados
  const clear = useCallback(() => {
    setPoints([]);
  }, []);

  // Carregar histórico
  const loadHistory = useCallback(async (
    timeRange: TimeRange,
    customRange?: { from: Date; to: Date }
  ) => {
    let from: Date;
    let to = new Date();

    switch (timeRange) {
      case '1h':
        from = new Date(Date.now() - 3600000);
        break;
      case '6h':
        from = new Date(Date.now() - 6 * 3600000);
        break;
      case '12h':
        from = new Date(Date.now() - 12 * 3600000);
        break;
      case '24h':
        from = new Date(Date.now() - 24 * 3600000);
        break;
      case '7d':
        from = new Date(Date.now() - 7 * 24 * 3600000);
        break;
      case '30d':
        from = new Date(Date.now() - 30 * 24 * 3600000);
        break;
      case 'custom':
        if (!customRange) return;
        from = customRange.from;
        to = customRange.to;
        break;
      default:
        from = new Date(Date.now() - 3600000);
    }

    try {
      const { data } = await supabase
        .from('heatmap_data')
        .select('x, y, value, created_at')
        .eq('camera_id', cameraId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true });

      if (data) {
        setPoints(data.map(d => ({
          x: d.x,
          y: d.y,
          value: d.value,
          timestamp: new Date(d.created_at),
        })));
      }
    } catch (err) {
      console.error('[Heatmap] Erro ao carregar histórico:', err);
    }
  }, [cameraId]);

  // Salvar snapshot
  const saveSnapshot = useCallback(async (): Promise<string | null> => {
    if (!heatmapData) return null;

    try {
      // Salvar no banco
      await supabase.from('heatmap_snapshots').insert({
        camera_id: cameraId,
        data: heatmapData.grid,
        total_detections: heatmapData.totalDetections,
        start_time: heatmapData.startTime.toISOString(),
        end_time: heatmapData.endTime.toISOString(),
      });

      // Retornar imagem
      return getImageData();
    } catch (err) {
      console.error('[Heatmap] Erro ao salvar snapshot:', err);
      return null;
    }
  }, [cameraId, heatmapData]);

  // Renderizar no canvas
  const renderToCanvas = useCallback((canvas: HTMLCanvasElement) => {
    if (!heatmapData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Limpar canvas
    ctx.clearRect(0, 0, width, height);

    // Criar gradiente
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, config.gridSize);
    const colors = COLOR_SCHEMES[config.colorScheme];
    colors.forEach(c => gradient.addColorStop(c.stop, c.color));

    // Renderizar cada célula
    heatmapData.grid.forEach((row, rowIdx) => {
      row.forEach((value, colIdx) => {
        if (value < config.minValue) return;

        const normalizedValue = value / heatmapData.maxValue;
        const x = colIdx * config.gridSize + config.gridSize / 2;
        const y = rowIdx * config.gridSize + config.gridSize / 2;
        const radius = config.gridSize * Math.min(normalizedValue + 0.3, 1);

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 1);

        const cellGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        
        // Ajustar cor baseado no valor
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

    // Aplicar blur
    if (config.blur > 0) {
      ctx.filter = `blur(${config.blur}px)`;
      const imageData = ctx.getImageData(0, 0, width, height);
      ctx.putImageData(imageData, 0, 0);
      ctx.filter = 'none';
    }

    // Desenhar grid
    if (config.showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
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

  // Obter imagem
  const getImageData = useCallback((): string | null => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    renderToCanvas(canvasRef.current);
    return canvasRef.current.toDataURL('image/png');
  }, [renderToCanvas]);

  // Atualizar config
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

// ============================================
// COMPONENTE OVERLAY
// ============================================

interface HeatmapOverlayProps {
  heatmapHook: UseHeatmapReturn;
  className?: string;
}

export function HeatmapOverlay({ heatmapHook, className }: HeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { heatmapData, renderToCanvas, config } = heatmapHook;

  useEffect(() => {
    if (canvasRef.current && heatmapData) {
      renderToCanvas(canvasRef.current);
    }
  }, [heatmapData, renderToCanvas]);

  if (!heatmapData) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: config.opacity,
      }}
    />
  );
}

export default useHeatmap;
