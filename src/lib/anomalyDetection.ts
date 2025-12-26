/**
 * Anomaly Detection
 */
export class AnomalyDetector {
  private baseline: number[] = [];
  train(data: number[]): void { this.baseline = data; }
  detect(value: number): { isAnomaly: boolean; score: number } {
    if (this.baseline.length === 0) return { isAnomaly: false, score: 0 };
    const mean = this.baseline.reduce((a, b) => a + b, 0) / this.baseline.length;
    const std = Math.sqrt(this.baseline.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.baseline.length);
    const zScore = Math.abs((value - mean) / (std || 1));
    return { isAnomaly: zScore > 3, score: zScore };
  }
}
