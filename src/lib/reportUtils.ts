/**
 * Report Utilities
 * @module lib/reportUtils
 */

export interface ReportData {
  title: string;
  period: { start: Date; end: Date };
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  type: 'table' | 'chart' | 'summary' | 'text';
  data: unknown;
}

export function formatReportPeriod(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR');
  return `${fmt(start)} - ${fmt(end)}`;
}

export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function aggregateByDay<T extends { timestamp: Date }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  items.forEach(item => {
    const key = item.timestamp.toISOString().split('T')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return map;
}

export function aggregateByHour<T extends { timestamp: Date }>(items: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (let i = 0; i < 24; i++) map.set(i, []);
  items.forEach(item => {
    const hour = item.timestamp.getHours();
    map.get(hour)!.push(item);
  });
  return map;
}

export function getTopN<T>(items: T[], n: number, keyFn: (item: T) => number): T[] {
  return [...items].sort((a, b) => keyFn(b) - keyFn(a)).slice(0, n);
}

export default { formatReportPeriod, calculateGrowth, aggregateByDay, aggregateByHour, getTopN };
