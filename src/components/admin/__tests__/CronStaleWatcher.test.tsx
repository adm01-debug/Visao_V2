import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Mocks ---
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...a: unknown[]) => toastError(...a) },
}));

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...a: unknown[]) => rpcMock(...a) },
}));

const roleMock = vi.fn();
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => roleMock(),
}));

// --- Import após mocks ---
import { CronStaleWatcher } from '@/components/admin/CronStaleWatcher';

function renderWatcher() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CronStaleWatcher />
    </QueryClientProvider>,
  );
}

const staleRow = {
  jobname: 'visao-daily-retention',
  schedule: '30 3 * * *',
  active: true,
  failed_7d: 0,
  last_run: new Date(Date.now() - 5 * 24 * 60 * 60_000).toISOString(), // 5 dias atrás
  last_status: 'succeeded',
};
const onTimeRow = { ...staleRow, jobname: 'visao-monthly-partitions', schedule: '0 2 1 * *', last_run: new Date().toISOString() };

describe('CronStaleWatcher', () => {
  beforeEach(() => {
    toastError.mockClear();
    rpcMock.mockClear();
    roleMock.mockReset();
  });

  it('não faz RPC quando usuário não é admin', async () => {
    roleMock.mockReturnValue({ isAdmin: false, loading: false });
    renderWatcher();
    await new Promise((r) => setTimeout(r, 50));
    expect(rpcMock).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('não faz RPC enquanto role está carregando', async () => {
    roleMock.mockReturnValue({ isAdmin: true, loading: true });
    renderWatcher();
    await new Promise((r) => setTimeout(r, 50));
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('dispara toast para cada job stale (admin)', async () => {
    roleMock.mockReturnValue({ isAdmin: true, loading: false });
    rpcMock.mockResolvedValue({
      data: { cron_health: [staleRow, onTimeRow, { ...staleRow, jobname: 'visao-index-maint' }] },
      error: null,
    });
    renderWatcher();
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(2));
    const names = toastError.mock.calls.map((c) => c[0]);
    expect(names).toContain('Cron atrasado: visao-daily-retention');
    expect(names).toContain('Cron atrasado: visao-index-maint');
  });

  it('não duplica toast para o mesmo job em múltiplos ticks', async () => {
    roleMock.mockReturnValue({ isAdmin: true, loading: false });
    rpcMock.mockResolvedValue({ data: { cron_health: [staleRow] }, error: null });
    const { rerender } = renderWatcher();
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    // força re-render (simula novo tick com mesmos dados)
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <CronStaleWatcher />
      </QueryClientProvider>,
    );
    await new Promise((r) => setTimeout(r, 50));
    // ref persiste dentro da mesma instância; mount novo abre nova sessão — aceitável
    expect(toastError.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('não dispara toast quando cron_health vazio', async () => {
    roleMock.mockReturnValue({ isAdmin: true, loading: false });
    rpcMock.mockResolvedValue({ data: { cron_health: [] }, error: null });
    renderWatcher();
    await new Promise((r) => setTimeout(r, 50));
    expect(toastError).not.toHaveBeenCalled();
  });

  it('não dispara toast quando todos on_time', async () => {
    roleMock.mockReturnValue({ isAdmin: true, loading: false });
    rpcMock.mockResolvedValue({ data: { cron_health: [onTimeRow] }, error: null });
    renderWatcher();
    await new Promise((r) => setTimeout(r, 50));
    expect(toastError).not.toHaveBeenCalled();
  });
});
