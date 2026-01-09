/**
 * Intrusion Detection - Projeto VISÃO
 * Sistema de detecção de intrusões com tipagem forte
 */

export type SecurityEventType =
  | "failed_login"
  | "invalid_token"
  | "unauthorized_access"
  | "rapid_requests"
  | "suspicious_pattern"
  | "ip_blocked"
  | "session_hijack";

export interface SecurityEventDetails {
  ip?: string;
  userId?: string;
  endpoint?: string;
  userAgent?: string;
  reason?: string;
  count?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface SecurityEvent {
  type: SecurityEventType | string;
  timestamp: Date;
  details: SecurityEventDetails;
}

export interface IntrusionThresholds {
  failedLogins: number;
  rapidRequests: number;
  suspiciousPatterns: number;
}

export type AlertType = "brute_force" | "ddos" | "suspicious_activity" | "account_takeover";

class IntrusionDetector {
  private events: SecurityEvent[] = [];
  private thresholds: IntrusionThresholds = {
    failedLogins: 5,
    rapidRequests: 100,
    suspiciousPatterns: 3,
  };

  logEvent(type: SecurityEventType | string, details: SecurityEventDetails): void {
    this.events.push({ type, timestamp: new Date(), details });
    this.analyze();
  }

  private analyze(): void {
    const recent = this.events.filter(
      (e) => Date.now() - e.timestamp.getTime() < 60000
    );
    const failedLogins = recent.filter((e) => e.type === "failed_login").length;
    if (failedLogins >= this.thresholds.failedLogins) {
      this.triggerAlert("brute_force");
    }
  }

  private triggerAlert(type: AlertType): void {
    console.warn("Intrusion detected:", type);
  }

  setThresholds(thresholds: Partial<IntrusionThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  getRecentEvents(minutes = 5): SecurityEvent[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.events.filter((e) => e.timestamp.getTime() > cutoff);
  }

  clearEvents(): void {
    this.events = [];
  }
}

export const intrusionDetector = new IntrusionDetector();
export default intrusionDetector;

