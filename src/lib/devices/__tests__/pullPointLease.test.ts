import { describe, expect, it } from 'vitest';
import {
  BACKOFF_CAP_MS,
  MAX_LEASE_MS,
  MIN_LEASE_MS,
  RENEW_FLOOR_MS,
  backoffDelayMs,
  clampLeaseMs,
  decidePullPoint,
  pullPointEventKey,
  renewThresholdMs,
  type PullPointSubscription,
} from '../pullPointLease';

const NOW = 1_800_000_000_000;

function sub(patch: Partial<PullPointSubscription> = {}): PullPointSubscription {
  return {
    id: 'sub-155',
    status: 'active',
    terminationAtMs: NOW + 300_000,
    leaseStartedAtMs: NOW,
    leaseDurationMs: 300_000,
    consecutiveFailures: 0,
    lastFailureKind: 'none',
    lastAttemptAtMs: NOW - 10_000,
    cameraEnabled: true,
    ...patch,
  };
}

describe('pullPointLease — empréstimo', () => {
  it('empréstimo vivo e folgado manda puxar mensagens', () => {
    expect(decidePullPoint(sub(), NOW)).toMatchObject({ action: 'pull', reason: 'lease_healthy' });
  });

  it('vencido recria, nunca renova (P2)', () => {
    const d = decidePullPoint(sub({ terminationAtMs: NOW - 1 }), NOW);
    expect(d.action).toBe('recreate');
    expect(d.reason).toBe('lease_expired');
  });

  it('perto do vencimento renova antes de morrer', () => {
    const d = decidePullPoint(sub({ terminationAtMs: NOW + 20_000, leaseStartedAtMs: null }), NOW);
    expect(d.action).toBe('renew');
  });

  it('nunca criada manda criar', () => {
    expect(decidePullPoint(sub({ terminationAtMs: null }), NOW).action).toBe('create');
  });

  it('antecipação respeita o piso em empréstimo curto', () => {
    expect(renewThresholdMs(MIN_LEASE_MS)).toBe(Math.round(MIN_LEASE_MS / 2));
    expect(renewThresholdMs(MAX_LEASE_MS)).toBeGreaterThanOrEqual(RENEW_FLOOR_MS);
  });

  it('empréstimo é normalizado para a faixa operável', () => {
    expect(clampLeaseMs(1)).toBe(MIN_LEASE_MS);
    expect(clampLeaseMs(9_999_999)).toBe(MAX_LEASE_MS);
    expect(clampLeaseMs(Number.NaN)).toBe(MIN_LEASE_MS);
  });
});

describe('pullPointLease — falhas', () => {
  it('credencial recusada recolhe a assinatura em vez de insistir (P3)', () => {
    const d = decidePullPoint(sub({ lastFailureKind: 'auth', consecutiveFailures: 1 }), NOW);
    expect(d).toMatchObject({ action: 'retire', reason: 'permanent_failure', terminal: true });
  });

  it('equipamento sem PullPoint também é caso terminal', () => {
    expect(decidePullPoint(sub({ lastFailureKind: 'unsupported' }), NOW).action).toBe('retire');
  });

  it('falha de transporte espera o degrau do recuo', () => {
    const s = sub({ consecutiveFailures: 3, lastFailureKind: 'transport', lastAttemptAtMs: NOW });
    const d = decidePullPoint(s, NOW);
    expect(d.action).toBe('wait');
    expect(d.delayMs).toBeGreaterThan(0);
  });

  it('recuo cumprido volta a agir', () => {
    const s = sub({
      consecutiveFailures: 3,
      lastFailureKind: 'transport',
      lastAttemptAtMs: NOW - BACKOFF_CAP_MS,
    });
    expect(decidePullPoint(s, NOW).action).toBe('pull');
  });

  it('recuo é limitado e determinístico', () => {
    for (let n = 1; n <= 50; n += 1) {
      const d = backoffDelayMs(n, 'sub-155');
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(BACKOFF_CAP_MS);
      expect(backoffDelayMs(n, 'sub-155')).toBe(d);
    }
  });

  it('tremor espalha assinaturas diferentes no mesmo degrau', () => {
    const spread = new Set(Array.from({ length: 60 }, (_, i) => backoffDelayMs(4, `camera-${i}`)));
    expect(spread.size).toBeGreaterThan(20);
  });
});

describe('pullPointLease — vontade do usuário', () => {
  it('câmera desabilitada recolhe imediatamente (P5)', () => {
    const d = decidePullPoint(sub({ cameraEnabled: false, terminationAtMs: null }), NOW);
    expect(d).toMatchObject({ action: 'retire', reason: 'camera_disabled' });
  });

  it('desabilitada vence até falha permanente', () => {
    const d = decidePullPoint(sub({ cameraEnabled: false, lastFailureKind: 'auth' }), NOW);
    expect(d.reason).toBe('camera_disabled');
  });
});

describe('pullPointEventKey', () => {
  it('mesmo fato reentregue produz a mesma chave', () => {
    const a = pullPointEventKey({
      cameraId: 'cam',
      topic: 'tns1:Device/Trigger/Relay',
      sourceToken: 'RelayToken_1',
      utcTime: '2026-07-27T21:00:00Z',
    });
    const b = pullPointEventKey({
      cameraId: 'cam',
      topic: '  TNS1:Device/Trigger/Relay ',
      sourceToken: 'relaytoken_1',
      utcTime: ' 2026-07-27T21:00:00Z ',
    });
    expect(a).toBe(b);
  });

  it('instantes distintos do mesmo tópico são fatos distintos', () => {
    const base = { cameraId: 'cam', topic: 't', sourceToken: null };
    expect(pullPointEventKey({ ...base, utcTime: '1' })).not.toBe(
      pullPointEventKey({ ...base, utcTime: '2' })
    );
  });
});
