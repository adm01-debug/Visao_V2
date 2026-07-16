import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';


const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...a: unknown[]) => rpcMock(...a) },
}));

const roleMock = vi.fn();
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => roleMock(),
}));

import { CronStaleBadge } from '@/components/admin/CronStaleBadge';

function renderBadge() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <CronStaleBadge />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const staleDay = new Date(Date.now() - 5 * 86400000).toISOString();

describe('CronStaleBadge', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    roleMock.mockReset();
  });

  it('não renderiza para não-admin', async () => {
    roleMock.mockReturnValue({ isAdmin: false, loading: false });
    const { container } = renderBadge();
    await new Promise((r) => setTimeout(r, 30));
    expect(container.firstChild).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('não renderiza quando role está carregando', async () => {
    roleMock.mockReturnValue({ isAdmin: true, loading: true });
    const { container } = renderBadge();
    await new Promise((r) => setTimeout(r, 30));
    expect(container.firstChild).toBeNull();
  });

  it('não renderiza quando nenhum job stale', async () => {
    roleMock.mockReturnValue({ isAdmin: true, loading: false });
    rpcMock.mockResolvedValue({
      data: { cron_health: [{ jobname: 'visao-x', schedule: '* * * * *', active: true, failed_7d: 0, last_run: new Date().toISOString(), last_status: 'ok' }] },
      error: null,
    });
    const { container } = renderBadge();
    await new Promise((r) => setTimeout(r, 60));
    expect(container.textContent ?? '').not.toContain('atrasado');
  });

  it('renderiza contagem singular', async () => {
    roleMock.mockReturnValue({ isAdmin: true, loading: false });
    rpcMock.mockResolvedValue({
      data: { cron_health: [{ jobname: 'visao-daily', schedule: '30 3 * * *', active: true, failed_7d: 0, last_run: staleDay, last_status: 'ok' }] },
      error: null,
    });
    renderBadge();
    await waitFor(() => expect(screen.getByText(/1 cron atrasado/)).toBeInTheDocument());
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/operations');
  });

  it('renderiza contagem plural', async () => {
    roleMock.mockReturnValue({ isAdmin: true, loading: false });
    rpcMock.mockResolvedValue({
      data: {
        cron_health: [
          { jobname: 'visao-a', schedule: '30 3 * * *', active: true, failed_7d: 0, last_run: staleDay, last_status: 'ok' },
          { jobname: 'visao-b', schedule: '30 3 * * *', active: true, failed_7d: 0, last_run: staleDay, last_status: 'ok' },
          { jobname: 'visao-c', schedule: '30 3 * * *', active: true, failed_7d: 0, last_run: staleDay, last_status: 'ok' },
        ],
      },
      error: null,
    });
    renderBadge();
    await waitFor(() => expect(screen.getByText(/3 crons atrasados/)).toBeInTheDocument());
  });
});
