/**
 * VISÃO - Heatmap Types & Constants
 */

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

export const DEFAULT_CONFIG: HeatmapConfig = {
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

export const COLOR_SCHEMES = {
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
