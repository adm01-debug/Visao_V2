/**
 * A/B Testing System
 * @module lib/abTesting
 */

interface Experiment {
  id: string;
  variants: string[];
  weights?: number[];
}

class ABTestingService {
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, string> = new Map();
  private userId?: string;

  setUser(userId: string): void {
    this.userId = userId;
    this.loadAssignments();
  }

  private loadAssignments(): void {
    try {
      const stored = localStorage.getItem(`ab_${this.userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([k, v]) => this.assignments.set(k, v as string));
      }
    } catch {}
  }

  private saveAssignments(): void {
    try {
      const obj: Record<string, string> = {};
      this.assignments.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem(`ab_${this.userId}`, JSON.stringify(obj));
    } catch {}
  }

  registerExperiment(experiment: Experiment): void {
    this.experiments.set(experiment.id, experiment);
  }

  getVariant(experimentId: string): string | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    if (this.assignments.has(experimentId)) {
      return this.assignments.get(experimentId)!;
    }

    const variant = this.assignVariant(experiment);
    this.assignments.set(experimentId, variant);
    this.saveAssignments();
    return variant;
  }

  private assignVariant(experiment: Experiment): string {
    const { variants, weights } = experiment;
    
    if (!weights) {
      return variants[Math.floor(Math.random() * variants.length)];
    }

    const total = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    
    for (let i = 0; i < variants.length; i++) {
      random -= weights[i];
      if (random <= 0) return variants[i];
    }
    
    return variants[0];
  }

  trackConversion(experimentId: string, conversionType: string): void {
    const variant = this.assignments.get(experimentId);
    if (variant) {
      // Send to analytics
    }
  }
}

export const abTesting = new ABTestingService();
export default abTesting;
