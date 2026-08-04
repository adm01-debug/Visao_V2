import { describe, expect, it } from 'vitest';
import type { FaceSearchResult, FaceSearchVerdict } from '@/lib/faces/faceSearch';
import {
  MAX_BUCKETS,
  ZOOM_STEPS_MS,
  availableZoomSteps,
  buildFaceTimeline,
  describeZoomStep,
  finestZoomStep,
  pickZoomStep,
  selectBucketResults,
} from '@/lib/faces/faceTimeline';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 4, 10, 0, 0, 0);

function obs(id: string, atMs: number, verdict: FaceSearchVerdict): FaceSearchResult {
  return {
    id,
    timestampMs: atMs,
    cameraId: 'cam-1',
    personId: verdict === 'identified' ? 'p1' : null,
    personName: null,
    similarity: 0.8,
    recognized: verdict === 'identified',
    spoofDetected: verdict === 'spoof_suspect',
    livenessScore: 0.9,
    ageEstimated: null,
    genderEstimated: null,
    imageUrl: null,
    verdict,
    rationale: 'teste',
  };
}

const ok = (r: ReturnType<typeof buildFaceTimeline>) => {
  if (!r.ok) throw new Error(`esperava faixa montada, veio ${r.reason}`);
  return r.timeline;
};

describe('faceTimeline — zoom', () => {
  it('escolhe o passo mais grosso que cabe e recusa janela impossível', () => {
    expect(pickZoomStep(T0, T0 + DAY)).toBe(DAY);
    expect(pickZoomStep(T0, T0 + 2 * HOUR)).toBe(DAY);
    expect(pickZoomStep(T0, T0)).toBeNull();
    expect(pickZoomStep(T0, T0 + MAX_BUCKETS * DAY + DAY)).toBeNull();
  });

  it('o passo mais fino disponível nunca estoura o teto de divisões', () => {
    for (const span of [HOUR, 6 * HOUR, DAY, 7 * DAY, 31 * DAY]) {
      const step = finestZoomStep(T0, T0 + span);
      expect(step).not.toBeNull();
      expect(Math.ceil(span / (step as number))).toBeLessThanOrEqual(MAX_BUCKETS);
    }
  });

  it('só oferece zooms que cabem, sempre em ordem declarada', () => {
    const steps = availableZoomSteps(T0, T0 + DAY);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps).toEqual(ZOOM_STEPS_MS.filter((s) => steps.includes(s)));
    for (const s of steps) expect(Math.ceil(DAY / s)).toBeLessThanOrEqual(MAX_BUCKETS);
  });
});

describe('faceTimeline — construção', () => {
  it('recusa janela inválida e zoom desconhecido', () => {
    expect(buildFaceTimeline([], { fromMs: T0, toMs: T0 })).toEqual({
      ok: false,
      reason: 'window_invalid',
    });
    expect(buildFaceTimeline([], { fromMs: T0, toMs: T0 + DAY, stepMs: 7 })).toEqual({
      ok: false,
      reason: 'step_unknown',
    });
    expect(buildFaceTimeline([], { fromMs: T0, toMs: T0 + 40 * DAY, stepMs: 60_000 })).toEqual({
      ok: false,
      reason: 'window_too_long_for_step',
    });
  });

  it('nenhuma leitura da janela se perde e a borda final entra no último balde', () => {
    const results = [
      obs('a', T0, 'identified'),
      obs('b', T0 + HOUR, 'candidate'),
      obs('c', T0 + DAY, 'unverified'), // exatamente no fim
      obs('fora-antes', T0 - 1, 'identified'),
      obs('fora-depois', T0 + DAY + 1, 'identified'),
    ];
    const tl = ok(buildFaceTimeline(results, { fromMs: T0, toMs: T0 + DAY, stepMs: HOUR }));
    expect(tl.totalCount).toBe(3);
    expect(tl.buckets.reduce((n, b) => n + b.count, 0)).toBe(3);
    expect(tl.buckets[tl.buckets.length - 1]?.resultIds).toContain('c');
    expect(tl.droppedCount).toBe(0);
  });

  it('pior leitura manda: 40 não identificadas + 1 fraude pinta fraude', () => {
    const many = Array.from({ length: 40 }, (_, i) => obs(`u${i}`, T0 + i * 1000, 'unidentified'));
    const tl = ok(
      buildFaceTimeline([...many, obs('s', T0 + 2000, 'spoof_suspect')], {
        fromMs: T0,
        toMs: T0 + DAY,
        stepMs: HOUR,
      })
    );
    expect(tl.buckets[0]?.tone).toBe('spoof_suspect');
  });

  it('balde vazio é "sem registro", nunca ausência de pessoa', () => {
    const tl = ok(
      buildFaceTimeline([obs('a', T0 + 5 * HOUR, 'identified')], {
        fromMs: T0,
        toMs: T0 + DAY,
        stepMs: HOUR,
      })
    );
    expect(tl.buckets[0]?.tone).toBe('idle');
    expect(tl.buckets[0]?.count).toBe(0);
    expect(tl.buckets[5]?.tone).toBe('identified');
  });

  it('bordas ancoram no início da janela, não na meia-noite local', () => {
    const odd = T0 + 37 * 60 * 1000 + 13_000;
    const tl = ok(buildFaceTimeline([], { fromMs: odd, toMs: odd + 6 * HOUR, stepMs: HOUR }));
    expect(tl.buckets[0]?.startMs).toBe(odd);
    expect(tl.buckets[1]?.startMs).toBe(odd + HOUR);
    expect(tl.buckets[tl.buckets.length - 1]?.endMs).toBe(odd + 6 * HOUR);
  });

  it('truncamento marca a faixa como parcial', () => {
    const tl = ok(buildFaceTimeline([], { fromMs: T0, toMs: T0 + DAY, partial: true }));
    expect(tl.partial).toBe(true);
    expect(ok(buildFaceTimeline([], { fromMs: T0, toMs: T0 + DAY })).partial).toBe(false);
  });

  it('é determinística: a mesma busca produz a mesma faixa', () => {
    const results = Array.from({ length: 200 }, (_, i) =>
      obs(`r${i}`, T0 + i * 7 * 60 * 1000, i % 3 === 0 ? 'identified' : 'candidate')
    );
    const a = ok(buildFaceTimeline(results, { fromMs: T0, toMs: T0 + DAY }));
    const b = ok(buildFaceTimeline([...results].reverse(), { fromMs: T0, toMs: T0 + DAY }));
    expect(a.buckets.map((x) => [x.startMs, x.count, x.tone])).toEqual(
      b.buckets.map((x) => [x.startMs, x.count, x.tone])
    );
  });

  it('recorte de balde devolve exatamente as leituras daquele intervalo', () => {
    const results = [
      obs('a', T0 + 10 * 60 * 1000, 'identified'),
      obs('b', T0 + 70 * 60 * 1000, 'candidate'),
    ];
    const tl = ok(buildFaceTimeline(results, { fromMs: T0, toMs: T0 + DAY, stepMs: HOUR }));
    const first = tl.buckets[0];
    expect(first).toBeDefined();
    expect(selectBucketResults(results, first!).map((r) => r.id)).toEqual(['a']);
  });

  it('zoom mais fino nunca inventa nem perde leitura', () => {
    const results = Array.from({ length: 137 }, (_, i) =>
      obs(`r${i}`, T0 + i * 3 * 60 * 1000, 'unverified')
    );
    for (const step of availableZoomSteps(T0, T0 + DAY)) {
      const tl = ok(buildFaceTimeline(results, { fromMs: T0, toMs: T0 + DAY, stepMs: step }));
      expect(tl.totalCount).toBe(137);
      expect(new Set(tl.buckets.flatMap((b) => b.resultIds)).size).toBe(137);
    }
  });

  it('rotula o passo de forma legível', () => {
    expect(describeZoomStep(DAY)).toBe('1 dia');
    expect(describeZoomStep(6 * HOUR)).toBe('6 h');
    expect(describeZoomStep(15 * 60 * 1000)).toBe('15 min');
  });
});
