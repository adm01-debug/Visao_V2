import { describe, expect, it } from 'vitest';
import {
  CANDIDATE_MARGIN,
  classifyFaceObservation,
  matchesFaceCriteria,
  normalizeFaceSearchCriteria,
  runFaceSearch,
  summarizeFaceSearch,
  type FaceObservation,
  type FaceSearchCriteria,
} from '@/lib/faces/faceSearch';

const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);
const HOUR = 3_600_000;

const criteria = (over: Partial<FaceSearchCriteria> = {}): FaceSearchCriteria => ({
  fromMs: NOW - 24 * HOUR,
  toMs: NOW,
  cameraIds: null,
  personIds: null,
  minSimilarity: 0.7,
  attributes: { gender: null, ageMin: null, ageMax: null },
  includeSpoof: false,
  ...over,
});

const obs = (over: Partial<FaceObservation> = {}): FaceObservation => ({
  id: 'a',
  timestampMs: NOW - HOUR,
  cameraId: 'cam-1',
  personId: 'p-1',
  similarity: 0.9,
  recognized: true,
  spoofDetected: false,
  livenessScore: 0.9,
  ageEstimated: 30,
  genderEstimated: 'male',
  imageUrl: null,
  ...over,
});

describe('normalizeFaceSearchCriteria', () => {
  it('recusa janela ausente e invertida', () => {
    expect(normalizeFaceSearchCriteria({ fromMs: null, toMs: NOW }, NOW)).toMatchObject({
      ok: false,
      reason: 'window_missing',
    });
    expect(normalizeFaceSearchCriteria({ fromMs: NOW, toMs: NOW - HOUR }, NOW)).toMatchObject({
      ok: false,
      reason: 'window_inverted',
    });
  });

  it('recusa janela no futuro e acima do teto', () => {
    expect(
      normalizeFaceSearchCriteria({ fromMs: NOW + HOUR, toMs: NOW + 2 * HOUR }, NOW)
    ).toMatchObject({
      ok: false,
      reason: 'window_in_future',
    });
    expect(
      normalizeFaceSearchCriteria({ fromMs: NOW - 40 * 24 * HOUR, toMs: NOW }, NOW)
    ).toMatchObject({ ok: false, reason: 'window_too_long' });
  });

  it('nunca deixa o fim ultrapassar o agora', () => {
    const r = normalizeFaceSearchCriteria({ fromMs: NOW - HOUR, toMs: NOW + 10 * HOUR }, NOW);
    expect(r.ok && r.criteria.toMs).toBe(NOW);
  });

  it('recusa corte de semelhança fora da faixa e idade invertida', () => {
    expect(
      normalizeFaceSearchCriteria({ fromMs: NOW - HOUR, toMs: NOW, minSimilarity: 0.05 }, NOW)
    ).toMatchObject({ ok: false, reason: 'similarity_out_of_range' });
    expect(
      normalizeFaceSearchCriteria(
        { fromMs: NOW - HOUR, toMs: NOW, attributes: { ageMin: 40, ageMax: 20 } },
        NOW
      )
    ).toMatchObject({ ok: false, reason: 'age_range_inverted' });
  });
});

describe('classifyFaceObservation', () => {
  it('fraude vence semelhança alta', () => {
    const r = classifyFaceObservation(obs({ spoofDetected: true, similarity: 0.99 }), criteria());
    expect(r.verdict).toBe('spoof_suspect');
  });

  it('ausência de medição é indeterminada, nunca desconhecida', () => {
    expect(classifyFaceObservation(obs({ similarity: null }), criteria()).verdict).toBe(
      'unverified'
    );
  });

  it('folga abaixo do corte é candidata', () => {
    const c = criteria();
    const r = classifyFaceObservation(
      obs({ similarity: c.minSimilarity - CANDIDATE_MARGIN / 2 }),
      c
    );
    expect(r.verdict).toBe('candidate');
  });

  it('vivacidade baixa rebaixa identificação', () => {
    expect(classifyFaceObservation(obs({ livenessScore: 0.2 }), criteria()).verdict).toBe(
      'candidate'
    );
  });

  it('identifica com semelhança acima do corte e cadastro vinculado', () => {
    expect(classifyFaceObservation(obs(), criteria()).verdict).toBe('identified');
  });
});

describe('matchesFaceCriteria', () => {
  it('fim é exclusivo e início inclusivo', () => {
    const c = criteria();
    expect(matchesFaceCriteria(obs({ timestampMs: c.fromMs }), c)).toBe(true);
    expect(matchesFaceCriteria(obs({ timestampMs: c.toMs }), c)).toBe(false);
  });

  it('atributo ausente é excluído quando há filtro', () => {
    const c = criteria({ attributes: { gender: 'male', ageMin: null, ageMax: null } });
    expect(matchesFaceCriteria(obs({ genderEstimated: null }), c)).toBe(false);
  });
});

describe('runFaceSearch', () => {
  it('ordena por instante desc com desempate estável e resume', () => {
    const c = criteria();
    const out = runFaceSearch(
      [
        obs({ id: 'b', timestampMs: NOW - 2 * HOUR }),
        obs({ id: 'a', timestampMs: NOW - 2 * HOUR }),
        obs({ id: 'c', timestampMs: NOW - HOUR, similarity: null }),
      ],
      c
    );
    expect(out.map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(summarizeFaceSearch(out)).toMatchObject({ total: 3, identified: 2, unverified: 1 });
  });
});
