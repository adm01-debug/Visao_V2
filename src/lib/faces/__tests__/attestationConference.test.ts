/**
 * Onda 202 — Testes da régua de conferência.
 *
 * Cada bloco fixa uma das quatro invariantes declaradas no módulo. Não são
 * testes de cobertura: são testes de INVERSÃO — cada um falha se alguém
 * "simplificar" a regra fundindo os dois eixos num status único.
 */
import { describe, it, expect } from 'vitest';
import {
  conferAttestation,
  describeConferenceOutcome,
  severityRank,
  summarizeConferenceOutcome,
  worstOutcome,
  type RegistryLookup,
} from '../attestationConference';
import type {
  AttestationVerification,
  TimelineAttestation,
} from '../timelineAttestation';

const doc = (over: Partial<TimelineAttestation> = {}): TimelineAttestation =>
  ({
    format: 'visao.timeline.attestation',
    version: 1,
    algorithm: 'SHA-256',
    genesis: 'g',
    attestationId: 'att-1',
    subject: { personId: 'p1', label: null },
    window: { fromUtc: '2026-07-01T00:00:00.000Z', toUtc: '2026-07-02T00:00:00.000Z' },
    verdict: 'corroborated',
    caveats: [],
    stats: {
      stays: 2,
      confirmedStays: 2,
      camerasVisited: 2,
      confirmedDwellMs: 1000,
      openFloorMs: 0,
      excludedReadings: 0,
    },
    stays: [],
    transits: [],
    relatedExportRootHash: null,
    issuance: {
      issuedAtUtc: '2026-07-02T10:00:00.000Z',
      issuedBy: 'user-a',
      sourceSystem: 'visao/201',
    },
    howToVerify: [],
    disclosure: 'd',
    chain: [],
    rootHash: 'a'.repeat(64),
    ...over,
  }) as TimelineAttestation;

const ok: AttestationVerification = {
  intact: true,
  firstBrokenIndex: null,
  rootMatches: true,
  verdictMatches: true,
  recomputedVerdict: 'corroborated',
};

const found: RegistryLookup = {
  status: 'found',
  issuedAt: '2026-07-02T10:00:00.000Z',
  issuedBy: 'user-a',
};

describe('conferAttestation — caminho feliz', () => {
  it('confirma autenticidade quando conteúdo e registro concordam', () => {
    const r = conferAttestation({ attestation: doc(), verification: ok, registry: found });
    expect(r.outcome).toBe('authentic');
    expect(r.documentIntact).toBe(true);
    expect(r.originConfirmed).toBe(true);
    expect(r.tone).toBe('positive');
  });

  it('aceita o mesmo instante escrito em formatos diferentes', () => {
    const r = conferAttestation({
      attestation: doc(),
      verification: ok,
      registry: { status: 'found', issuedAt: '2026-07-02T07:00:00-03:00', issuedBy: 'user-a' },
    });
    expect(r.outcome).toBe('authentic');
  });
});

describe('I1 — falha de transporte nunca acusa', () => {
  it('consulta indisponível vira procedência desconhecida, não ausência', () => {
    const r = conferAttestation({
      attestation: doc(),
      verification: ok,
      registry: { status: 'unavailable', reason: 'rede' },
    });
    expect(r.outcome).toBe('origin_unknown');
    expect(r.outcome).not.toBe('unregistered');
    expect(r.documentIntact).toBe(true);
    expect(r.originConfirmed).toBe(false);
    expect(r.reasons.join(' ')).toContain('NÃO é indício de adulteração');
  });

  it('indisponível nunca é tratado como adulteração', () => {
    const r = conferAttestation({
      attestation: doc(),
      verification: ok,
      registry: { status: 'unavailable', reason: 'timeout' },
    });
    expect(r.tone).not.toBe('critical');
  });
});

describe('I2 — integridade domina procedência', () => {
  it('corrente quebrada é adulteração mesmo constando no registro', () => {
    const r = conferAttestation({
      attestation: doc(),
      verification: { ...ok, intact: false, firstBrokenIndex: 1 },
      registry: found,
    });
    expect(r.outcome).toBe('tampered');
    expect(r.documentIntact).toBe(false);
    // Constar torna o caso mais grave, e o parecer precisa dizer isso.
    expect(r.reasons.join(' ')).toContain('CÓPIA divergiu');
  });

  it('selo que não fecha é adulteração mesmo com registro indisponível', () => {
    const r = conferAttestation({
      attestation: doc(),
      verification: { ...ok, intact: false, rootMatches: false },
      registry: { status: 'unavailable', reason: 'rede' },
    });
    expect(r.outcome).toBe('tampered');
  });

  it('veredito remontado é crítico mesmo com selo íntegro', () => {
    const r = conferAttestation({
      attestation: doc({ verdict: 'corroborated' }),
      verification: { ...ok, intact: false, verdictMatches: false, recomputedVerdict: 'contested' },
      registry: found,
    });
    expect(r.outcome).toBe('forged_verdict');
    expect(r.tone).toBe('critical');
    expect(r.documentIntact).toBe(false);
  });
});

describe('I3 — ausência do registro não é falsidade', () => {
  it('íntegro e ausente reporta integridade confirmada', () => {
    const r = conferAttestation({
      attestation: doc(),
      verification: ok,
      registry: { status: 'absent' },
    });
    expect(r.outcome).toBe('unregistered');
    expect(r.documentIntact).toBe(true);
    expect(r.tone).toBe('warning');
    expect(r.reasons.join(' ')).toContain('integridade do arquivo está confirmada');
  });
});

describe('I4 — a conferência não melhora o conteúdo', () => {
  it('atestado contestado autêntico continua contestado', () => {
    const r = conferAttestation({
      attestation: doc({ verdict: 'contested' }),
      verification: { ...ok, recomputedVerdict: 'contested' },
      registry: found,
    });
    expect(r.outcome).toBe('authentic');
    expect(r.documentVerdict).toBe('contested');
  });
});

describe('divergência de registro', () => {
  it('data de emissão diferente do registro é divergência, não adulteração', () => {
    const r = conferAttestation({
      attestation: doc(),
      verification: ok,
      registry: { status: 'found', issuedAt: '2026-07-03T10:00:00.000Z', issuedBy: 'user-a' },
    });
    expect(r.outcome).toBe('registry_divergence');
    expect(r.documentIntact).toBe(true);
    expect(r.tone).toBe('warning');
  });

  it('autor diferente do registro é divergência', () => {
    const r = conferAttestation({
      attestation: doc(),
      verification: ok,
      registry: { status: 'found', issuedAt: '2026-07-02T10:00:00.000Z', issuedBy: 'user-b' },
    });
    expect(r.outcome).toBe('registry_divergence');
  });

  it('registro sem autor conhecido não inventa divergência', () => {
    const r = conferAttestation({
      attestation: doc(),
      verification: ok,
      registry: { status: 'found', issuedAt: '2026-07-02T10:00:00.000Z', issuedBy: null },
    });
    expect(r.outcome).toBe('authentic');
  });
});

describe('ordenação e lote', () => {
  it('adulterado é sempre o pior', () => {
    expect(severityRank('tampered')).toBeLessThan(severityRank('forged_verdict'));
    expect(severityRank('forged_verdict')).toBeLessThan(severityRank('registry_divergence'));
    expect(severityRank('unregistered')).toBeLessThan(severityRank('authentic'));
  });

  it('o pior do lote manda — nunca a média', () => {
    expect(worstOutcome(['authentic', 'unregistered', 'tampered'])).toBe('tampered');
    expect(worstOutcome(['authentic', 'authentic'])).toBe('authentic');
    expect(worstOutcome([])).toBeNull();
  });

  it('todo resultado tem rótulo e resumo', () => {
    for (const o of [
      'tampered',
      'forged_verdict',
      'registry_divergence',
      'origin_unknown',
      'unregistered',
      'authentic',
    ] as const) {
      expect(describeConferenceOutcome(o).length).toBeGreaterThan(0);
      expect(summarizeConferenceOutcome(o).length).toBeGreaterThan(0);
      expect(severityRank(o)).toBeGreaterThanOrEqual(0);
    }
  });

  it('nenhum resultado sai sem motivos', () => {
    const registries: RegistryLookup[] = [
      found,
      { status: 'absent' },
      { status: 'unavailable', reason: 'x' },
    ];
    for (const registry of registries) {
      for (const verification of [ok, { ...ok, intact: false, rootMatches: false }]) {
        const r = conferAttestation({ attestation: doc(), verification, registry });
        expect(r.reasons.length).toBeGreaterThan(0);
      }
    }
  });
});
