import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setMemoryCache,
  getMemoryCache,
  deleteMemoryCache,
  clearMemoryCache,
  getMemoryCacheSize,
  memoize,
} from '../cacheUtils';

describe('cacheUtils', () => {
  beforeEach(() => {
    clearMemoryCache();
  });

  describe('memory cache', () => {
    it('should set and get cache item', () => {
      setMemoryCache('test', 'value');
      expect(getMemoryCache('test')).toBe('value');
    });

    it('should return null for non-existent key', () => {
      expect(getMemoryCache('nonexistent')).toBeNull();
    });

    it('should expire items after TTL', () => {
      vi.useFakeTimers();
      setMemoryCache('test', 'value', 1000);
      
      vi.advanceTimersByTime(1001);
      expect(getMemoryCache('test')).toBeNull();
      
      vi.useRealTimers();
    });

    it('should delete cache item', () => {
      setMemoryCache('test', 'value');
      deleteMemoryCache('test');
      expect(getMemoryCache('test')).toBeNull();
    });

    it('should clear all cache', () => {
      setMemoryCache('test1', 'value1');
      setMemoryCache('test2', 'value2');
      clearMemoryCache();
      expect(getMemoryCacheSize()).toBe(0);
    });

    it('should return cache size', () => {
      setMemoryCache('test1', 'value1');
      setMemoryCache('test2', 'value2');
      expect(getMemoryCacheSize()).toBe(2);
    });
  });

  describe('memoize', () => {
    it('should cache function results', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);
      
      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cache different arguments separately', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);
      
      expect(memoized(5)).toBe(10);
      expect(memoized(10)).toBe(20);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should expire memoized results', () => {
      vi.useFakeTimers();
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn, 1000);
      
      expect(memoized(5)).toBe(10);
      vi.advanceTimersByTime(1001);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(2);
      
      vi.useRealTimers();
    });
  });
});
