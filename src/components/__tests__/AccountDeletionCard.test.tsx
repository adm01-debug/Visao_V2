import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Polyfills p/ Radix (jsdom)
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

const h = vi.hoisted(() => ({
  invoke: vi.fn(),
  signOut: vi.fn(),
  navigate: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => h.invoke(...a) } },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'operador@empresa.com' }, signOut: h.signOut }),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));

vi.mock('sonner', () => ({
  toast: {
    error: (...a: unknown[]) => h.toastError(...a),
    success: (...a: unknown[]) => h.toastSuccess(...a),
  },
}));

import { AccountDeletionCard } from '@/components/security/AccountDeletionCard';

async function openDialog() {
  const user = userEvent.setup();
  render(<AccountDeletionCard />);
  await user.click(screen.getByRole('button', { name: /excluir minha conta/i }));
  return user;
}

const confirmButton = () => screen.getByRole('button', { name: /excluir definitivamente/i });
const confirmField = () => screen.getByLabelText(/digite .*excluir/i);

describe('AccountDeletionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.invoke.mockResolvedValue({ data: { success: true }, error: null });
    h.signOut.mockResolvedValue(undefined);
  });

  it('exclui a conta, encerra a sessão e sai da área autenticada', async () => {
    const user = await openDialog();

    expect(confirmButton()).toBeDisabled();
    await user.type(confirmField(), 'excluir');
    expect(confirmButton()).toBeEnabled();

    await user.click(confirmButton());

    await waitFor(() =>
      expect(h.invoke).toHaveBeenCalledWith('delete-my-account', { method: 'POST' })
    );
    await waitFor(() => expect(h.signOut).toHaveBeenCalledTimes(1));
    expect(h.navigate).toHaveBeenCalledWith('/auth', { replace: true });
    expect(h.toastSuccess).toHaveBeenCalled();
  });

  it('exige exatamente a palavra de confirmação', async () => {
    const user = await openDialog();

    await user.type(confirmField(), 'EXCLUIR TUDO');
    expect(confirmButton()).toBeDisabled();

    await user.click(confirmButton());
    expect(h.invoke).not.toHaveBeenCalled();
  });

  it('mostra o erro do servidor e não encerra a sessão quando a exclusão falha', async () => {
    h.invoke.mockResolvedValue({
      error: {
        message: 'Edge function returned a non-2xx status code',
        context: { json: async () => ({ error: 'Erro ao limpar dados: timeout' }) },
      },
    });

    const user = await openDialog();
    await user.type(confirmField(), 'EXCLUIR');
    await user.click(confirmButton());

    await waitFor(() => expect(h.toastError).toHaveBeenCalledWith('Erro ao limpar dados: timeout'));
    expect(h.signOut).not.toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
  });
});
