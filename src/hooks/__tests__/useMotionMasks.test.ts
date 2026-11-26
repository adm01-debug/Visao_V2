/**
 * useMotionMasks — escopo da lista carregada.
 *
 * Prova que a lista exposta pertence sempre ao escopo (usuário + câmera) da
 * seleção atual: falha de releitura na mesma câmera não apaga nada, e falha ao
 * trocar de câmera não deixa as máscaras da câmera anterior na tela (o que faria
 * `remove`/`toggle` agirem por id na máscara errada).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

type QueryResult = { data: unknown; error: { message: string } | null };
type QueuedResult = QueryResult | (() => Promise<QueryResult>);

const h = vi.hoisted(() => ({
  // cada item é a resposta da próxima consulta, na ordem; uma função permite
  // segurar a resposta para simular consulta em voo (corrida entre escopos)
  responses: [] as unknown[],
  fromCalls: [] as string[],
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/contexts/AuthContext', () => {
  // objeto estável: `useAuth()` devolvendo um objeto novo a cada render faria o
  // `load` (useCallback com dep no user) trocar de identidade e dar laço infinito
  const user = { id: 'user-1' };
  return { useAuth: () => ({ user }) };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      h.fromCalls.push(table);
      const next = (h.responses.shift() ?? { data: [], error: null }) as QueuedResult;
      const result = typeof next === 'function' ? next() : Promise.resolve(next);
      const chain: Record<string, unknown> = {};
      chain.order = () => chain;
      chain.eq = () => chain;
      chain.then = (resolve: (value: unknown) => unknown) => result.then(resolve);
      return { select: () => chain };
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({ id: 'canal' }) }),
    }),
    removeChannel: () => {},
  },
}));

// Importado depois dos mocks.
import { toast } from 'sonner';
import { useMotionMasks } from '@/hooks/useMotionMasks';

const toastError = toast.error as unknown as ReturnType<typeof vi.fn>;

function row(id: string, cameraId: string) {
  return {
    id,
    user_id: 'user-1',
    camera_id: cameraId,
    name: `mascara-${id}`,
    mode: 'exclude' as const,
    polygon: [
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    sensitivity: 50,
    color: '#22c55e',
    enabled: true,
    created_at: '2026-11-26T00:00:00Z',
    updated_at: '2026-11-26T00:00:00Z',
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useMotionMasks — escopo da lista', () => {
  beforeEach(() => {
    h.responses.length = 0;
    h.fromCalls.length = 0;
    vi.clearAllMocks();
  });

  it('mantém as máscaras quando a releitura de fundo falha na mesma câmera', async () => {
    h.responses.push({ data: [row('m1', 'cam-1')], error: null });
    const { result } = renderHook(() => useMotionMasks('cam-1'));
    await flush();
    expect(result.current.masks.map((m) => m.id)).toEqual(['m1']);

    const callsBefore = h.fromCalls.length;
    h.responses.push({ data: null, error: { message: 'rede fora' } });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await flush();

    // a releitura aconteceu de fato e a resposta de erro foi entregue pelo mock
    expect(h.fromCalls.length).toBe(callsBefore + 1);
    expect(h.responses).toHaveLength(0);
    expect(result.current.masks.map((m) => m.id)).toEqual(['m1']);
    expect(result.current.loading).toBe(false);
    // releitura de fundo não pode virar um toast a cada ciclo
    expect(toastError).not.toHaveBeenCalled();
  });

  it('não expõe as máscaras da câmera anterior quando a consulta da nova câmera falha', async () => {
    h.responses.push({ data: [row('m1', 'cam-1')], error: null });
    const { result, rerender } = renderHook(({ id }: { id: string }) => useMotionMasks(id), {
      initialProps: { id: 'cam-1' },
    });
    await flush();
    expect(result.current.masks.map((m) => m.id)).toEqual(['m1']);

    h.responses.push({ data: null, error: { message: 'falha na troca' } });
    rerender({ id: 'cam-2' });
    await flush();

    expect(result.current.masks).toEqual([]);
    // troca de câmera é leitura em primeiro plano: o erro aparece para o operador
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('volta a mostrar as máscaras quando a consulta do novo escopo funciona', async () => {
    h.responses.push({ data: [row('m1', 'cam-1')], error: null });
    const { result, rerender } = renderHook(({ id }: { id: string }) => useMotionMasks(id), {
      initialProps: { id: 'cam-1' },
    });
    await flush();

    h.responses.push({ data: null, error: { message: 'falha na troca' } });
    rerender({ id: 'cam-2' });
    await flush();
    expect(result.current.masks).toEqual([]);

    // a releitura de fundo (aqui disparada pela volta do foco) cura a troca que falhou
    h.responses.push({ data: [row('m2', 'cam-2')], error: null });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await flush();
    expect(result.current.masks.map((m) => m.id)).toEqual(['m2']);
  });

  it('ignora a resposta da câmera anterior que chega depois da nova já carregada', async () => {
    let falharConsultaAntiga = () => {};
    h.responses.push(
      () =>
        new Promise<QueryResult>((resolve) => {
          falharConsultaAntiga = () => resolve({ data: null, error: { message: 'falha tardia' } });
        })
    );
    const { result, rerender } = renderHook(({ id }: { id: string }) => useMotionMasks(id), {
      initialProps: { id: 'cam-1' },
    });
    await flush();
    expect(result.current.masks).toEqual([]);

    // a câmera nova carrega as máscaras dela antes de a consulta antiga falhar
    h.responses.push({ data: [row('m2', 'cam-2')], error: null });
    rerender({ id: 'cam-2' });
    await flush();
    expect(result.current.masks.map((m) => m.id)).toEqual(['m2']);

    await act(async () => {
      falharConsultaAntiga();
    });
    await flush();

    expect(result.current.masks.map((m) => m.id)).toEqual(['m2']);
  });

  it('não consulta o banco quando a análise contínua está desligada', async () => {
    const { result } = renderHook(() => useMotionMasks('cam-1', { enabled: false }));
    await flush();

    expect(h.fromCalls).toEqual([]);
    expect(result.current.masks).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
