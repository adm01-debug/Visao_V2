interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

const metrics: Metric[] = [];

export const recordMetric = (name: string, value: number, tags?: Record<string, string>): void => {
  metrics.push({ name, value, timestamp: Date.now(), tags });
};

export const getMetrics = (name?: string): Metric[] => {
  if (name) return metrics.filter((m) => m.name === name);
  return [...metrics];
};

export const clearMetrics = (): void => {
  metrics.length = 0;
};

export const getAverageMetric = (name: string): number | null => {
  const filtered = metrics.filter((m) => m.name === name);
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length;
};

export const startTimer = (name: string): () => void => {
  const start = performance.now();
  return () => recordMetric(name, performance.now() - start);
};
