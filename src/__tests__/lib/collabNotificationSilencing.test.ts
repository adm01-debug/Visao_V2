/**
 * Onda 131 — Simulação massiva do silenciamento de avisos colaborativos.
 *
 * A suíte não valida "a função devolve o que escrevi": ela varre o produto
 * cartesiano de tipo × preferência × relógio procurando o caso em que um aviso
 * que precisa ser visto some, ou em que o prazo é respeitado só de um lado.
 */

import { describe, it, expect } from 'vitest';
import {
  COLLAB_SILENCE_POLICY,
  SILENCEABLE_KINDS,
  countUnread,
  isSilenceableKind,
  isSilenced,
  normalizeSilencedKinds,
  resolveSilenceRequest,
  silenceVerdict,
  type SilencePreference,
} from '@/lib/collab/collabNotificationSilencing';
import {
  isActionableKind,
  severityForKind,
  type CollabNotificationKind,
} from '@/lib/collab/collabNotifications';

const ALL_KINDS: CollabNotificationKind[] = [
  'invite_received',
  'invite_accepted',
  'invite_declined',
  'invite_revoked',
  'invite_expired',
  'membership_suspended',
  'membership_reinstated',
  'membership_removed',
];

const DAY_MS = 86_400_000;
const NOW = new Date('2026-07-26T12:00:00.000Z');

describe('collabNotificationSilencing — invariantes de segurança', () => {
  it('nunca permite silenciar aviso acionável ou crítico', () => {
    for (const kind of ALL_KINDS) {
      const mustBeLoud = isActionableKind(kind) || severityForKind(kind) === 'critical';
      expect(isSilenceableKind(kind)).toBe(!mustBeLoud);
    }
    expect(SILENCEABLE_KINDS).not.toContain('invite_received');
    expect(SILENCEABLE_KINDS).not.toContain('membership_removed');
  });

  it('mantém aviso não silenciável realçado em toda combinação de preferência e relógio', () => {
    const loud = ALL_KINDS.filter((k) => !isSilenceableKind(k));
    const clocks = [-10 * DAY_MS, -1, 0, 1, 10 * DAY_MS];
    let checked = 0;
    for (const kind of loud) {
      // Preferência maliciosa: tenta silenciar TUDO, inclusive o proibido.
      for (const raw of [ALL_KINDS, [kind], []] as readonly string[][]) {
        for (const offset of clocks) {
          const preference: SilencePreference = {
            silencedKinds: normalizeSilencedKinds(raw),
            silencedUntil: new Date(NOW.getTime() + offset).toISOString(),
          };
          expect(silenceVerdict({ kind, preference, now: NOW })).toBe('not_silenceable');
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('collabNotificationSilencing — normalização', () => {
  it('descarta desconhecidos e não silenciáveis, deduplica e ordena', () => {
    const result = normalizeSilencedKinds([
      'invite_expired',
      'invite_expired',
      'membership_removed',
      'invite_received',
      'kind_do_futuro',
      'invite_accepted',
    ]);
    expect(result).toEqual(['invite_accepted', 'invite_expired']);
  });

  it('é idempotente e estável sob permutação (fuzz)', () => {
    for (let seed = 0; seed < 5000; seed += 1) {
      const picked = ALL_KINDS.filter((_, i) => ((seed >> i) & 1) === 1);
      const shuffled = [...picked].reverse();
      const a = normalizeSilencedKinds(picked);
      const b = normalizeSilencedKinds(shuffled);
      expect(a).toEqual(b);
      expect(normalizeSilencedKinds(a)).toEqual(a);
    }
  });

  it('trata nulo e vazio como ausência de silêncio', () => {
    expect(normalizeSilencedKinds(null)).toEqual([]);
    expect(normalizeSilencedKinds(undefined)).toEqual([]);
    expect(normalizeSilencedKinds([])).toEqual([]);
  });
});

describe('collabNotificationSilencing — prazo', () => {
  it('recusa silêncio indefinido, vencido ou além do teto', () => {
    const base = { kinds: ['invite_expired'], now: NOW } as const;
    expect(resolveSilenceRequest({ ...base, until: null })).toEqual({
      ok: false,
      reason: 'silence_requires_deadline',
    });
    expect(
      resolveSilenceRequest({ ...base, until: new Date(NOW.getTime() - 1).toISOString() })
    ).toEqual({ ok: false, reason: 'silence_deadline_in_past' });
    expect(resolveSilenceRequest({ ...base, until: NOW.toISOString() })).toEqual({
      ok: false,
      reason: 'silence_deadline_in_past',
    });
    expect(resolveSilenceRequest({ ...base, until: 'nao-e-data' })).toEqual({
      ok: false,
      reason: 'silence_deadline_in_past',
    });
    const tooFar = new Date(
      NOW.getTime() + (COLLAB_SILENCE_POLICY.maxSilenceDays * DAY_MS + 1000)
    ).toISOString();
    expect(resolveSilenceRequest({ ...base, until: tooFar })).toEqual({
      ok: false,
      reason: 'silence_deadline_too_far',
    });
  });

  it('aceita exatamente o teto e recusa um milissegundo além (borda)', () => {
    const exact = new Date(NOW.getTime() + COLLAB_SILENCE_POLICY.maxSilenceDays * DAY_MS);
    const ok = resolveSilenceRequest({
      kinds: ['invite_expired'],
      until: exact.toISOString(),
      now: NOW,
    });
    expect(ok.ok).toBe(true);
    const beyond = resolveSilenceRequest({
      kinds: ['invite_expired'],
      until: new Date(exact.getTime() + 1).toISOString(),
      now: NOW,
    });
    expect(beyond).toEqual({ ok: false, reason: 'silence_deadline_too_far' });
  });

  it('recusa pedido cujo conjunto normalizado ficaria vazio', () => {
    expect(
      resolveSilenceRequest({
        kinds: ['invite_received', 'membership_removed'],
        until: new Date(NOW.getTime() + DAY_MS).toISOString(),
        now: NOW,
      })
    ).toEqual({ ok: false, reason: 'silence_no_valid_kind' });
  });

  it('a política não permite silêncio indefinido', () => {
    expect(COLLAB_SILENCE_POLICY.allowIndefinite).toBe(false);
    expect(COLLAB_SILENCE_POLICY.maxSilencedKinds).toBe(SILENCEABLE_KINDS.length);
  });
});

describe('collabNotificationSilencing — varredura cartesiana', () => {
  it('cobre tipo × subconjunto × relógio sem esconder nada indevido', () => {
    const clocks = [-30 * DAY_MS, -1000, -1, 0, 1, 1000, 30 * DAY_MS];
    let scenarios = 0;
    let silencedSeen = 0;

    for (let mask = 0; mask < 1 << ALL_KINDS.length; mask += 1) {
      const requested = ALL_KINDS.filter((_, i) => ((mask >> i) & 1) === 1);
      const silencedKinds = normalizeSilencedKinds(requested);
      for (const offset of clocks) {
        const preference: SilencePreference = {
          silencedKinds,
          silencedUntil: new Date(NOW.getTime() + offset).toISOString(),
        };
        for (const kind of ALL_KINDS) {
          const verdict = silenceVerdict({ kind, preference, now: NOW });
          scenarios += 1;

          if (!isSilenceableKind(kind)) {
            expect(verdict).toBe('not_silenceable');
            continue;
          }
          if (!silencedKinds.includes(kind)) {
            expect(verdict).toBe('not_silenced_kind');
            continue;
          }
          if (offset <= 0) {
            expect(verdict).toBe('silence_expired');
            continue;
          }
          expect(verdict).toBe('silenced');
          silencedSeen += 1;
        }
      }
    }

    expect(scenarios).toBe((1 << ALL_KINDS.length) * clocks.length * ALL_KINDS.length);
    expect(scenarios).toBeGreaterThan(14_000);
    expect(silencedSeen).toBeGreaterThan(0);
  });

  it('sem preferência, nenhum aviso é escondido', () => {
    for (const kind of ALL_KINDS) {
      const verdict = silenceVerdict({ kind, preference: null, now: NOW });
      expect(verdict === 'no_preference' || verdict === 'not_silenceable').toBe(true);
      expect(isSilenced({ kind, preference: null, now: NOW })).toBe(false);
    }
  });
});

describe('collabNotificationSilencing — contagem de não lidos', () => {
  const preference: SilencePreference = {
    silencedKinds: ['invite_expired'],
    silencedUntil: new Date(NOW.getTime() + DAY_MS).toISOString(),
  };

  it('separa silenciados sem apagá-los da lista', () => {
    const items = [
      { kind: 'invite_expired' as const, read: false },
      { kind: 'invite_expired' as const, read: true },
      { kind: 'invite_received' as const, read: false },
      { kind: 'membership_removed' as const, read: false },
    ];
    expect(countUnread(items, preference, NOW)).toEqual({ total: 2, silenced: 1 });
    expect(countUnread(items, null, NOW)).toEqual({ total: 3, silenced: 0 });
  });

  it('após o prazo, o silenciado volta a contar', () => {
    const later = new Date(NOW.getTime() + 2 * DAY_MS);
    const items = [{ kind: 'invite_expired' as const, read: false }];
    expect(countUnread(items, preference, NOW)).toEqual({ total: 0, silenced: 1 });
    expect(countUnread(items, preference, later)).toEqual({ total: 1, silenced: 0 });
  });

  it('total + silenciados é sempre igual ao número de não lidos (invariante)', () => {
    for (let seed = 0; seed < 3000; seed += 1) {
      const items = ALL_KINDS.map((kind, i) => ({ kind, read: ((seed >> i) & 1) === 1 }));
      const expectedUnread = items.filter((i) => !i.read).length;
      const { total, silenced } = countUnread(items, preference, NOW);
      expect(total + silenced).toBe(expectedUnread);
    }
  });
});
