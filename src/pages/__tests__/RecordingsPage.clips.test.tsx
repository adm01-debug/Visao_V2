import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
if (!(Element.prototype as unknown as { hasPointerCapture?: () => boolean }).hasPointerCapture) {
  (Element.prototype as unknown as { hasPointerCapture: () => boolean }).hasPointerCapture = () =>
    false;
  (Element.prototype as unknown as { releasePointerCapture: () => void }).releasePointerCapture =
    () => {};
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = () => {};
}

const signedCalls: string[] = [];
const removedCalls: string[][] = [];
let deletedIds: string[] | null = null;
let dbClips: Record<string, unknown>[] = [];
const chainState: { deleteMode: boolean; inValues: string[]; cols: string } = {
  deleteMode: false,
  inValues: [],
  cols: '',
};
function buildChain() {
  const chain = {
    select: (cols: unknown) => {
      chainState.cols = typeof cols === 'string' ? cols : 'id, file_url, thumbnail_url';
      return chain;
    },
    order: () => chain,
    gte: () => chain,
    lt: () => chain,
    eq: () => chain,
    in: (col: unknown, values: unknown) => {
      chainState.inValues = Array.isArray(values) ? values.map(String) : [];
      return chain;
    },
    delete: () => {
      chainState.deleteMode = true;
      return chain;
    },
    then: async (onOk: (v: unknown) => unknown) => {
      if (chainState.deleteMode) {
        deletedIds = chainState.inValues.slice();
        return onOk({ data: null, error: null });
      }
      if (chainState.cols.includes('file_url')) {
        const targets = dbClips.filter((c) => chainState.inValues.includes(String(c.id)));
        return onOk({ data: targets, error: null });
      }
      return onOk({ data: dbClips.map((c) => ({ ...c })), error: null });
    },
  };
  return chain;
}
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: (b: string) => ({
        createSignedUrl: async (path: string, sec: number) => {
          signedCalls.push(`${b}/${path}`);
          return { data: { signedUrl: `https://signed/${b}/${path}?s=${sec}` }, error: null };
        },
        remove: async (paths: string[]) => {
          removedCalls.push(paths);
          return { error: null };
        },
      }),
    },
    from: () => buildChain(),
  },
}));
vi.mock('@/hooks/useCameras', () => ({
  useCameras: () => ({ cameras: [{ id: 'cam-1', name: 'Entrada' }], loading: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeClip(id: string, minutesAgo: number) {
  const when = new Date(Date.now() - minutesAgo * 60_000);
  const filePath = `user-1/cam-1/clip-${id}.webm`;
  return {
    id,
    camera_id: 'cam-1',
    cameras: { name: 'Entrada' },
    start_time: when.toISOString(),
    end_time: when.toISOString(),
    duration: 30,
    size_bytes: 1024,
    status: 'completed',
    created_at: when.toISOString(),
    file_url: `https://x.supabase.co/storage/v1/object/sign/camera-clips/${filePath}?token=t${id}`,
    thumbnail_url: `https://x.supabase.co/storage/v1/object/sign/camera-clips/${filePath.replace('.webm', '.jpg')}?token=u${id}`,
  };
}

async function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { RecordingsPage } = await import('@/pages/RecordingsPage');
  const root = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RecordingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return root;
}
async function renderFifteen() {
  dbClips = Array.from({ length: 15 }, (_, i) => makeClip(`c${i + 1}`, 100 - i));
  await renderPage();
  await waitFor(() => expect(screen.queryAllByAltText('Clip c12').length).toBe(1), {
    timeout: 4000,
  });
}

afterEach(() => cleanup());
beforeEach(() => {
  deletedIds = null;
  signedCalls.length = 0;
  removedCalls.length = 0;
  dbClips = [];
  chainState.deleteMode = false;
  chainState.inValues = [];
  chainState.cols = '';
});

describe('RecordingsPage · clips', () => {
  it('0004 player atravessa páginas e re-assina o clip fora da página', async () => {
    await renderFifteen();
    await waitFor(() => expect(signedCalls.some((s) => s.endsWith('clip-c1.webm'))).toBe(true), {
      timeout: 4000,
    });
    expect(signedCalls.some((s) => s.endsWith('clip-c12.webm'))).toBe(true);
    expect(signedCalls.some((s) => s.endsWith('clip-c13.webm'))).toBe(false);
    fireEvent.click(screen.getByAltText('Clip c12'));
    const nextBtn = screen.queryByLabelText('Próximo');
    expect(nextBtn).toBeTruthy();
    fireEvent.click(nextBtn as HTMLElement);
    await waitFor(() => expect(signedCalls.some((s) => s.endsWith('clip-c13.webm'))).toBe(true), {
      timeout: 4000,
    });
    // bc845e 0001: o player deve receber a URL re-assinada do clip fora da
    // pagina, nao a antiga com token expirado. O efeito re-assina e atualiza
    // file_url (src=`https://signed/...?s=<ttl>`), que diferencia do original
    // (`?token=t13<td>`) pelo mesmo path.
    await waitFor(
      () => {
        const vid = document.querySelector('video');
        expect(vid?.getAttribute('src') ?? '').toMatch(/clip-c13\.webm\?s=/);
      },
      { timeout: 4000 }
    );
    const count = signedCalls.filter((s) => s.endsWith('clip-c13.webm')).length;
    await new Promise((r) => setTimeout(r, 80));
    expect(signedCalls.filter((s) => s.endsWith('clip-c13.webm')).length).toBe(count);
  });

  it('0005 exclusão em lote age fora da página/filtro e remove do storage', async () => {
    await renderFifteen();
    const boxes = screen.queryAllByRole('checkbox');
    expect(boxes.length).toBe(13);
    fireEvent.click(boxes[1]);
    fireEvent.click(boxes[2]);
    fireEvent.click(boxes[3]);
    const delBtn = screen.queryByText('Excluir (3)');
    expect(delBtn).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Buscar por câmera...'), {
      target: { value: 'nada-mesmo' },
    });
    await waitFor(
      () => expect(screen.queryAllByText('Nenhuma gravação encontrada').length).toBe(1),
      { timeout: 4000 }
    );
    fireEvent.click(delBtn as HTMLElement);
    await waitFor(() => expect(removedCalls.length).toBeGreaterThan(0), { timeout: 4000 });
    expect(deletedIds).toEqual(['c1', 'c2', 'c3']);
    const removedPaths = removedCalls.flat();
    expect(removedPaths).toContain('user-1/cam-1/clip-c1.webm');
    expect(removedPaths).toContain('user-1/cam-1/clip-c1.jpg');
    expect(removedPaths).toContain('user-1/cam-1/clip-c3.webm');
  });

  it('0006 exclusão em lote remove clips ausentes da lista carregada', async () => {
    // bc845e 0002: o filtro/busca só esconde clips no navegador; a exclusao em
    // lote deve buscar por ID todos os selecionados mesmo que nao estejam na
    // lista renderizada (ex.: selecionados numa pagina, filtro mudou depois).
    dbClips = Array.from({ length: 3 }, (_, i) => makeClip(`c${i + 1}`, 100 - i));
    // carga principal retorna apenas c1/c2/c3; pagina mostra 3
    await renderPage();
    await waitFor(() => expect(screen.queryAllByAltText('Clip c1').length).toBe(1), {
      timeout: 4000,
    });
    // simula clips selecionados que desaparecem da lista carregada (vieram de
    // outra origem/outro batch); a consulta por ID precisa encontra-los no db
    fireEvent.click(screen.queryAllByRole('checkbox')[1]); // c1
    fireEvent.change(screen.getByPlaceholderText('Buscar por câmera...'), {
      target: { value: 'nao-existe' },
    });
    await waitFor(
      () => expect(screen.queryAllByText('Nenhuma gravação encontrada').length).toBe(1),
      { timeout: 4000 }
    );
    // botao continua disponivel para os 1 selecionados
    const delBtn = screen.queryByText('Excluir (1)');
    expect(delBtn).toBeTruthy();
    fireEvent.click(delBtn as HTMLElement);
    await waitFor(() => expect(removedCalls.length).toBeGreaterThan(0), { timeout: 4000 });
    expect(deletedIds).toEqual(['c1']);
    const removedPaths = removedCalls.flat();
    expect(removedPaths).toContain('user-1/cam-1/clip-c1.webm');
  });
});
