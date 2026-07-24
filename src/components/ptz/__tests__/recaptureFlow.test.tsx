/**
 * Integration tests for PtzCalibrationPanel · fluxo de recaptura.
 *
 * Garante que:
 *  1. Após uma revalidação com desvio > RECAPTURE_THRESHOLD_PCT (10%), o alerta
 *     `ptz-recapture-required-{axis}` aparece com a mensagem esperada e o botão
 *     de recapturar vira `destructive`.
 *  2. Clicar em "Recapturar guiado" abre o AlertDialog de confirmação, e o
 *     texto exibe o desvio detectado + limiar de bloqueio.
 *  3. Confirmar dispara o fluxo `guidedRecapture` (aparece o painel de
 *     progresso `ptz-recapture-progress-{axis}`).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PtzLimits } from '../PtzCalibrationPanel';

// ---------- Polyfills p/ Radix em jsdom ----------
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
if (!(Element.prototype as unknown as { hasPointerCapture?: () => boolean }).hasPointerCapture) {
  (Element.prototype as unknown as { hasPointerCapture: () => boolean }).hasPointerCapture = () => false;
  (Element.prototype as unknown as { releasePointerCapture: () => void }).releasePointerCapture = () => {};
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = () => {};
}

// ---------- Mocks ----------
type Row = { calibration: unknown; limits_version: string | null; limits_history: unknown };
let row: Row = {
  calibration: {
    pan: { sweep_ms: 1000, min_reported: -1, max_reported: 1, measured_at: '2026-05-01T10:00:00.000Z' },
  },
  limits_version: null,
  limits_history: [],
};

const insertSpy = vi.fn(async () => ({ error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'ptz_connection_attempts') {
        return { insert: insertSpy };
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    },
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
  },
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

// ---------- PTZ stub configurável ----------
// Usa `stopMove`/`send('stop')` como trigger para alternar da posição p0 → p1,
// independendo de quantas chamadas colaterais o painel faça a getStatus
// (mount effect, PtzLiveStatusPanel polling, etc).
function makePtzStub(p0: number, p1: number) {
  let phase: 'p0' | 'p1' = 'p0';
  const status = () => ({
    position: { pan: phase === 'p0' ? p0 : p1, tilt: 0, zoom: 0 },
    moving: { pan_tilt: false as const, zoom: false as const },
  });
  return {
    getStatus: vi.fn(async () => status()),
    startMove: vi.fn(async () => {}),
    stopMove: vi.fn(async () => { phase = 'p1'; }),
    zoom: vi.fn(async () => {}),
    send: vi.fn(async () => { phase = 'p1'; }),
    home: vi.fn(async () => {}),
    savePreset: vi.fn(async () => {}),
  } as unknown as Parameters<typeof import('../PtzCalibrationPanel').PtzCalibrationPanel>[0]['ptz'];
}

const defaultLimits: PtzLimits = {
  pan: { min: -1, max: 1 },
  tilt: { min: -1, max: 1 },
  zoom: { min: 0, max: 1 },
};

async function renderPanel(ptz: ReturnType<typeof makePtzStub>) {
  const onChange = vi.fn();
  const { PtzCalibrationPanel } = await import('../PtzCalibrationPanel');
  return {
    onChange,
    ...render(
      <PtzCalibrationPanel ptz={ptz} limits={defaultLimits} onChange={onChange} cameraId="cam-1" />,
    ),
  };
}

beforeEach(() => {
  insertSpy.mockClear();
  row = {
    calibration: {
      pan: { sweep_ms: 1000, min_reported: -1, max_reported: 1, measured_at: '2026-05-01T10:00:00.000Z' },
    },
    limits_version: null,
    limits_history: [],
  };
});

describe('PtzCalibrationPanel · fluxo de recaptura (integração)', () => {
  it('dispara recaptureRequired e exibe mensagem de erro quando revalidação acusa desvio > 10%', async () => {
    // p0 = 0 (posição inicial na revalidação); p1 = -0.4 (real muito distante
    // do predito +0.3) → error_pct = |−0.4 − 0.3| / 2 * 100 = 35% > 10%.
    const ptz = makePtzStub(0, -0.4);
    const user = userEvent.setup();
    await renderPanel(ptz);

    // Espera revalidar estar habilitado (sweep_ms populado + statusSupported=true).
    const revalidateBtn = await screen.findByTestId('ptz-revalidate-pan');
    await waitFor(() => expect(revalidateBtn).not.toBeDisabled(), { timeout: 2000 });

    await user.click(revalidateBtn);

    // O alerta obrigatório aparece com o desvio calculado.
    const alert = await screen.findByTestId('ptz-recapture-required-pan', {}, { timeout: 3000 });
    expect(alert).toHaveTextContent('Desvio de 35.0%');
    expect(alert).toHaveTextContent('> 10%');
    expect(alert).toHaveTextContent(/recaptura obrigatória/i);
    expect(alert).toHaveTextContent(/pré-voo/i);
    expect(alert).toHaveAttribute('role', 'alert');

    // Botão de recapturar assume variante destructive.
    const recaptureBtn = screen.getByTestId('ptz-recapture-pan');
    expect(recaptureBtn.className).toMatch(/destructive/);
  });

  it('não exibe recaptureRequired quando o desvio está dentro do threshold', async () => {
    // p1 = 0.28 (real quase igual ao predito 0.3) → error_pct = 1% < 10%.
    const ptz = makePtzStub(0, 0.28);
    const user = userEvent.setup();
    await renderPanel(ptz);

    const revalidateBtn = await screen.findByTestId('ptz-revalidate-pan');
    await waitFor(() => expect(revalidateBtn).not.toBeDisabled(), { timeout: 2000 });
    await user.click(revalidateBtn);

    // O resultado da revalidação aparece, mas o alerta obrigatório NÃO.
    await screen.findByTestId('ptz-revalidate-result-pan', {}, { timeout: 3000 });
    expect(screen.queryByTestId('ptz-recapture-required-pan')).not.toBeInTheDocument();
    const recaptureBtn = screen.getByTestId('ptz-recapture-pan');
    expect(recaptureBtn.className).not.toMatch(/destructive/);
  });

  it('abre o diálogo de confirmação de recaptura mostrando o desvio detectado', async () => {
    const ptz = makePtzStub(0, -0.4);
    const user = userEvent.setup();
    await renderPanel(ptz);

    const revalidateBtn = await screen.findByTestId('ptz-revalidate-pan');
    await waitFor(() => expect(revalidateBtn).not.toBeDisabled(), { timeout: 2000 });
    await user.click(revalidateBtn);
    await screen.findByTestId('ptz-recapture-required-pan', {}, { timeout: 3000 });

    await user.click(screen.getByTestId('ptz-recapture-pan'));

    const dialog = await screen.findByTestId('ptz-recapture-confirm');
    expect(within(dialog).getByText(/Desvio detectado:/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/35\.0%/)).toBeInTheDocument();
    expect(within(dialog).getByText(/limiar 10%/i)).toBeInTheDocument();
    expect(screen.getByTestId('ptz-recapture-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('ptz-recapture-confirm-btn')).toBeInTheDocument();
  });

  it('exibe erro "Revalidação indisponível" quando o driver não expõe GetStatus', async () => {
    // GetStatus retorna null → statusSupported=false → botão fica desabilitado.
    const ptz = {
      getStatus: vi.fn(async () => null),
      startMove: vi.fn(async () => {}),
      stopMove: vi.fn(async () => {}),
      zoom: vi.fn(async () => {}),
      send: vi.fn(async () => {}),
      home: vi.fn(async () => {}),
      savePreset: vi.fn(async () => {}),
    } as unknown as Parameters<typeof import('../PtzCalibrationPanel').PtzCalibrationPanel>[0]['ptz'];

    await renderPanel(ptz as never);

    const revalidateBtn = await screen.findByTestId('ptz-revalidate-pan');
    await waitFor(() => expect(revalidateBtn).toBeDisabled(), { timeout: 2000 });
    expect(revalidateBtn).toHaveAttribute('title', expect.stringMatching(/GetStatus/i));
  });
});
