/**
 * Prometheus Metrics
 */
export class MetricsRegistry {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  counter(name: string, value = 1): void { this.counters.set(name, (this.counters.get(name) || 0) + value); }
  gauge(name: string, value: number): void { this.gauges.set(name, value); }
  histogram(name: string, value: number): void { const h = this.histograms.get(name) || []; h.push(value); this.histograms.set(name, h); }
  export(): string {
    let output = '';
    this.counters.forEach((v, k) => output += `${k} ${v}\n`);
    this.gauges.forEach((v, k) => output += `${k} ${v}\n`);
    return output;
  }
}
export const metrics = new MetricsRegistry();
