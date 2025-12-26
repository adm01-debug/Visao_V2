/**
 * VISÃO - Testes do useMLModels
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock do TensorFlow.js
vi.mock('@tensorflow/tfjs', () => ({
  setBackend: vi.fn().mockResolvedValue(undefined),
  ready: vi.fn().mockResolvedValue(undefined),
  getBackend: vi.fn().mockReturnValue('webgl'),
}));

vi.mock('@tensorflow-models/coco-ssd', () => ({
  load: vi.fn().mockResolvedValue({
    detect: vi.fn().mockResolvedValue([
      { class: 'person', score: 0.95, bbox: [10, 20, 100, 200] },
    ]),
  }),
}));

describe('useMLModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', async () => {
    // Importar dinamicamente para aplicar mocks
    const { useMLModels } = await import('@/hooks/useMLModels');
    
    const { result } = renderHook(() => useMLModels({
      models: ['coco-ssd'],
      autoLoad: false,
    }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isReady).toBe(false);
  });

  it('should have correct config defaults', async () => {
    const { useMLModels } = await import('@/hooks/useMLModels');
    
    const { result } = renderHook(() => useMLModels());

    expect(result.current.config.maxDetections).toBe(20);
    expect(result.current.config.minScore).toBe(0.5);
  });
});

describe('Basic App Tests', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const asyncFn = () => Promise.resolve('success');
    const result = await asyncFn();
    expect(result).toBe('success');
  });
});
