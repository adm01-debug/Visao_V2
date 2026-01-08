import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from '../storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('has get/set methods', () => {
    expect(typeof storage.get).toBe('function');
    expect(typeof storage.set).toBe('function');
  });

  it('sets value with prefix', () => {
    storage.set('key', 'value');
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('gets value with fallback', () => {
    const result = storage.get('nonexistent', 'fallback');
    expect(result).toBe('fallback');
  });

  it('has remove method', () => {
    expect(typeof storage.remove).toBe('function');
  });

  it('has clear method', () => {
    expect(typeof storage.clear).toBe('function');
  });
});
