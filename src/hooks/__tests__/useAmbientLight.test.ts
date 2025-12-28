/**
 * @fileoverview Testes para useAmbientLight hook
 * @description Testa o hook de sensor de luz ambiente
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAmbientLight } from '@/hooks/useAmbientLight';

describe('useAmbientLight', () => {
  let mockSensor: any;
  let originalAmbientLightSensor: any;

  beforeEach(() => {
    mockSensor = {
      illuminance: 100,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    
    originalAmbientLightSensor = (window as any).AmbientLightSensor;
    (window as any).AmbientLightSensor = vi.fn(() => mockSensor);
  });

  afterEach(() => {
    (window as any).AmbientLightSensor = originalAmbientLightSensor;
    vi.clearAllMocks();
  });

  it('deve retornar valores iniciais', () => {
    const { result } = renderHook(() => useAmbientLight());
    
    expect(result.current.illuminance).toBeDefined();
    expect(result.current.isSupported).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it('deve detectar suporte ao sensor', () => {
    const { result } = renderHook(() => useAmbientLight());
    expect(result.current.isSupported).toBe(true);
  });

  it('deve retornar não suportado quando API não existe', () => {
    (window as any).AmbientLightSensor = undefined;
    const { result } = renderHook(() => useAmbientLight());
    expect(result.current.isSupported).toBe(false);
  });

  it('deve atualizar iluminância quando sensor emite evento', () => {
    const { result } = renderHook(() => useAmbientLight());
    
    const readingHandler = mockSensor.addEventListener.mock.calls.find(
      (call: any) => call[0] === 'reading'
    )?.[1];
    
    if (readingHandler) {
      mockSensor.illuminance = 500;
      act(() => readingHandler());
      expect(result.current.illuminance).toBe(500);
    }
  });

  it('deve lidar com erro do sensor', () => {
    const { result } = renderHook(() => useAmbientLight());
    
    const errorHandler = mockSensor.addEventListener.mock.calls.find(
      (call: any) => call[0] === 'error'
    )?.[1];
    
    if (errorHandler) {
      act(() => errorHandler({ error: new Error('Sensor error') }));
      expect(result.current.error).toBeDefined();
    }
  });

  it('deve limpar listener ao desmontar', () => {
    const { unmount } = renderHook(() => useAmbientLight());
    unmount();
    expect(mockSensor.removeEventListener).toHaveBeenCalled();
    expect(mockSensor.stop).toHaveBeenCalled();
  });
});
