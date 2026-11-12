import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// TensorFlow e coco-ssd simulados: o modelo falha ao carregar (ex.: sem rede para baixar os pesos).
vi.mock('@tensorflow/tfjs', () => ({
  setBackend: vi.fn().mockResolvedValue(true),
  ready: vi.fn().mockResolvedValue(undefined),
  getBackend: vi.fn().mockReturnValue('cpu'),
}));
vi.mock('@tensorflow-models/coco-ssd', () => ({
  load: vi.fn().mockRejectedValue(new Error('falha ao baixar os pesos do modelo')),
}));

import { useMLModels } from '../useMLModels';

describe('useMLModels — erro de carregamento chega ao chamador', () => {
  it('expõe o erro real em `error` (antes era sempre null) e chama onError', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useMLModels({ models: ['coco-ssd'], autoLoad: false, onError })
    );
    expect(result.current.error).toBeNull();
    let ok = true;
    await act(async () => {
      ok = await result.current.loadModel('coco-ssd');
    });
    expect(ok).toBe(false);
    await waitFor(() => expect(result.current.error).toBe('falha ao baixar os pesos do modelo'));
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'coco-ssd');
  });
});
