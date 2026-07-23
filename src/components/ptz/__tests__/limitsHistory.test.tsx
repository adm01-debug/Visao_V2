import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PtzLimits } from '../PtzCalibrationPanel';

// Mock supabase antes de importar o painel
type Row = { calibration: unknown; limits_version: string | null; limits_history: unknown };
let row: Row = { calibration: null, limits_version: null, limits_history: [] };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row, error: null }),
        }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

const ptzStub = {
  getStatus: async () => null,
  startMove: vi.fn(async () => {}),
  stopMove: vi.fn(async () => {}),
  zoom: vi.fn(async () => {}),
  home: vi.fn(async () => {}),
  savePreset: vi.fn(async () => {}),
} as unknown as Parameters<typeof import('../PtzCalibrationPanel').PtzCalibrationPanel>[0]['ptz'];

const defaultLimits: PtzLimits = {
  pan: { min: -1, max: 1 },
  tilt: { min: -1, max: 1 },
  zoom: { min: 0, max: 1 },
};

async function renderPanel(onChange = vi.fn()) {
  const { PtzCalibrationPanel } = await import('../PtzCalibrationPanel');
  return {
    onChange,
    ...render(
      <PtzCalibrationPanel ptz={ptzStub} limits={defaultLimits} onChange={onChange} cameraId="cam-1" />,
    ),
  };
}

beforeEach(() => {
  row = { calibration: null, limits_version: null, limits_history: [] };
});

describe('PtzCalibrationPanel · versionamento de limits', () => {
  it('exibe "sem versão salva" quando não há version', async () => {
    await renderPanel();
    await waitFor(() =>
      expect(screen.getByTestId('limits-version-badge').textContent).toContain('sem versão salva'),
    );
  });

  it('exibe versão formatada quando presente', async () => {
    row = { calibration: null, limits_version: '2026-05-01T10:00:00.000Z', limits_history: [] };
    await renderPanel();
    await waitFor(() =>
      expect(screen.getByTestId('limits-version-badge').textContent).toMatch(/v · /),
    );
  });

  it('desabilita botão Reverter com history vazio', async () => {
    await renderPanel();
    await waitFor(() => {
      const btn = screen.getByTestId('limits-rollback-trigger');
      expect(btn).toBeDisabled();
    });
  });

  it('clicar num item chama onChange com o snapshot', async () => {
    const snap: PtzLimits = {
      pan: { min: -0.5, max: 0.7 },
      tilt: { min: -0.3, max: 0.4 },
      zoom: { min: 0.1, max: 0.9 },
    };
    row = {
      calibration: null,
      limits_version: '2026-05-01T10:00:00.000Z',
      limits_history: [{ limits: snap, saved_at: '2026-04-01T09:00:00.000Z', source: 'wizard' }],
    };
    const user = userEvent.setup();
    const { onChange } = await renderPanel();
    const trigger = await screen.findByTestId('limits-rollback-trigger');
    await waitFor(() => expect(trigger).not.toBeDisabled());
    await user.click(trigger);
    const item = await screen.findByTestId('limits-rollback-item');
    await user.click(item);
    expect(onChange).toHaveBeenCalledWith(snap);
  });
});
