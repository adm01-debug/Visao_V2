/**
 * Session Manager
 * Secure session handling with auto-refresh
 */

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: number;
  createdAt: number;
  lastActivity: number;
  metadata?: Record<string, unknown>;
}

export interface SessionConfig {
  storageKey?: string;
  maxAge?: number;
  refreshThreshold?: number;
  onExpire?: () => void;
  onRefresh?: (session: Session) => Promise<Session>;
}

const DEFAULT_CONFIG: Required<Omit<SessionConfig, 'onExpire' | 'onRefresh'>> = {
  storageKey: 'visao_session',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  refreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
};

class SessionManager {
  private config: Required<Omit<SessionConfig, 'onExpire' | 'onRefresh'>> & Pick<SessionConfig, 'onExpire' | 'onRefresh'>;
  private session: Session | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private activityTimer: NodeJS.Timeout | null = null;

  constructor(config: SessionConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadSession();
    this.setupActivityTracking();
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const session = JSON.parse(stored) as Session;
        if (session.expiresAt > Date.now()) {
          this.session = session;
          this.scheduleRefresh();
        } else {
          this.clear();
        }
      }
    } catch {
      this.clear();
    }
  }

  private saveSession(): void {
    if (this.session) {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.session));
    }
  }

  private setupActivityTracking(): void {
    if (typeof window === 'undefined') return;

    const updateActivity = () => {
      if (this.session) {
        this.session.lastActivity = Date.now();
        this.saveSession();
      }
    };

    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (!this.session || !this.config.onRefresh) return;

    const timeUntilRefresh = this.session.expiresAt - Date.now() - this.config.refreshThreshold;
    
    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(() => this.refresh(), timeUntilRefresh);
    } else if (this.session.expiresAt > Date.now()) {
      this.refresh();
    }
  }

  async create(userId: string, token: string, refreshToken?: string, metadata?: Record<string, unknown>): Promise<Session> {
    const now = Date.now();
    this.session = {
      id: crypto.randomUUID(),
      userId,
      token,
      refreshToken,
      expiresAt: now + this.config.maxAge,
      createdAt: now,
      lastActivity: now,
      metadata,
    };
    
    this.saveSession();
    this.scheduleRefresh();
    return this.session;
  }

  async refresh(): Promise<Session | null> {
    if (!this.session || !this.config.onRefresh) return null;

    try {
      this.session = await this.config.onRefresh(this.session);
      this.session.lastActivity = Date.now();
      this.saveSession();
      this.scheduleRefresh();
      return this.session;
    } catch {
      this.clear();
      return null;
    }
  }

  get(): Session | null {
    if (!this.session) return null;
    if (this.session.expiresAt <= Date.now()) {
      this.clear();
      return null;
    }
    return this.session;
  }

  getToken(): string | null {
    return this.get()?.token || null;
  }

  isValid(): boolean {
    const session = this.get();
    return session !== null && session.expiresAt > Date.now();
  }

  isExpiringSoon(): boolean {
    const session = this.get();
    if (!session) return false;
    return session.expiresAt - Date.now() < this.config.refreshThreshold;
  }

  getTimeRemaining(): number {
    const session = this.get();
    if (!session) return 0;
    return Math.max(0, session.expiresAt - Date.now());
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    if (this.session) {
      this.session.metadata = { ...this.session.metadata, ...metadata };
      this.saveSession();
    }
  }

  clear(): void {
    this.session = null;
    localStorage.removeItem(this.config.storageKey);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (this.activityTimer) clearTimeout(this.activityTimer);
    this.config.onExpire?.();
  }
}

export const sessionManager = new SessionManager();
export default SessionManager;
