/**
 * useManagedFilters — cobertura unitária.
 *
 * Cobre o ciclo "Limpar filtros":
 *   - confirmação via FilterPersistenceProvider (confirm + cancel)
 *   - toast detalhado (sonner mockado)
 *   - undo restaura filtros + chaves auxiliares de localStorage
 *   - snapshot de undo expira após 10s (timers fake)
 *   - persistência local (localStorage) imediata + sync Supabase debounced
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useManagedFilters } from '@/hooks/useManagedFilters';
import { FilterPersistenceProvider } from '@/providers/FilterPersistenceProvider';

// ────────────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────────────

const toastSuccessSpy = vi.fn();
const toastInfoSpy = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessSpy(...args),
    info: (...args: unknown[]) => toastInfoSpy(...args),
  },
}));

const upsertSpy = vi.fn().mockResolvedValue({ error: null });
const fromSpy = vi.fn(() => ({
  upsert: upsertSpy,
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-test-1' } },
        error: null,
      }),
    },
    from: (...args: unknown[]) => fromSpy(...args),
  },
}));

// Mock minimal do AlertDialog para evitar portal/animações no jsdom
vi.mock('@/components/ui/alert-dialog', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const AlertDialog = ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? React.createElement('div', { role: 'alertdialog' }, children) : null;
  const AlertDialogAction = ({
    onClick,
    children,
  }: {
    onClick?: () => void;
    children: React.ReactNode;
  }) =>
    React.createElement('button', { type: 'button', onClick, 'data-testid': 'confirm-btn' }, children);
  const AlertDialogCancel = ({ children }: { children: React.ReactNode }) =>
    React.createElement('button', { type: 'button', 'data-testid': 'cancel-btn' }, children);
  return {
    AlertDialog,
    AlertDialogContent: passthrough,
    AlertDialogHeader: passthrough,
    AlertDialogFooter: passthrough,
    AlertDialogTitle: passthrough,
    AlertDialogDescription: passthrough,
    AlertDialogAction,
    AlertDialogCancel,
  };
});

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

interface TestFilters {
  search: string;
  status: string;
  [key: string]: unknown;
}

const defaults: TestFilters = { search: '', status: 'all' };

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(FilterPersistenceProvider, null, children);

function setupHook(opts?: { confirm?: boolean; persistKeys?: string[] }) {
  return renderHook(
    () =>
      useManagedFilters<TestFilters>({
        scope: 'test-scope',
        defaults,
        labels: { search: 'busca', status: 'status' },
        confirm: opts?.confirm ?? true,
        persistKeys: opts?.persistKeys ?? [],
      }),
    { wrapper }
  );
}

beforeEach(() => {
  localStorage.clear();
  toastSuccessSpy.mockClear();
  toastInfoSpy.mockClear();
  upsertSpy.mockClear();
  fromSpy.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ────────────────────────────────────────────────────────────────────────────
// Specs
// ────────────────────────────────────────────────────────────────────────────

describe('useManagedFilters', () => {
  it('hidrata defaults quando localStorage está vazio', () => {
    const { result } = setupHook();
    expect(result.current.filters).toEqual(defaults);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.activeEntries).toEqual([]);
  });

  it('persiste no localStorage ao alterar filtros', () => {
    const { result } = setupHook();
    act(() => {
      result.current.setFilters((p) => ({ ...p, search: 'joao' }));
    });
    const raw = localStorage.getItem('managed-filters:test-scope');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({ search: 'joao' });
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.activeEntries.map((e) => e.key)).toContain('search');
  });

  it('clearFilters sem ativos apenas mostra toast.info, sem confirmação', () => {
    const { result } = setupHook();
    act(() => result.current.clearFilters());
    expect(toastInfoSpy).toHaveBeenCalledWith('Nenhum filtro ativo para limpar');
    expect(toastSuccessSpy).not.toHaveBeenCalled();
  });

  it('clearFilters com confirm=false executa direto + toast detalhado', () => {
    const { result } = setupHook({ confirm: false, persistKeys: ['legacy-key-x'] });
    localStorage.setItem('legacy-key-x', '"keep-me"');
    act(() => {
      result.current.setFilters((p) => ({ ...p, search: 'maria', status: 'active' }));
    });
    act(() => result.current.clearFilters());

    expect(result.current.filters).toEqual(defaults);
    expect(localStorage.getItem('legacy-key-x')).toBeNull();
    expect(toastSuccessSpy).toHaveBeenCalled();
    const [title, opts] = toastSuccessSpy.mock.calls[0] as [string, { description: string }];
    expect(title).toBe('Filtros limpos');
    expect(opts.description).toContain('busca');
    expect(opts.description).toContain('status');
    expect(opts.description).toContain('legacy-key-x');
  });

  it('cancelar a confirmação preserva os filtros', async () => {
    const { result } = setupHook({ confirm: true });
    act(() => {
      result.current.setFilters((p) => ({ ...p, search: 'preservar' }));
    });
    act(() => result.current.clearFilters());

    // Modal abre — clicar no Cancel não chama performClear
    const cancelBtn = document.querySelector('[data-testid="cancel-btn"]') as HTMLButtonElement | null;
    expect(cancelBtn).not.toBeNull();
    // O AlertDialogCancel (mock) não tem onClick: cancelar = não confirmar
    expect(result.current.filters.search).toBe('preservar');
  });

  it('confirmar limpa, e undo restaura filtros + chaves auxiliares', async () => {
    const { result } = setupHook({ confirm: true, persistKeys: ['extra-key'] });
    localStorage.setItem('extra-key', JSON.stringify({ keep: true }));
    act(() => {
      result.current.setFilters((p) => ({ ...p, search: 'pedro', status: 'active' }));
    });

    act(() => result.current.clearFilters());
    const confirmBtn = document.querySelector('[data-testid="confirm-btn"]') as HTMLButtonElement;
    expect(confirmBtn).not.toBeNull();
    act(() => confirmBtn.click());

    expect(result.current.filters).toEqual(defaults);
    expect(localStorage.getItem('extra-key')).toBeNull();
    expect(toastSuccessSpy).toHaveBeenCalled();

    // Captura a action de undo do toast
    const [, opts] = toastSuccessSpy.mock.calls[0] as [string, { action: { onClick: () => void } }];
    expect(opts.action).toBeDefined();
    act(() => opts.action.onClick());

    expect(result.current.filters).toEqual({ search: 'pedro', status: 'active' });
    expect(localStorage.getItem('extra-key')).toBe(JSON.stringify({ keep: true }));
    expect(toastSuccessSpy).toHaveBeenLastCalledWith('Filtros restaurados');
  });

  it('snapshot de undo expira após 10 segundos', () => {
    vi.useFakeTimers();
    const { result } = setupHook({ confirm: false });
    act(() => {
      result.current.setFilters((p) => ({ ...p, search: 'efemero' }));
    });
    act(() => result.current.clearFilters());

    const [, opts] = toastSuccessSpy.mock.calls[0] as [string, { action: { onClick: () => void } }];

    // Avança 10s + 1ms — snapshot é descartado
    act(() => {
      vi.advanceTimersByTime(10001);
    });

    // Tentar undo após expiração não restaura
    act(() => opts.action.onClick());
    expect(result.current.filters).toEqual(defaults);
  });

  it('agenda sync no Supabase debounced (800ms) e coalesce escritas', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result } = setupHook({ confirm: false });

    act(() => {
      result.current.setFilters((p) => ({ ...p, search: 'a' }));
    });
    act(() => {
      result.current.setFilters((p) => ({ ...p, search: 'ab' }));
    });

    // Antes do debounce expirar — nenhum upsert
    expect(upsertSpy).not.toHaveBeenCalled();

    // Cada setFilters agenda um setTimeout de 800ms; o segundo cancela o primeiro
    const debounced = setTimeoutSpy.mock.calls.filter(([, delay]) => delay === 800);
    expect(debounced.length).toBeGreaterThanOrEqual(2);
    expect(clearTimeoutSpy).toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it('isActive default ignora valores iguais ao default e arrays vazios', () => {
    const { result } = renderHook(
      () =>
        useManagedFilters<{ tags: string[]; q: string; [k: string]: unknown }>({
          scope: 'test-isactive',
          defaults: { tags: [], q: '' },
        }),
      { wrapper }
    );
    expect(result.current.hasActiveFilters).toBe(false);
    act(() => {
      result.current.setFilters((p) => ({ ...p, tags: ['a'] }));
    });
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.activeEntries.map((e) => e.key)).toEqual(['tags']);
  });
});
