import { describe, expect, it } from 'vitest';
import {
  HEARTBEAT_TIMEOUT_MS,
  MAX_DETACHED_WINDOWS,
  applyClosed,
  applyHeartbeat,
  isAlive,
  planDetach,
  reconcileHeartbeats,
} from '@/lib/views/detachedMonitor';

const T0 = 1_000_000;

describe('detachedMonitor — livro de janelas destacadas', () => {
  it('abre a primeira janela e foca a segunda solicitação da mesma câmera', () => {
    const first = planDetach({ registry: {}, cameraId: 'cam-1', now: T0 });
    expect(first.decision).toBe('open');

    const second = planDetach({ registry: first.registry, cameraId: 'cam-1', now: T0 + 1_000 });
    expect(second.decision).toBe('focus_existing');
    expect(second.windowName).toBe(first.windowName);
    expect(Object.keys(second.registry)).toHaveLength(1);
  });

  it('considera perdida a janela sem batida e reabre com nova identidade', () => {
    const opened = planDetach({ registry: {}, cameraId: 'cam-1', now: T0 });
    const later = T0 + HEARTBEAT_TIMEOUT_MS + 1;

    expect(reconcileHeartbeats(opened.registry, later).lost).toEqual(['cam-1']);

    const again = planDetach({ registry: opened.registry, cameraId: 'cam-1', now: later });
    expect(again.decision).toBe('reopen_stale');
    expect(again.windowName).not.toBe(opened.windowName);
  });

  it('nunca rebaixa a batida mais recente e ignora janela órfã', () => {
    const opened = planDetach({ registry: {}, cameraId: 'cam-1', now: T0 });
    const name = opened.registry['cam-1'].windowName;

    let reg = applyHeartbeat(opened.registry, { cameraId: 'cam-1', windowName: name, at: T0 + 5_000 });
    reg = applyHeartbeat(reg, { cameraId: 'cam-1', windowName: name, at: T0 + 2_000 });
    expect(reg['cam-1'].lastHeartbeatAt).toBe(T0 + 5_000);

    const orphan = applyHeartbeat(reg, { cameraId: 'cam-1', windowName: 'antiga', at: T0 + 9_000 });
    expect(orphan['cam-1'].windowName).toBe(name);
    expect(orphan['cam-1'].lastHeartbeatAt).toBe(T0 + 5_000);
  });

  it('recusa no teto sem despejar janela viva', () => {
    let reg = {};
    for (let i = 0; i < MAX_DETACHED_WINDOWS; i += 1) {
      reg = planDetach({ registry: reg, cameraId: `cam-${i}`, now: T0 }).registry;
    }
    const extra = planDetach({ registry: reg, cameraId: 'cam-extra', now: T0 });
    expect(extra.decision).toBe('refused_quota');
    expect(extra.windowName).toBeNull();
    expect(Object.keys(extra.registry)).toHaveLength(MAX_DETACHED_WINDOWS);
  });

  it('relógio para trás não mata janela viva', () => {
    const opened = planDetach({ registry: {}, cameraId: 'cam-1', now: T0 });
    expect(isAlive(opened.registry['cam-1'], T0 - 500_000)).toBe(true);
  });

  it('fechar é idempotente e inerte para janela desconhecida', () => {
    const opened = planDetach({ registry: {}, cameraId: 'cam-1', now: T0 });
    const once = applyClosed(opened.registry, 'cam-1');
    expect(once['cam-1']).toBeUndefined();
    expect(applyClosed(once, 'cam-1')).toBe(once);
    expect(applyClosed(opened.registry, 'fantasma')).toBe(opened.registry);
  });

  it('recusa identificador inválido sem tocar no livro', () => {
    const plan = planDetach({ registry: {}, cameraId: '   ', now: T0 });
    expect(plan.decision).toBe('refused_invalid');
    expect(Object.keys(plan.registry)).toHaveLength(0);
  });
});
