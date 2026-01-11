import { describe, it, expect, vi } from 'vitest';
import { on, off, once, emit, createEventEmitter } from '../events';

describe('events utilities', () => {
  describe('on', () => {
    it('adds event listener', () => {
      const el = document.createElement('div');
      const handler = vi.fn();
      on(el, 'click', handler);
      el.click();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('removes event listener', () => {
      const el = document.createElement('div');
      const handler = vi.fn();
      on(el, 'click', handler);
      off(el, 'click', handler);
      el.click();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('adds one-time event listener', () => {
      const el = document.createElement('div');
      const handler = vi.fn();
      once(el, 'click', handler);
      el.click();
      el.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('createEventEmitter', () => {
    it('creates event emitter', () => {
      const emitter = createEventEmitter();
      const handler = vi.fn();
      emitter.on('test', handler);
      emitter.emit('test', { data: 1 });
      expect(handler).toHaveBeenCalledWith({ data: 1 });
    });
  });
});
