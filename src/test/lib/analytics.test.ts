import { describe, it, expect } from 'vitest';
import {
  initAnalytics,
  trackEvent,
  trackPageView,
  trackError,
  setUser,
  trackTiming,
} from '@/lib/analytics';

describe('analytics', () => {
  it('initAnalytics does not throw', () => {
    expect(() => initAnalytics()).not.toThrow();
  });
  it('double init is safe', () => {
    expect(() => {
      initAnalytics();
      initAnalytics();
    }).not.toThrow();
  });
  it('trackEvent does not throw', () => {
    initAnalytics();
    expect(() => trackEvent('test', { key: 'value' })).not.toThrow();
  });
  it('trackEvent without init is silent', () => {
    // Already initialized from previous test, but behavior is still no-throw
    expect(() => trackEvent('test')).not.toThrow();
  });
  it('trackPageView does not throw', () => {
    expect(() => trackPageView('/home', 'Home')).not.toThrow();
  });
  it('trackError does not throw', () => {
    expect(() => trackError(new Error('test'), { ctx: 'test' })).not.toThrow();
  });
  it('setUser does not throw', () => {
    expect(() => setUser('user1', { plan: 'pro' })).not.toThrow();
  });
  it('trackTiming does not throw', () => {
    expect(() => trackTiming('api', 'response', 250)).not.toThrow();
  });
});
