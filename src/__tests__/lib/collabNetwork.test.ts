import { describe, expect, it } from 'vitest';

import {
  COLLAB_POLICY,
  canonicalPlate,
  clampTtlDays,
  decideMatch,
  decideShare,
  type CandidateEntry,
  type MembershipStatus,
} from '@/lib/collab/collabNetwork';

const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;

const entry = (over: Partial<CandidateEntry> = {}): CandidateEntry => ({
  entryId: 'e1',
  ownerOrgId: 'org-a',
  severity: 3,
  expiresAt: NOW + 24 * HOUR,
  revokedAt: null,
  lastAlertedAt: null,
  ...over,
});

const baseMatch = {
  plate: 'ABC1D23',
  confidence: 0.9,
  memberStatus: 'active' as MembershipStatus,
  reciprocityRequired: false,
  sharesData: true,
  readerOrgId: 'org-b',
  now: NOW,
};

describe('canonicalPlate', () => {
  it('aceita as duas gerações de placa brasileira', () => {
    expect(canonicalPlate('ABC1234').plate).toBe('ABC1234');
    expect(canonicalPlate('ABC1D23').plate).toBe('ABC1D23');
  });

  it('ignora separadores, espaços e caixa', () => {
    expect(canonicalPlate(' abc-1d23 ').plate).toBe('ABC1D23');
    expect(canonicalPlate('a.b.c.1.2.3.4').plate).toBe('ABC1234');
  });

  it('corrige confusão de OCR respeitando a posição', () => {
    // 0 em posição alfabética vira O; O em posição numérica vira 0.
    expect(canonicalPlate('4BC1234').plate).toBe('ABC1234');
    expect(canonicalPlate('ABCI234').plate).toBe('ABC1234');
    expect(canonicalPlate('ABC1D2S').plate).toBe('ABC1D25');
  });

  it('não corrige a posição 5, que é ambígua entre as gerações', () => {
    // Mercosul tem letra ali; placa antiga tem dígito. Inventar corrupção é pior
    // que não casar.
    expect(canonicalPlate('ABC1D23').plate).toBe('ABC1D23');
    expect(canonicalPlate('ABC1023').plate).toBe('ABC1023');
  });

  it('é idempotente — requisito para o hash casar entre organizações', () => {
    const samples = ['abc1d23', 'ABC-1234', '4bcID23', 'zzz9z99'];
    for (const sample of samples) {
      const once = canonicalPlate(sample);
      const twice = canonicalPlate(once.plate ?? '');
      expect(twice.plate).toBe(once.plate);
    }
  });

  it('recusa comprimento errado, vazio e tipos não string', () => {
    expect(canonicalPlate('ABC123').rejection).toBe('bad_length');
    expect(canonicalPlate('ABC12345').rejection).toBe('bad_length');
    expect(canonicalPlate('   ').rejection).toBe('empty');
    expect(canonicalPlate(null).rejection).toBe('empty');
    expect(canonicalPlate(12345678).rejection).toBe('empty');
  });

  it('recusa caractere impossível na posição', () => {
    // "#" já foi removido, então o comprimento cai — o teste real de bad_format
    // é um dígito não mapeável em casa alfabética.
    expect(canonicalPlate('7BC1234').rejection).toBe('bad_format');
    expect(canonicalPlate('ABCX234').rejection).toBe('bad_format');
  });

  it('varredura exaustiva: nunca lança e sempre devolve 7 caracteres quando ok', () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-. ';
    let checked = 0;
    let accepted = 0;
    for (let seed = 0; seed < 20_000; seed += 1) {
      let raw = '';
      let x = seed * 2_654_435_761;
      const len = 4 + (seed % 8);
      for (let i = 0; i < len; i += 1) {
        x = (x ^ (x << 13)) >>> 0;
        x = (x ^ (x >>> 17)) >>> 0;
        raw += alphabet[x % alphabet.length];
      }
      const result = canonicalPlate(raw);
      checked += 1;
      if (result.ok) {
        accepted += 1;
        expect(result.plate).toHaveLength(COLLAB_POLICY.plateLength);
        expect(canonicalPlate(result.plate ?? '').plate).toBe(result.plate);
      } else {
        expect(result.plate).toBeNull();
      }
    }
    expect(checked).toBe(20_000);
    expect(accepted).toBeGreaterThan(0);
  });

  it('não é enganada por chaves do protótipo', () => {
    expect(canonicalPlate('__proto__').ok).toBe(false);
    expect(canonicalPlate('toStrng').ok).toBe(false);
  });
});

describe('clampTtlDays', () => {
  it('usa o padrão para entrada inválida', () => {
    expect(clampTtlDays(undefined)).toBe(COLLAB_POLICY.defaultTtlDays);
    expect(clampTtlDays(Number.NaN)).toBe(COLLAB_POLICY.defaultTtlDays);
    expect(clampTtlDays(Number.POSITIVE_INFINITY)).toBe(COLLAB_POLICY.defaultTtlDays);
    expect(clampTtlDays('30' as unknown)).toBe(COLLAB_POLICY.defaultTtlDays);
  });

  it('prende dentro da faixa', () => {
    expect(clampTtlDays(0)).toBe(1);
    expect(clampTtlDays(-90)).toBe(1);
    expect(clampTtlDays(9_999)).toBe(COLLAB_POLICY.maxTtlDays);
    expect(clampTtlDays(45.9)).toBe(45);
  });
});

describe('decideShare', () => {
  const base = {
    plate: 'ABC1D23',
    memberStatus: 'active' as MembershipStatus,
    severity: 3,
    activeEntries: 0,
  };

  it('aceita compartilhamento válido com TTL padrão', () => {
    const decision = decideShare(base);
    expect(decision.accepted).toBe(true);
    expect(decision.plate).toBe('ABC1D23');
    expect(decision.ttlDays).toBe(COLLAB_POLICY.defaultTtlDays);
  });

  it('recusa placa inválida antes de olhar a associação', () => {
    const decision = decideShare({ ...base, plate: 'XX', memberStatus: 'suspended' });
    expect(decision.rejection).toBe('invalid_plate');
  });

  it('recusa membro pendente ou suspenso', () => {
    expect(decideShare({ ...base, memberStatus: 'pending' }).rejection).toBe('member_not_active');
    expect(decideShare({ ...base, memberStatus: 'suspended' }).rejection).toBe('member_not_active');
  });

  it('recusa severidade fora da faixa e não numérica', () => {
    for (const severity of [1, 0, -3, 6, 99, Number.NaN, 'alta', null, undefined]) {
      expect(decideShare({ ...base, severity }).rejection).toBe('severity_out_of_range');
    }
    for (
      let severity = COLLAB_POLICY.minSeverity;
      severity <= COLLAB_POLICY.maxSeverity;
      severity += 1
    ) {
      expect(decideShare({ ...base, severity }).accepted).toBe(true);
    }
  });

  it('recusa TTL fora da faixa em vez de silenciosamente prender', () => {
    // Prender silenciosamente faria o autor achar que marcou por 2 anos.
    expect(decideShare({ ...base, ttlDays: 0 }).rejection).toBe('ttl_out_of_range');
    expect(decideShare({ ...base, ttlDays: 400 }).rejection).toBe('ttl_out_of_range');
    expect(decideShare({ ...base, ttlDays: Number.NaN }).rejection).toBe('ttl_out_of_range');
    expect(decideShare({ ...base, ttlDays: COLLAB_POLICY.maxTtlDays }).accepted).toBe(true);
  });

  it('respeita a cota de entradas ativas', () => {
    expect(
      decideShare({ ...base, activeEntries: COLLAB_POLICY.maxActiveEntriesPerOrg - 1 }).accepted
    ).toBe(true);
    expect(
      decideShare({ ...base, activeEntries: COLLAB_POLICY.maxActiveEntriesPerOrg }).rejection
    ).toBe('quota_exceeded');
    expect(decideShare({ ...base, activeEntries: Number.NaN }).rejection).toBe('quota_exceeded');
  });

  it('matriz combinatória: nunca aceita membro inativo nem placa ruim', () => {
    const plates = ['ABC1D23', 'ABC1234', 'XX', '', null];
    const statuses: MembershipStatus[] = ['pending', 'active', 'suspended'];
    const severities = [1, 2, 3, 4, 5, 6];
    const ttls = [undefined, 1, 30, 180, 181];
    const quotas = [0, 4_999, 5_000];
    let combos = 0;
    for (const plate of plates) {
      for (const memberStatus of statuses) {
        for (const severity of severities) {
          for (const ttlDays of ttls) {
            for (const activeEntries of quotas) {
              combos += 1;
              const decision = decideShare({
                plate,
                memberStatus,
                severity,
                ttlDays,
                activeEntries,
              });
              if (decision.accepted) {
                expect(memberStatus).toBe('active');
                expect(canonicalPlate(plate).ok).toBe(true);
                expect(decision.severity).toBeGreaterThanOrEqual(COLLAB_POLICY.minSeverity);
                expect(decision.severity).toBeLessThanOrEqual(COLLAB_POLICY.maxSeverity);
                expect(decision.ttlDays).toBeGreaterThanOrEqual(1);
                expect(decision.ttlDays).toBeLessThanOrEqual(COLLAB_POLICY.maxTtlDays);
                expect(activeEntries).toBeLessThan(COLLAB_POLICY.maxActiveEntriesPerOrg);
              } else {
                expect(decision.plate).toBeNull();
              }
            }
          }
        }
      }
    }
    expect(combos).toBe(plates.length * 3 * 6 * 5 * 3);
  });
});

describe('decideMatch', () => {
  it('alerta em casamento simples', () => {
    const decision = decideMatch({ ...baseMatch, candidates: [entry()] });
    expect(decision.alert).toBe(true);
    expect(decision.entryId).toBe('e1');
    expect(decision.severity).toBe(3);
  });

  it('nunca alerta a organização sobre a própria entrada', () => {
    const decision = decideMatch({
      ...baseMatch,
      candidates: [entry({ ownerOrgId: 'org-b' })],
    });
    expect(decision.alert).toBe(false);
    expect(decision.rejection).toBe('own_entry');
  });

  it('ignora entrada revogada e expirada', () => {
    expect(
      decideMatch({ ...baseMatch, candidates: [entry({ revokedAt: NOW - 1 })] }).rejection
    ).toBe('entry_revoked');
    expect(decideMatch({ ...baseMatch, candidates: [entry({ expiresAt: NOW })] }).rejection).toBe(
      'entry_expired'
    );
  });

  it('revogação futura ainda não vale', () => {
    expect(
      decideMatch({ ...baseMatch, candidates: [entry({ revokedAt: NOW + HOUR })] }).alert
    ).toBe(true);
  });

  it('exige confiança mínima do OCR', () => {
    expect(decideMatch({ ...baseMatch, confidence: 0.59, candidates: [entry()] }).rejection).toBe(
      'low_confidence'
    );
    expect(
      decideMatch({ ...baseMatch, confidence: COLLAB_POLICY.minConfidence, candidates: [entry()] })
        .alert
    ).toBe(true);
    expect(
      decideMatch({ ...baseMatch, confidence: Number.NaN, candidates: [entry()] }).rejection
    ).toBe('low_confidence');
  });

  it('bloqueia leitor sem contrapartida quando a rede exige reciprocidade', () => {
    expect(
      decideMatch({
        ...baseMatch,
        reciprocityRequired: true,
        sharesData: false,
        candidates: [entry()],
      }).rejection
    ).toBe('reciprocity_required');
    expect(
      decideMatch({
        ...baseMatch,
        reciprocityRequired: true,
        sharesData: true,
        candidates: [entry()],
      }).alert
    ).toBe(true);
  });

  it('bloqueia membro não ativo mesmo com casamento perfeito', () => {
    for (const memberStatus of ['pending', 'suspended'] as MembershipStatus[]) {
      expect(decideMatch({ ...baseMatch, memberStatus, candidates: [entry()] }).rejection).toBe(
        'member_not_active'
      );
    }
  });

  it('entre várias entradas vence a mais severa', () => {
    const decision = decideMatch({
      ...baseMatch,
      candidates: [
        entry({ entryId: 'baixa', severity: 2 }),
        entry({ entryId: 'alta', severity: 5 }),
        entry({ entryId: 'media', severity: 4 }),
      ],
    });
    expect(decision.entryId).toBe('alta');
    expect(decision.severity).toBe(5);
  });

  it('empate de severidade resolve pela mais urgente e depois por id', () => {
    const decision = decideMatch({
      ...baseMatch,
      candidates: [
        entry({ entryId: 'z', severity: 4, expiresAt: NOW + 5 * HOUR }),
        entry({ entryId: 'a', severity: 4, expiresAt: NOW + 2 * HOUR }),
        entry({ entryId: 'b', severity: 4, expiresAt: NOW + 2 * HOUR }),
      ],
    });
    expect(decision.entryId).toBe('a');
  });

  it('uma entrada em cooldown não mascara outra mais grave', () => {
    const decision = decideMatch({
      ...baseMatch,
      candidates: [
        entry({ entryId: 'silenciada', severity: 2, lastAlertedAt: NOW - 1_000 }),
        entry({ entryId: 'grave', severity: 5 }),
      ],
    });
    expect(decision.alert).toBe(true);
    expect(decision.entryId).toBe('grave');
  });

  it('cooldown silencia a vencedora dentro da janela e libera fora dela', () => {
    const cooldownMs = COLLAB_POLICY.matchCooldownSeconds * 1_000;
    expect(
      decideMatch({
        ...baseMatch,
        candidates: [entry({ lastAlertedAt: NOW - cooldownMs + 1 })],
      }).rejection
    ).toBe('cooldown');
    expect(
      decideMatch({
        ...baseMatch,
        candidates: [entry({ lastAlertedAt: NOW - cooldownMs })],
      }).alert
    ).toBe(true);
  });

  it('lista vazia ou inválida não alerta', () => {
    expect(decideMatch({ ...baseMatch, candidates: [] }).rejection).toBe('no_match');
    expect(
      decideMatch({ ...baseMatch, candidates: undefined as unknown as CandidateEntry[] }).rejection
    ).toBe('no_match');
  });

  it('varredura combinatória: alerta implica entrada viva, de terceiro e fora do cooldown', () => {
    const statuses: MembershipStatus[] = ['pending', 'active', 'suspended'];
    const confidences = [0.2, 0.6, 0.99];
    const owners = ['org-a', 'org-b'];
    const severities = [2, 3, 4, 5];
    const expiries = [NOW - HOUR, NOW, NOW + HOUR];
    const revocations = [null, NOW - 1, NOW + HOUR];
    const alerts = [null, NOW - 1_000, NOW - 10 * HOUR];
    const reciprocity = [false, true];
    const shares = [false, true];

    let combos = 0;
    let alerted = 0;
    for (const memberStatus of statuses) {
      for (const confidence of confidences) {
        for (const ownerOrgId of owners) {
          for (const severity of severities) {
            for (const expiresAt of expiries) {
              for (const revokedAt of revocations) {
                for (const lastAlertedAt of alerts) {
                  for (const reciprocityRequired of reciprocity) {
                    for (const sharesData of shares) {
                      combos += 1;
                      const decision = decideMatch({
                        ...baseMatch,
                        memberStatus,
                        confidence,
                        reciprocityRequired,
                        sharesData,
                        candidates: [
                          entry({ ownerOrgId, severity, expiresAt, revokedAt, lastAlertedAt }),
                        ],
                      });
                      if (!decision.alert) {
                        expect(decision.entryId).toBeNull();
                        expect(decision.rejection).not.toBeNull();
                        continue;
                      }
                      alerted += 1;
                      expect(memberStatus).toBe('active');
                      expect(confidence).toBeGreaterThanOrEqual(COLLAB_POLICY.minConfidence);
                      expect(ownerOrgId).not.toBe(baseMatch.readerOrgId);
                      expect(expiresAt).toBeGreaterThan(NOW);
                      expect(revokedAt === null || revokedAt > NOW).toBe(true);
                      expect(
                        lastAlertedAt === null ||
                          NOW - lastAlertedAt >= COLLAB_POLICY.matchCooldownSeconds * 1_000
                      ).toBe(true);
                      if (reciprocityRequired) expect(sharesData).toBe(true);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(combos).toBe(3 * 3 * 2 * 4 * 3 * 3 * 3 * 2 * 2);
    expect(alerted).toBeGreaterThan(0);
  });
});
