import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../eventBus';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it('should emit and receive events', () => {
    const callback = vi.fn();
    eventBus.on('test', callback);
    eventBus.emit('test', 'data');
    expect(callback).toHaveBeenCalledWith('data');
  });

  it('should remove listener with off', () => {
    const callback = vi.fn();
    eventBus.on('test', callback);
    eventBus.off('test', callback);
    eventBus.emit('test');
    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle once', () => {
    const callback = vi.fn();
    eventBus.once('test', callback);
    eventBus.emit('test');
    eventBus.emit('test');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should return unsubscribe function', () => {
    const callback = vi.fn();
    const unsub = eventBus.on('test', callback);
    unsub();
    eventBus.emit('test');
    expect(callback).not.toHaveBeenCalled();
  });
});
