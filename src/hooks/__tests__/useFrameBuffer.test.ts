/**
 * Regressão — useFrameBuffer: snapshot estável no useSyncExternalStore.
 *
 * Causa raiz do "Maximum update depth exceeded" (React error #185) em /cameras:
 * getSnapshot de getBufferStats() retornava objeto NOVO a cada chamada. O React
 * compara snapshots por Object.is; objeto novo a cada leitura = render infinito.
 * Com 35 câmeras × ~2 fps de pushFrame (notify global), o loop estoura o limite.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFrameBuffer, pushFrame, clearFrameBuffer, getBufferStats } from '../useFrameBuffer';

function makeDataUrl(size = 32): string {
  return `data:image/jpeg;base64,${'A'.repeat(size)}`;
}

describe('useFrameBuffer — invariante de snapshot estável', () => {
  beforeEach(() => {
    clearFrameBuffer();
  });

  it('getBufferStats retorna o MESMO objeto entre chamadas sem mutação (snapshot estável)', () => {
    pushFrame('cam-a', makeDataUrl());
    const first = getBufferStats('cam-a');
    const second = getBufferStats('cam-a');
    expect(second).toBe(first);
  });

  it('o hook expõe stats estáveis entre renders até o buffer mudar', () => {
    const { result } = renderHook(() => useFrameBuffer('cam-a'));
    const before = result.current.stats;
    // sem push, stats continuam sendo o mesmo object identity
    expect(result.current.stats).toBe(before);
    act(() => {
      pushFrame('cam-a', makeDataUrl());
    });
    // depois de uma mutação o objeto pode (e deve) mudar, mas segue cacheado
    const after = result.current.stats;
    expect(after).toEqual({ count: 1, spanSec: 0 });
    expect(result.current.stats).toBe(after);
  });

  it('pushFrame invalida apenas o cache da câmera mutada', () => {
    pushFrame('cam-a', makeDataUrl());
    pushFrame('cam-b', makeDataUrl());
    const snapA = getBufferStats('cam-a');
    const snapB = getBufferStats('cam-b');
    act(() => {
      pushFrame('cam-b', makeDataUrl());
    });
    expect(getBufferStats('cam-a')).toBe(snapA);
    expect(getBufferStats('cam-b')).not.toBe(snapB);
  });

  it('clearFrameBuffer esvazia stats e não reutiliza objeto velho', () => {
    pushFrame('cam-a', makeDataUrl());
    const snap = getBufferStats('cam-a');
    act(() => {
      clearFrameBuffer('cam-a');
    });
    const empty = getBufferStats('cam-a');
    expect(empty).toEqual({ count: 0, spanSec: 0 });
    expect(empty).not.toBe(snap);
  });
});
