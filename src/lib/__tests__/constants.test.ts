import { describe, it, expect } from 'vitest';
import { 
  SEVERITY_LEVELS, 
  CAMERA_STATUSES, 
  ALERT_TYPES, 
  NOTIFICATION_CHANNELS,
  DEFAULT_PAGE_SIZE,
  MAX_FILE_SIZE,
  ROUTES 
} from '../constants';

describe('constants', () => {
  it('has SEVERITY_LEVELS', () => {
    expect(SEVERITY_LEVELS).toBeDefined();
    expect(SEVERITY_LEVELS).toContain('low');
    expect(SEVERITY_LEVELS).toContain('critical');
  });

  it('has CAMERA_STATUSES', () => {
    expect(CAMERA_STATUSES).toBeDefined();
    expect(CAMERA_STATUSES).toContain('online');
  });

  it('has ALERT_TYPES', () => {
    expect(ALERT_TYPES).toBeDefined();
    expect(ALERT_TYPES.length).toBeGreaterThan(0);
  });

  it('has NOTIFICATION_CHANNELS', () => {
    expect(NOTIFICATION_CHANNELS).toBeDefined();
    expect(NOTIFICATION_CHANNELS).toContain('telegram');
  });

  it('has DEFAULT_PAGE_SIZE as number', () => {
    expect(typeof DEFAULT_PAGE_SIZE).toBe('number');
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it('has MAX_FILE_SIZE', () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });

  it('has ROUTES object', () => {
    expect(ROUTES).toBeDefined();
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.DASHBOARD).toBe('/dashboard');
  });
});
