/**
 * Feature Flags System
 * @module lib/featureFlags
 */

type FeatureFlag = {
  enabled: boolean;
  percentage?: number;
  allowList?: string[];
};

const defaultFlags: Record<string, FeatureFlag> = {
  newDashboard: { enabled: false },
  betaFeatures: { enabled: false, percentage: 10 },
  darkModeV2: { enabled: true },
  aiAssistant: { enabled: false, allowList: ['admin'] },
};

class FeatureFlagService {
  private flags: Record<string, FeatureFlag>;
  private userId?: string;

  constructor(initialFlags: Record<string, FeatureFlag> = defaultFlags) {
    this.flags = initialFlags;
  }

  setUser(userId: string): void {
    this.userId = userId;
  }

  isEnabled(flagName: string): boolean {
    const flag = this.flags[flagName];
    if (!flag) return false;
    if (!flag.enabled) return false;
    
    if (flag.allowList && this.userId) {
      if (flag.allowList.includes(this.userId)) return true;
    }
    
    if (flag.percentage !== undefined) {
      const hash = this.hashUserId(this.userId || 'anonymous');
      return hash < flag.percentage;
    }
    
    return flag.enabled;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash % 100);
  }

  setFlag(name: string, flag: FeatureFlag): void {
    this.flags[name] = flag;
  }

  getAllFlags(): Record<string, boolean> {
    return Object.keys(this.flags).reduce((acc, key) => {
      acc[key] = this.isEnabled(key);
      return acc;
    }, {} as Record<string, boolean>);
  }
}

export const featureFlags = new FeatureFlagService();
export default featureFlags;
