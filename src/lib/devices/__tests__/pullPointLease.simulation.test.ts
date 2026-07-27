/**
 * Onda 155 — simulação exaustiva do ciclo de vida PullPoint (etapa 15).
 *
 * Duas frentes, como nas ondas anteriores:
 *
 *  A. **Varredura combinatória** de todo o espaço de estados discretizado,
 *     conferindo as invariantes J1–J6 uma a uma.
 *  B. **Trajetórias vivas**: assinaturas evoluindo ao longo de horas
 *     simuladas, com o equipamento se comportando mal de propósito (relógio
 *     adiantado, empréstimo encurtado unilateralmente, queda de link, senha
 *     trocada). Aqui procuramos o defeito que a varredura estática não vê:
 *     o laço que nunca converge.
 */
import { describe, expect, it } from 'vitest';
import {
  BACKOFF_CAP_MS,
  MAX_LEASE_MS,
  MIN_LEASE_MS,
  backoffDelayMs,
  decidePullPoint,
  isPermanentFailure,
  renewThresholdMs,
  type PullPointFailureKind,
  type PullPointStatus,
  type PullPointSubscription,
} from '../pullPointLease';

const NOW = 1_800_000_000_000;

const STATUSES: PullPointStatus[] = ['pending', 'active', 'backoff', 'retired'];
const KINDS: PullPointFailureKind[] = ['none', 'transport', 'device_fault', 'auth', 'unsupported'];
const LEASES = [MIN_LEASE_MS, 120_000, 300_000, MAX_LEASE_MS];
const REMAINING = [-600_000, -1, 0, 1, 20_000, 44_999, 46_000, 90_000, 299_999, 600_000];
const FAILURES = [0, 1, 2, 5, 12, 40];
const LAST_ATTEMPT = [null, NOW, NOW - 1_000, NOW - BACKOFF_CAP_MS - 1];
const ENABLED = [true, false];

describe('Onda 155 — varredura combinatória do ciclo PullPoint', () => {
  it('mantém J1–J5 em todo o espaço de estados', () => {
    let scenarios = 0;
    const seen = new Set<string>();

    for (const status of STATUSES) {
      for (const kind of KINDS) {
        for (const lease of LEASES) {
          for (const remaining of REMAINING) {
            for (const failures of FAILURES) {
              for (const lastAttempt of LAST_ATTEMPT) {
                for (const enabled of ENABLED) {
                  for (const nullTermination of [false, true]) {
                    scenarios += 1;
                    const sub: PullPointSubscription = {
                      id: `sim-${scenarios}`,
                      status,
                      terminationAtMs: nullTermination ? null : NOW + remaining,
                      leaseDurationMs: lease,
                      consecutiveFailures: failures,
                      lastFailureKind: kind,
                      lastAttemptAtMs: lastAttempt,
                      cameraEnabled: enabled,
                    };
                    const d = decidePullPoint(sub, NOW);
                    seen.add(d.action);

                    // J4 — atraso sempre sadio.
                    expect(d.delayMs).toBeGreaterThanOrEqual(0);
                    expect(d.delayMs).toBeLessThanOrEqual(BACKOFF_CAP_MS);
                    expect(Number.isFinite(d.delayMs)).toBe(true);

                    // J2 — vontade do usuário é soberana.
                    if (!enabled) {
                      expect(d.action).toBe('retire');
                      expect(d.reason).toBe('camera_disabled');
                      continue;
                    }
                    if (status === 'retired') {
                      expect(d.action).toBe('retire');
                      continue;
                    }

                    // J3 — falha permanente nunca vira espera nem trabalho.
                    if (isPermanentFailure(kind)) {
                      expect(d.action).toBe('retire');
                      expect(d.terminal).toBe(true);
                      continue;
                    }

                    // J1 — vencido jamais renova.
                    if (!nullTermination && remaining <= 0 && d.action !== 'wait') {
                      expect(d.action).not.toBe('renew');
                      expect(d.action).toBe('recreate');
                    }

                    // J5 — pull exige folga real acima do limiar de renovação.
                    if (d.action === 'pull') {
                      expect(nullTermination).toBe(false);
                      expect(remaining).toBeGreaterThan(renewThresholdMs(lease));
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // O espaço precisa de fato exercitar todos os vereditos, senão a
    // "cobertura" é ilusória.
    for (const action of ['create', 'pull', 'renew', 'recreate', 'wait', 'retire']) {
      expect(seen.has(action as never)).toBe(true);
    }
    expect(scenarios).toBeGreaterThan(15_000);
  });

  it('J6 — pureza: repetir a chamada devolve exatamente o mesmo veredito', () => {
    for (let i = 0; i < 500; i += 1) {
      const sub: PullPointSubscription = {
        id: `pure-${i}`,
        status: STATUSES[i % STATUSES.length],
        terminationAtMs: i % 7 === 0 ? null : NOW + ((i * 7919) % 600_000) - 300_000,
        leaseDurationMs: LEASES[i % LEASES.length],
        consecutiveFailures: i % 9,
        lastFailureKind: KINDS[i % KINDS.length],
        lastAttemptAtMs: i % 5 === 0 ? null : NOW - ((i * 104_729) % 400_000),
        cameraEnabled: i % 11 !== 0,
      };
      expect(decidePullPoint(sub, NOW)).toEqual(decidePullPoint(sub, NOW));
    }
  });
});

/* -------------------------------------------------------------------------- */

type DeviceMood = 'healthy' | 'flaky' | 'clock_ahead' | 'short_lease' | 'dead_link' | 'password_changed';

/**
 * Equipamento simulado. Cada humor reproduz uma patologia real de campo.
 */
function respond(mood: DeviceMood, tick: number): {
  ok: boolean;
  kind: PullPointFailureKind;
  grantedLeaseMs: number;
  clockSkewMs: number;
} {
  switch (mood) {
    case 'healthy':
      return { ok: true, kind: 'none', grantedLeaseMs: 300_000, clockSkewMs: 0 };
    case 'flaky':
      return tick % 4 === 3
        ? { ok: false, kind: 'transport', grantedLeaseMs: 0, clockSkewMs: 0 }
        : { ok: true, kind: 'none', grantedLeaseMs: 300_000, clockSkewMs: 0 };
    case 'clock_ahead':
      // Câmera 4 min adiantada: o TerminationTime que ela devolve parece
      // maior do que o empréstimo real. Sem antecipação, venceria antes.
      return { ok: true, kind: 'none', grantedLeaseMs: 300_000, clockSkewMs: 240_000 };
    case 'short_lease':
      // Equipamento concede bem menos do que foi pedido — comportamento legal
      // no padrão e ignorado por quase toda integração.
      return { ok: true, kind: 'none', grantedLeaseMs: MIN_LEASE_MS, clockSkewMs: 0 };
    case 'dead_link':
      return { ok: false, kind: 'transport', grantedLeaseMs: 0, clockSkewMs: 0 };
    case 'password_changed':
      return tick < 2
        ? { ok: true, kind: 'none', grantedLeaseMs: 300_000, clockSkewMs: 0 }
        : { ok: false, kind: 'auth', grantedLeaseMs: 0, clockSkewMs: 0 };
  }
}

describe('Onda 155 — trajetórias vivas contra equipamento mal comportado', () => {
  const MOODS: DeviceMood[] = [
    'healthy',
    'flaky',
    'clock_ahead',
    'short_lease',
    'dead_link',
    'password_changed',
  ];

  it('nenhuma trajetória entra em laço estéril nem perde o empréstimo em silêncio', () => {
    let trajectories = 0;

    for (const mood of MOODS) {
      for (let seed = 0; seed < 40; seed += 1) {
        trajectories += 1;
        let now = NOW;
        let sub: PullPointSubscription = {
          id: `traj-${mood}-${seed}`,
          status: 'pending',
          terminationAtMs: null,
          leaseDurationMs: 300_000,
          consecutiveFailures: 0,
          lastFailureKind: 'none',
          lastAttemptAtMs: null,
          cameraEnabled: true,
        };

        let pulls = 0;
        let expiredWhileActive = 0;
        let renewOnDead = 0;
        let retired = false;

        // 8 horas simuladas, passo de 15 s.
        for (let tick = 0; tick < 1_920 && !retired; tick += 1) {
          const d = decidePullPoint(sub, now);

          if (d.action === 'renew' && sub.terminationAtMs !== null && sub.terminationAtMs <= now) {
            renewOnDead += 1;
          }
          if (
            d.action !== 'retire' &&
            sub.terminationAtMs !== null &&
            sub.terminationAtMs <= now &&
            d.action !== 'recreate' &&
            d.action !== 'wait'
          ) {
            expiredWhileActive += 1;
          }

          if (d.action === 'retire') {
            retired = true;
            break;
          }
          if (d.action === 'wait') {
            now += 15_000;
            continue;
          }

          const r = respond(mood, tick);
          if (r.ok) {
            if (d.action === 'pull') pulls += 1;
            const lease = r.grantedLeaseMs;
            sub = {
              ...sub,
              status: 'active',
              leaseDurationMs: lease,
              // O nosso relógio é a referência; o desvio da câmera é
              // deliberadamente descontado para simular a leitura ingênua.
              terminationAtMs: now + lease - r.clockSkewMs,
              consecutiveFailures: 0,
              lastFailureKind: 'none',
              lastAttemptAtMs: now,
            };
          } else {
            sub = {
              ...sub,
              status: 'backoff',
              consecutiveFailures: sub.consecutiveFailures + 1,
              lastFailureKind: r.kind,
              lastAttemptAtMs: now,
            };
          }
          now += 15_000;
        }

        // J1 em trajetória: jamais renovamos referência morta.
        expect(renewOnDead).toBe(0);
        expect(expiredWhileActive).toBe(0);

        if (mood === 'healthy' || mood === 'flaky' || mood === 'short_lease') {
          // Progresso real: a assinatura precisa efetivamente entregar
          // trabalho, não apenas sobreviver renovando.
          expect(pulls).toBeGreaterThan(10);
          expect(retired).toBe(false);
        }
        if (mood === 'clock_ahead') {
          // Mesmo com o relógio da câmera 4 min à frente, a antecipação
          // precisa manter a assinatura viva e produtiva.
          expect(pulls).toBeGreaterThan(0);
        }
        if (mood === 'password_changed') {
          // Senha trocada precisa virar caso humano, não recuo eterno.
          expect(retired).toBe(true);
        }
        if (mood === 'dead_link') {
          // Link morto nunca produz trabalho, mas também nunca martela:
          // o recuo tem de crescer até o teto.
          expect(pulls).toBe(0);
          expect(backoffDelayMs(sub.consecutiveFailures, sub.id)).toBeGreaterThan(0);
        }
      }
    }

    expect(trajectories).toBe(240);
  });
});
