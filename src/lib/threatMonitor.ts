/**
 * Threat Monitor
 */
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';
export interface Threat { id: string; type: string; level: ThreatLevel; description: string; timestamp: Date; }
class ThreatMonitor {
  private threats: Threat[] = [];
  private listeners: ((threat: Threat) => void)[] = [];
  report(type: string, level: ThreatLevel, description: string): Threat {
    const threat = { id: crypto.randomUUID(), type, level, description, timestamp: new Date() };
    this.threats.push(threat);
    this.listeners.forEach(l => l(threat));
    return threat;
  }
  onThreat(callback: (threat: Threat) => void): () => void {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }
  getThreats(level?: ThreatLevel): Threat[] { return level ? this.threats.filter(t => t.level === level) : this.threats; }
}
export const threatMonitor = new ThreatMonitor();
