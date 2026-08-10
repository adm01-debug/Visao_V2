/**
 * Integração — Auditoria de `ptz_connection_attempts` no fluxo de recaptura.
 *
 * Cobre o INSERT executado no bloco `finally` de `guidedRecapture`:
 *   - Colunas fixas: user_id, camera_id, backend=`recapture:<axis>`,
 *     reachable, http_status=0, used_relay=false, source='recapture'.
 *   - `ok`: true apenas quando o outcome for 'ok' (min<max, ambos válidos).
 *   - `latency_ms`: número inteiro ≥ 0 (calculado a partir do performance.now).
 *   - `error_detail` (JSON string): {axis, outcome, min_reported, max_reported,
 *     stage, aborted, error}.
 *
 * Cenários exercitados:
 *   1. Sucesso → ok=true, outcome='ok', error=null, min/max populados.
 *   2. Inválido (min ≥ max) → ok=false, outcome='invalid', mensagem em `error`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PtzLimits } from '../PtzCalibrationPanel';

// ---------- Polyfills p/ Radix em jsdom ----------
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

// ---------- Mocks Supabase ----------
type InsertPayload = Record<string, unknown>;
const insertSpy = vi.fn(async (_payload: InsertPayload) => ({ error: null }));

const row = {
  calibration: {
    pan: {
      sweep_ms: 1000,
      min_reported: -1,
      max_reported: 1,
      measured_at: '2026-05-01T10:00:00.000Z',
    },
  },
  limits_version: null,
  limits_history: [],
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'ptz_connection_attempts') {
        return { insert: (p: InsertPayload) => insertSpy(p) };
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }),
          order: () => ({ limit: async () => ({ data: [], error: null }) }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    },
    auth: { getUser: async () => ({ data: { user: { id: 'user-42' } } }) },
  },
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

// ---------- PTZ stub baseado em posição retida ----------
/**
 * `startMove` movimenta o dome instantaneamente para `min` (dir<0) ou
 * `max` (dir>0); `stopMove` mantém a posição. `getStatus` sempre reporta
 * `moving.pan_tilt=false`, permitindo que o loop de driveToStall detecte
 * o fim de curso pela condição `|p - p0| > STALL_EPSILON * range * 0.5`.
 */
function makeHeldPositionPtz(minPos: number, maxPos: number) {
  let currentPan = 0;
  return {
    getStatus: vi.fn(async () => ({
      position: { pan: currentPan, tilt: 0, zoom: 0 },
      moving: { pan_tilt: false as const, zoom: false as const },
    })),
    startMove: vi.fn(async (p: { pan?: number; tilt?: number }) => {
      const v = p.pan ?? 0;
      if (v < 0) currentPan = minPos;
      else if (v > 0) currentPan = maxPos;
    }),
    stopMove: vi.fn(async () => {
      /* posição retida */
    }),
    zoom: vi.fn(async () => {}),
    send: vi.fn(async () => {}),
    home: vi.fn(async () => {}),
    savePreset: vi.fn(async () => {}),
  } as unknown as Parameters<typeof import('../PtzCalibrationPanel').PtzCalibrationPanel>[0]['ptz'];
}

const defaultLimits: PtzLimits = {
  pan: { min: -1, max: 1 },
  tilt: { min: -1, max: 1 },
  zoom: { min: 0, max: 1 },
};

async function renderPanel(ptz: ReturnType<typeof makeHeldPositionPtz>) {
  const onChange = vi.fn();
  const { PtzCalibrationPanel } = await import('../PtzCalibrationPanel');
  render(
    <PtzCalibrationPanel ptz={ptz} limits={defaultLimits} onChange={onChange} cameraId="cam-7" />
  );
  return { onChange };
}

async function triggerRecapture(user: ReturnType<typeof userEvent.setup>) {
  const btn = await screen.findByTestId('ptz-recapture-pan');
  await waitFor(() => expect(btn).not.toBeDisabled(), { timeout: 15000 });
  await user.click(btn);
  const confirmBtn = await screen.findByTestId('ptz-recapture-confirm-btn');
  await user.click(confirmBtn);
}

/** Helper: extrai e parseia o `error_detail` da última chamada de insert. */
function lastInsertPayload(): InsertPayload {
  // Indexação explícita em vez de `.at(-1)`: a lib de tipos deste tsconfig é
  // anterior a ES2022 e não declara Array.prototype.at.
  const calls = insertSpy.mock.calls;
  const call = calls.length > 0 ? calls[calls.length - 1] : undefined;
  if (!call) throw new Error('insertSpy não recebeu chamadas');
  return call[0] as InsertPayload;
}

function parseErrorDetail(p: InsertPayload): Record<string, unknown> {
  const raw = p.error_detail;
  if (typeof raw !== 'string') throw new Error('error_detail não é string');
  return JSON.parse(raw) as Record<string, unknown>;
}

beforeEach(() => {
  insertSpy.mockClear();
});

describe('PtzCalibrationPanel · auditoria de recaptura em ptz_connection_attempts', () => {
  it('recaptura bem-sucedida insere ok=true com payload completo', async () => {
    const ptz = makeHeldPositionPtz(-0.85, 0.85);
    const user = userEvent.setup();
    await renderPanel(ptz);

    await triggerRecapture(user);

    // O INSERT ocorre no `finally` — aguarda até que o spy seja chamado.
    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1), {
      timeout: 15000,
    });

    const payload = lastInsertPayload();

    // Colunas fixas e identificação.
    expect(payload).toMatchObject({
      user_id: 'user-42',
      camera_id: 'cam-7',
      backend: 'recapture:pan',
      ok: true,
      reachable: true,
      http_status: 0,
      used_relay: false,
      source: 'recapture',
    });

    // Latência: inteira, não-negativa e finita.
    expect(typeof payload.latency_ms).toBe('number');
    expect(payload.latency_ms as number).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(payload.latency_ms as number)).toBe(true);
    expect(Number.isInteger(payload.latency_ms as number)).toBe(true);

    // error_detail (JSON) com os campos esperados.
    const detail = parseErrorDetail(payload);
    expect(detail).toMatchObject({
      axis: 'pan',
      outcome: 'ok',
      aborted: false,
      error: null,
    });
    expect(detail.min_reported).toBeCloseTo(-0.85, 5);
    expect(detail.max_reported).toBeCloseTo(0.85, 5);
    // Stage capturado no momento do finally — snapshot React (pode ser
    // 'idle', 'to-min', 'to-max' ou 'done' dependendo do agendamento).
    expect(['idle', 'to-min', 'to-max', 'done']).toContain(detail.stage);
  });

  it('recaptura inválida (min ≥ max) insere ok=false com outcome="invalid" e mensagem em error', async () => {
    // Dome reporta min=0.5 e max=0.3 → pMin >= pMax → outcome='invalid'.
    const ptz = makeHeldPositionPtz(0.5, 0.3);
    const user = userEvent.setup();
    await renderPanel(ptz);

    await triggerRecapture(user);

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1), {
      timeout: 15000,
    });

    const payload = lastInsertPayload();

    expect(payload).toMatchObject({
      user_id: 'user-42',
      camera_id: 'cam-7',
      backend: 'recapture:pan',
      ok: false, // <-- FALHA persistida
      reachable: true,
      http_status: 0,
      used_relay: false,
      source: 'recapture',
    });

    const detail = parseErrorDetail(payload);
    expect(detail).toMatchObject({
      axis: 'pan',
      outcome: 'invalid',
      aborted: false,
    });
    expect(detail.min_reported).toBeCloseTo(0.5, 5);
    expect(detail.max_reported).toBeCloseTo(0.3, 5);
    // Mensagem legível de erro contém "Recaptura inválida" + valores.
    expect(typeof detail.error).toBe('string');
    expect(detail.error as string).toMatch(/Recaptura inválida/i);
    expect(detail.error as string).toMatch(/0\.50/);
    expect(detail.error as string).toMatch(/0\.30/);
  });

  it('cancelar o diálogo de confirmação NÃO gera INSERT de auditoria', async () => {
    const ptz = makeHeldPositionPtz(-0.85, 0.85);
    const user = userEvent.setup();
    await renderPanel(ptz);

    const btn = await screen.findByTestId('ptz-recapture-pan');
    await waitFor(() => expect(btn).not.toBeDisabled(), { timeout: 15000 });
    await user.click(btn);

    const cancelBtn = await screen.findByTestId('ptz-recapture-cancel');
    await user.click(cancelBtn);

    // Aguarda um tick para garantir que nenhum insert assíncrono foi disparado.
    await new Promise((r) => setTimeout(r, 200));
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
