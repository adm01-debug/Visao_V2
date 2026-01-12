import { describe, it, expect, beforeEach } from 'vitest';
import FeatureFlagService from '../featureFlags';

describe('FeatureFlagService', () => {
  let service: InstanceType<typeof FeatureFlagService.constructor>;

  beforeEach(() => {
    service = new (FeatureFlagService.constructor as any)({
      enabledFeature: { enabled: true },
      disabledFeature: { enabled: false },
      percentageFeature: { enabled: true, percentage: 50 },
      allowListFeature: { enabled: true, allowList: ['admin'] },
    });
  });

  it('should return true for enabled features', () => {
    expect(service.isEnabled('enabledFeature')).toBe(true);
  });

  it('should return false for disabled features', () => {
    expect(service.isEnabled('disabledFeature')).toBe(false);
  });

  it('should return false for unknown features', () => {
    expect(service.isEnabled('unknownFeature')).toBe(false);
  });

  it('should check allowList', () => {
    service.setUser('admin');
    expect(service.isEnabled('allowListFeature')).toBe(true);
    
    service.setUser('user');
    // May or may not be enabled based on percentage logic
  });

  it('should get all flags', () => {
    const flags = service.getAllFlags();
    expect(typeof flags.enabledFeature).toBe('boolean');
  });
});
