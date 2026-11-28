import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsBackupCard } from '../settings/SettingsBackupCard';

const invoke = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

const BACKUP = {
  schema_version: '1.0.0',
  exported_at: '2026-11-26T00:00:00.000Z',
  data: {
    cameras: [{ id: 'c1' }, { id: 'c2' }],
    zones: [{ id: 'z1', camera_id: 'c1' }],
    rules: [],
    notifications: [],
  },
};

function jsonFile(payload: unknown, name = 'backup.json'): File {
  const file = new File([JSON.stringify(payload)], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(JSON.stringify(payload)) });
  return file;
}

function pickFile(file: File) {
  const input = screen.getByLabelText('Arquivo de backup para importar') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe('SettingsBackupCard', () => {
  beforeEach(() => {
    invoke.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = vi.fn(() => 'blob:url');
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('exporta a configuração pela edge function e baixa o arquivo', async () => {
    invoke.mockResolvedValue({ data: BACKUP, error: null });
    render(<SettingsBackupCard />);

    fireEvent.click(screen.getByRole('button', { name: /exportar configuração/i }));

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('settings-backup', { method: 'GET' }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledWith('Backup gerado (2 câmeras, 1 zonas)');
  });

  it('avisa quando o servidor falha ao gerar o backup em vez de baixar arquivo vazio', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'relation "cameras" does not exist' },
    });
    render(<SettingsBackupCard />);

    fireEvent.click(screen.getByRole('button', { name: /exportar configuração/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('recusa arquivo cujo campo data não é um objeto', async () => {
    render(<SettingsBackupCard />);

    pickFile(jsonFile({ schema_version: '1.0.0', data: 'cameras' }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(String(toastError.mock.calls[0][0])).toContain('data');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('recusa arquivo com schema incompatível sem chamar o servidor', async () => {
    render(<SettingsBackupCard />);

    pickFile(jsonFile({ schema_version: '0.9.0', data: { cameras: [] } }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(String(toastError.mock.calls[0][0])).toContain('schema 1.0.0');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('mostra a prévia do arquivo e só importa depois da confirmação', async () => {
    invoke.mockResolvedValue({
      data: { data: { imported: { cameras: 2, zones: 0, rules: 0 }, skipped: 1 } },
      error: null,
    });
    render(<SettingsBackupCard />);

    pickFile(jsonFile(BACKUP));

    expect(await screen.findByText(/2 câmeras, 1 zonas/)).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /confirmar importação/i }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('settings-backup', {
        method: 'POST',
        body: {
          schema_version: '1.0.0',
          data: BACKUP.data,
          conflict_strategy: 'skip',
        },
      })
    );
    expect(await screen.findByText(/2 registro\(s\) importado\(s\), 1 ignorado/)).toBeTruthy();
  });
});
