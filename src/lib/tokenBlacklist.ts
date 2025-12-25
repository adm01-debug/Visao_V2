/**
 * Token Blacklist Manager
 * Invalidate tokens before expiration
 */

export interface BlacklistedToken {
  token: string;
  reason: string;
  blacklistedAt: number;
  expiresAt: number;
}

class TokenBlacklist {
  private blacklist: Map<string, BlacklistedToken> = new Map();
  private storageKey = 'visao_token_blacklist';
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.load();
    this.startCleanup();
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const entries = JSON.parse(stored) as BlacklistedToken[];
        entries.forEach(entry => {
          if (entry.expiresAt > Date.now()) {
            this.blacklist.set(this.hashToken(entry.token), entry);
          }
        });
      }
    } catch {
      // Ignore errors
    }
  }

  private save(): void {
    const entries = Array.from(this.blacklist.values());
    localStorage.setItem(this.storageKey, JSON.stringify(entries));
  }

  private hashToken(token: string): string {
    // Simple hash for storage - in production use proper crypto
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private startCleanup(): void {
    // Cleanup expired tokens every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  add(token: string, reason: string, ttl = 24 * 60 * 60 * 1000): void {
    const hash = this.hashToken(token);
    this.blacklist.set(hash, {
      token: hash, // Store hash, not actual token
      reason,
      blacklistedAt: Date.now(),
      expiresAt: Date.now() + ttl,
    });
    this.save();
  }

  isBlacklisted(token: string): boolean {
    const hash = this.hashToken(token);
    const entry = this.blacklist.get(hash);
    
    if (!entry) return false;
    
    if (entry.expiresAt <= Date.now()) {
      this.blacklist.delete(hash);
      this.save();
      return false;
    }
    
    return true;
  }

  remove(token: string): boolean {
    const hash = this.hashToken(token);
    const deleted = this.blacklist.delete(hash);
    if (deleted) this.save();
    return deleted;
  }

  cleanup(): void {
    const now = Date.now();
    let changed = false;
    
    this.blacklist.forEach((entry, hash) => {
      if (entry.expiresAt <= now) {
        this.blacklist.delete(hash);
        changed = true;
      }
    });
    
    if (changed) this.save();
  }

  clear(): void {
    this.blacklist.clear();
    localStorage.removeItem(this.storageKey);
  }

  getCount(): number {
    return this.blacklist.size;
  }

  getReasons(): Record<string, number> {
    const reasons: Record<string, number> = {};
    this.blacklist.forEach(entry => {
      reasons[entry.reason] = (reasons[entry.reason] || 0) + 1;
    });
    return reasons;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const tokenBlacklist = new TokenBlacklist();
export default TokenBlacklist;
