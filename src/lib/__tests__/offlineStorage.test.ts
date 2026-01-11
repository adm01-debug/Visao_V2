import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveOffline, loadOffline, removeOffline, clearOffline, getOfflineKeys } from '../offlineStorage';

describe('offlineStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveOffline', () => {
    it('saves data to localStorage', () => {
      saveOffline('key', { a: 1 });
      expect(localStorage.getItem('offline_key')).toBeDefined();
    });
  });

  describe('loadOffline', () => {
    it('loads data from localStorage', () => {
      saveOffline('key', { a: 1 });
      expect(loadOffline('key')).toEqual({ a: 1 });
    });

    it('returns null for missing key', () => {
      expect(loadOffline('missing')).toBeNull();
    });
  });

  describe('removeOffline', () => {
    it('removes data from localStorage', () => {
      saveOffline('key', { a: 1 });
      removeOffline('key');
      expect(loadOffline('key')).toBeNull();
    });
  });

  describe('clearOffline', () => {
    it('clears all offline data', () => {
      saveOffline('key1', { a: 1 });
      saveOffline('key2', { b: 2 });
      clearOffline();
      expect(loadOffline('key1')).toBeNull();
      expect(loadOffline('key2')).toBeNull();
    });
  });

  describe('getOfflineKeys', () => {
    it('returns all offline keys', () => {
      saveOffline('key1', { a: 1 });
      saveOffline('key2', { b: 2 });
      const keys = getOfflineKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });
});
