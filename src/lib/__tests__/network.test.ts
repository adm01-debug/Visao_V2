import { describe, it, expect, vi } from 'vitest';
import { isOnline, onOnline, onOffline } from '../network';

describe('network', () => {
  it('isOnline should return boolean', () => {
    expect(typeof isOnline()).toBe('boolean');
  });

  it('onOnline should return cleanup function', () => {
    const callback = vi.fn();
    const cleanup = onOnline(callback);
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('onOffline should return cleanup function', () => {
    const callback = vi.fn();
    const cleanup = onOffline(callback);
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('should call callback on online event', () => {
    const callback = vi.fn();
    onOnline(callback);
    window.dispatchEvent(new Event('online'));
    expect(callback).toHaveBeenCalled();
  });

  it('should call callback on offline event', () => {
    const callback = vi.fn();
    onOffline(callback);
    window.dispatchEvent(new Event('offline'));
    expect(callback).toHaveBeenCalled();
  });
});
