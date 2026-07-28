import { describe, expect, it } from 'vitest';

import {
  assessReadingProvenance,
  compareProvenance,
  deriveStageTier,
  normalizeProvenanceTier,
  PROVENANCE_TIERS,
  PROVENANCE_WEIGHT,
  type ProvenancedReading,
} from '../readingProvenance';

const reading = (
  id: string,
  sourceId: string,
  stages: ProvenancedReading['stages'],
  confidence?: number,
): ProvenancedReading => ({ id, sourceId, stages, confidence });

describe('normalizeProvenanceTier', () => {
  it('aceita rótulos conhecidos independentemente de caixa e espaço', () => {
    expect(normalizeProvenanceTier(' SENSOR ')).toBe('sensor');
    expect(normalizeProvenanceTier('Llm')).toBe('llm');
  });

  it('rebaixa qualquer coisa não reconhecida para unknown (P5)', () => {
    for (const raw of [null, undefined, 42, 'camera', 'gpt', '', {}]) {
      expect(normalizeProvenanceTier(raw)).toBe('unknown');
    }
  });
});

describe('deriveStageTier', () => {
  it('devolve o elo mais fraco da cadeia (P4)', () => {
    expect(deriveStageTier(['sensor', 'llm'])).toBe('llm');
    expect(deriveStageTier(['human', 'sensor', 'model'])).toBe('model');
    expect(deriveStageTier(['model'])).toBe('model');
  });

  it('cadeia vazia é unknown, nunca o melhor caso', () => {
    expect(deriveStageTier([])).toBe('unknown');
  });
});

describe('assessReadingProvenance', () => {
  it('conjunto vazio não sustenta nada (P7)', () => {
    const result = assessReadingProvenance([]);
    expect(result.strength).toBe('unusable');
    expect(result.bestTier).toBeNull();
    expect(result.caveats.map((c) => c.code)).toContain('no_reading');
  });

  it('sensor sozinho é afirmável', () => {
    const result = assessReadingProvenance([reading('r1', 'cam-1', ['sensor'])]);
    expect(result.strength).toBe('affirmable');
    expect(result.governingTier).toBe('sensor');
  });

  it('LLM nunca afirma, nem repetido dez vezes (P2)', () => {
    const readings = Array.from({ length: 10 }, (_, i) =>
      reading(`r${i}`, `cam-${i}`, ['llm'], 0.99),
    );
    const result = assessReadingProvenance(readings);
    expect(result.strength).toBe('investigative');
    expect(result.caveats.map((c) => c.code)).toContain('llm_only');
  });

  it('confiança alta não promove procedência (P1)', () => {
    const forte = assessReadingProvenance([reading('a', 'cam-1', ['llm'], 0.999)]);
    const fraca = assessReadingProvenance([reading('a', 'cam-1', ['llm'], 0.1)]);
    expect(forte.strength).toBe(fraca.strength);
    expect(forte.governingTier).toBe('llm');
  });

  it('modelo isolado é investigativo; corroborado por fonte distinta vira afirmável (P3)', () => {
    const sozinho = assessReadingProvenance([reading('a', 'cam-1', ['model'])]);
    expect(sozinho.strength).toBe('investigative');
    expect(sozinho.caveats.map((c) => c.code)).toContain('uncorroborated_model');

    const mesmaFonte = assessReadingProvenance([
      reading('a', 'cam-1', ['model']),
      reading('b', 'cam-1', ['model']),
    ]);
    expect(mesmaFonte.strength).toBe('investigative');
    expect(mesmaFonte.caveats.map((c) => c.code)).toContain('single_source');

    const fontesDistintas = assessReadingProvenance([
      reading('a', 'cam-1', ['model']),
      reading('b', 'cam-2', ['model']),
    ]);
    expect(fontesDistintas.strength).toBe('affirmable');
    expect(fontesDistintas.corroborated).toBe(true);
  });

  it('LLM presente ao lado de sensor é declarado, não apagado (P6)', () => {
    const result = assessReadingProvenance([
      reading('a', 'cam-1', ['sensor']),
      reading('b', 'cam-2', ['llm']),
    ]);
    expect(result.strength).toBe('affirmable');
    expect(result.worstTier).toBe('llm');
    expect(result.caveats.map((c) => c.code)).toContain('llm_in_evidence');
  });

  it('leitura sem origem não vira sensor por omissão e não corrobora (P5)', () => {
    const result = assessReadingProvenance([
      reading('a', 'cam-1', ['model']),
      reading('b', 'cam-2', [], 0.97),
    ]);
    expect(result.strength).toBe('investigative');
    expect(result.independentSources).toBe(1);
    const codes = result.caveats.map((c) => c.code);
    expect(codes).toContain('unknown_provenance');
    expect(codes).toContain('confidence_without_provenance');
  });

  it('é comutativa: a ordem das leituras não muda o parecer', () => {
    const readings = [
      reading('a', 'cam-1', ['sensor']),
      reading('b', 'cam-2', ['llm']),
      reading('c', 'cam-3', []),
    ];
    const direto = assessReadingProvenance(readings);
    const invertido = assessReadingProvenance([...readings].reverse());
    expect(invertido.strength).toBe(direto.strength);
    expect(invertido.bestTier).toBe(direto.bestTier);
    expect(invertido.worstTier).toBe(direto.worstTier);
    expect(invertido.summary).toBe(direto.summary);
  });

  it('pesos são estritamente decrescentes na ordem declarada', () => {
    for (let i = 1; i < PROVENANCE_TIERS.length; i += 1) {
      expect(compareProvenance(PROVENANCE_TIERS[i - 1]!, PROVENANCE_TIERS[i]!)).toBeGreaterThan(0);
    }
    expect(PROVENANCE_WEIGHT.unknown).toBe(0);
  });
});
