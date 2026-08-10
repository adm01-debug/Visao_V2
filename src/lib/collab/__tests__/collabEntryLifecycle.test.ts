import { describe, expect, it } from 'vitest';

import {
  COLLAB_ENTRY_LIFECYCLE_POLICY as P,
  isEntryPurgeable,
  isMatchPurgeable,
  planEntryPurge,
  type CollabEntrySubject,
} from '../collabEntryLifecycle';

/**
 * Onda 133 — simulação exaustiva do ciclo de vida das entradas compartilhadas.
 * Varre o cruzamento de idade de revogação × idade de vencimento em passo fino,
 * cobrindo fronteiras exatas, valores negativos e não-finitos.
 */

const AGES = [
  Number.NEGATIVE_INFINITY,
  -400,
  -31,
  -1,
  -0.001,
  0,
  0.001,
  1,
  P.revokedGraceDays - 0.001,
  P.revokedGraceDays,
  P.revokedGraceDays + 0.001,
  P.expiredGraceDays - 0.001,
  P.expiredGraceDays,
  P.expiredGraceDays + 0.001,
  60,
  180,
  365,
  4000,
  Number.POSITIVE_INFINITY,
  Number.NaN,
];

describe('collabEntryLifecycle — fronteiras', () => {
  it('não apaga na fronteira exata da carência, apaga logo depois', () => {
    expect(isEntryPurgeable({ revokedAgeDays: P.revokedGraceDays, expiredAgeDays: -1 })).toBe(
      false
    );
    expect(
      isEntryPurgeable({ revokedAgeDays: P.revokedGraceDays + 0.001, expiredAgeDays: -1 })
    ).toBe(true);
    expect(isEntryPurgeable({ revokedAgeDays: null, expiredAgeDays: P.expiredGraceDays })).toBe(
      false
    );
    expect(
      isEntryPurgeable({ revokedAgeDays: null, expiredAgeDays: P.expiredGraceDays + 0.001 })
    ).toBe(true);
  });

  it('entrada viva e nunca revogada jamais é elegível', () => {
    for (const ageDays of AGES.filter((a) => Number.isFinite(a) && a <= P.expiredGraceDays)) {
      expect(isEntryPurgeable({ revokedAgeDays: null, expiredAgeDays: ageDays })).toBe(false);
    }
  });

  it('idade não-finita nunca autoriza apagar', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(isEntryPurgeable({ revokedAgeDays: bad, expiredAgeDays: bad })).toBe(false);
      expect(isMatchPurgeable(bad)).toBe(false);
    }
  });

  it('avistamento respeita exatamente a retenção operacional', () => {
    expect(isMatchPurgeable(P.matchRetentionDays)).toBe(false);
    expect(isMatchPurgeable(P.matchRetentionDays + 0.001)).toBe(true);
    expect(isMatchPurgeable(-1)).toBe(false);
  });
});

describe('collabEntryLifecycle — varredura combinatória', () => {
  it('revogação e vencimento são caminhos independentes e monotônicos', () => {
    let checked = 0;
    for (const revoked of [null, ...AGES]) {
      for (const expired of AGES) {
        const subject: CollabEntrySubject = { revokedAgeDays: revoked, expiredAgeDays: expired };
        const decision = isEntryPurgeable(subject);

        const byRevoke =
          revoked !== null && Number.isFinite(revoked) && revoked > P.revokedGraceDays;
        const byExpiry = Number.isFinite(expired) && expired > P.expiredGraceDays;
        expect(decision).toBe(byRevoke || byExpiry);

        // Monotonicidade: envelhecer nunca torna uma entrada elegível em inelegível.
        if (decision && Number.isFinite(expired)) {
          expect(isEntryPurgeable({ revokedAgeDays: revoked, expiredAgeDays: expired + 1 })).toBe(
            true
          );
        }
        checked += 1;
      }
    }
    expect(checked).toBe((AGES.length + 1) * AGES.length);
  });
});

describe('collabEntryLifecycle — planejamento em lote', () => {
  it('nunca apaga mais que o teto por tabela e sinaliza excesso', () => {
    const entries = Array.from({ length: P.maxDeletePerRun + 7 }, () => ({
      revokedAgeDays: null,
      expiredAgeDays: P.expiredGraceDays + 5,
    }));
    const plan = planEntryPurge({ entries, matchAgesDays: [1, 2, 3] });
    expect(plan.deletedEntries).toBe(P.maxDeletePerRun);
    expect(plan.deletedMatches).toBe(0);
    expect(plan.truncated).toBe(true);
  });

  it('conjunto totalmente protegido não gera exclusão nem truncamento', () => {
    const plan = planEntryPurge({
      entries: [{ revokedAgeDays: 1, expiredAgeDays: -100 }],
      matchAgesDays: [0, P.matchRetentionDays],
    });
    expect(plan).toEqual({ deletedMatches: 0, deletedEntries: 0, truncated: false });
  });
});
