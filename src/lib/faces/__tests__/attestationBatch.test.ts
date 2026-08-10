/**
 * Onda 203 — invariantes da conferência de dossiê.
 *
 * O que se testa aqui não é aritmética de contagem: é a recusa do módulo em
 * produzir um cabeçalho mais tranquilizador do que os fatos permitem.
 */

import { describe, expect, it } from 'vitest';
import {
  parseDossier,
  summarizeBatch,
  piecesBySeverity,
  contentFingerprint,
  type BatchPiece,
} from '../attestationBatch';
import type { ConferenceOutcome, ConferenceResult } from '../attestationConference';
import type { TimelineAttestation } from '../timelineAttestation';

function result(outcome: ConferenceOutcome): ConferenceResult {
  return {
    outcome,
    documentIntact: outcome !== 'tampered' && outcome !== 'forged_verdict',
    originConfirmed: outcome === 'authentic' || outcome === 'registry_divergence',
    documentVerdict: 'corroborated',
    tone: 'neutral',
    reasons: ['motivo'],
  };
}

function piece(
  index: number,
  outcome: ConferenceOutcome,
  rootHash = `seal-${index}`,
  fingerprint = `fp-${index}`
): BatchPiece {
  return { kind: 'conferred', index, rootHash, fingerprint, result: result(outcome) };
}

const OUTCOMES: readonly ConferenceOutcome[] = [
  'tampered',
  'forged_verdict',
  'registry_divergence',
  'unregistered',
  'origin_unknown',
  'authentic',
];

describe('summarizeBatch', () => {
  it('B3 — lote vazio é inconclusivo, jamais autêntico', () => {
    const s = summarizeBatch([]);
    expect(s.headline).toBeNull();
    expect(s.tone).toBe('neutral');
    expect(s.coverage).toBe('none');
  });

  it('B1 — o pior elemento define o cabeçalho, não a maioria', () => {
    const s = summarizeBatch([
      piece(1, 'authentic'),
      piece(2, 'authentic'),
      piece(3, 'authentic'),
      piece(4, 'tampered'),
    ]);
    expect(s.headline).toBe('tampered');
    expect(s.tone).toBe('critical');
    expect(s.counts.authentic).toBe(3);
  });

  it('B2 — peça ilegível impede tom positivo mas não acusa', () => {
    const s = summarizeBatch([
      piece(1, 'authentic'),
      { kind: 'unreadable', index: 2, reason: 'quebrada' },
    ]);
    expect(s.headline).toBe('authentic');
    expect(s.coverage).toBe('partial');
    expect(s.tone).toBe('neutral');
    expect(s.reasons.join(' ')).toContain('apenas em parte');
  });

  it('B2 — dossiê inteiramente ilegível não é adulteração', () => {
    const s = summarizeBatch([
      { kind: 'unreadable', index: 1, reason: 'x' },
      { kind: 'unreadable', index: 2, reason: 'y' },
    ]);
    expect(s.headline).toBeNull();
    expect(s.tone).toBe('neutral');
    expect(s.reasons.join(' ')).toContain('não é indício de adulteração');
  });

  it('B4 — mesmo selo com conteúdos diferentes derruba o lote inteiro', () => {
    const s = summarizeBatch([
      piece(1, 'authentic', 'seal-x', 'fp-a'),
      piece(2, 'authentic', 'seal-x', 'fp-b'),
    ]);
    expect(s.worst).toBe('authentic');
    expect(s.headline).toBe('tampered');
    expect(s.tone).toBe('critical');
    expect(s.conflicts).toHaveLength(1);
    expect(s.conflicts[0]?.indexes).toEqual([1, 2]);
  });

  it('B5 — duplicata idêntica conta uma vez e não muda o veredito', () => {
    const base = summarizeBatch([piece(1, 'unregistered', 'seal-x', 'fp-a')]);
    const dup = summarizeBatch([
      piece(1, 'unregistered', 'seal-x', 'fp-a'),
      piece(2, 'unregistered', 'seal-x', 'fp-a'),
    ]);
    expect(dup.headline).toBe(base.headline);
    expect(dup.distinctSeals).toBe(1);
    expect(dup.duplicates).toBe(1);
    expect(dup.conflicts).toHaveLength(0);
  });

  it('cobre todos os resultados individuais sem perder contagem', () => {
    const s = summarizeBatch(OUTCOMES.map((o, i) => piece(i + 1, o)));
    for (const o of OUTCOMES) expect(s.counts[o]).toBe(1);
    expect(s.headline).toBe('tampered');
    expect(s.conferred).toBe(OUTCOMES.length);
  });
});

describe('parseDossier', () => {
  const doc = {
    rootHash: 'abc',
    chain: ['a'],
    stays: [],
  } as unknown as TimelineAttestation;

  it('aceita atestado avulso, array e envelope', () => {
    expect(parseDossier(JSON.stringify(doc)).single).toBe(true);
    expect(parseDossier(JSON.stringify([doc, doc])).entries).toHaveLength(2);
    expect(parseDossier(JSON.stringify({ attestations: [doc] })).entries).toHaveLength(1);
  });

  it('peça malformada vira entrada ilegível sem derrubar o arquivo', () => {
    const parsed = parseDossier(JSON.stringify([doc, { nada: 1 }, doc]));
    expect(parsed.entries.map((e) => e.kind)).toEqual(['attestation', 'unreadable', 'attestation']);
    expect(parsed.entries[1]?.index).toBe(2);
  });

  it('recusa arquivo que não é JSON', () => {
    expect(() => parseDossier('{')).toThrow(/não é JSON válido/);
  });
});

describe('auxiliares', () => {
  it('piecesBySeverity mantém a ordem do arquivo no empate', () => {
    const ordered = piecesBySeverity([
      piece(1, 'authentic'),
      piece(2, 'tampered'),
      piece(3, 'authentic'),
    ]);
    expect(ordered.map((p) => p.index)).toEqual([2, 1, 3]);
  });

  it('contentFingerprint separa documentos que divergem no conteúdo', () => {
    const a = {
      rootHash: 'x',
      chain: ['1'],
      stays: [],
      verdict: 'corroborated',
    } as unknown as TimelineAttestation;
    const b = {
      rootHash: 'x',
      chain: ['2'],
      stays: [],
      verdict: 'corroborated',
    } as unknown as TimelineAttestation;
    expect(contentFingerprint(a)).not.toBe(contentFingerprint(b));
    expect(contentFingerprint(a)).toBe(contentFingerprint({ ...a }));
  });
});
