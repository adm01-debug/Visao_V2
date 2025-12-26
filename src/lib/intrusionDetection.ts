/**
 * Intrusion Detection
 */
type SecurityEvent = { type: string; timestamp: Date; details: any };
class IntrusionDetector {
  private events: SecurityEvent[] = [];
  private thresholds = { failedLogins: 5, rapidRequests: 100, suspiciousPatterns: 3 };
  logEvent(type: string, details: any): void { this.events.push({ type, timestamp: new Date(), details }); this.analyze(); }
  private analyze(): void {
    const recent = this.events.filter(e => Date.now() - e.timestamp.getTime() < 60000);
    const failedLogins = recent.filter(e => e.type === 'failed_login').length;
    if (failedLogins >= this.thresholds.failedLogins) this.triggerAlert('brute_force');
  }
  private triggerAlert(type: string): void { console.warn('Intrusion detected:', type); }
}
export const intrusionDetector = new IntrusionDetector();
