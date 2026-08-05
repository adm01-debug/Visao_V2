import { describe, it, expect } from 'vitest';
import type { FaceSearchResult } from '@/lib/faces/faceSearch';
import {
  buildPersonTimeline,
  describeStay,
  SESSION_GAP_MS,
  EDGE_TOLERANCE_MS,
  MAX_STAYS,
} from '@/lib/faces/personTimeline';

const T0 = Date.UTC(2026, 6, 1, 12, 0, 0);

function reading(over: Partial<FaceSearchResult> & { id: string }): FaceSearchResult {
  return {
    id: over.id,
    timestampMs: over.timestampMs ?? T0,
    cameraId: over.cameraId ?? 'cam-a',
    personId: over.personId ?? 'p1',
    personName: null,
    similarity: 'similarity' in over ? (over.similarity ?? null) : 0.9,
    recognized: true,
    spoofDetected: false,
    livenessScore: 0.9,
    ageEstimated: null,
    genderEstimated: null,
    imageUrl: over.imageUrl ?? null,
    verdict: over.verdict ?? 'identified',
    rationale: '',
  };
}

const WINDOW_END = T0 + 24 * 60 * 60 * 1000;

describe('personTimeline — agrupamento em permanências', () => {
  it('sem leitura, devolve linha do tempo vazia sem inventar instantes', () => {
    const t = buildPersonTimeline([], WINDOW_END);
    expect(t.stays).toHaveLength(0);
    expect(t.firstSeenMs).toBeNull();
    expect(t.lastSeenMs).toBeNull();
    expect(t.hasConflict).toBe(false);
  });

  it('leituras próximas na mesma câmera formam uma permanência única', () => {
    const t = buildPersonTimeline(
      [
        reading({ id: 'a', timestampMs: T0 }),
        reading({ id: 'b', timestampMs: T0 + 60_000 }),
        reading({ id: 'c', timestampMs: T0 + 120_000 }),
      ],
      WINDOW_END
    );
    expect(t.stays).toHaveLength(1);
    expect(t.stays[0]!.sightings).toBe(3);
    expect(t.stays[0]!.durationMs).toBe(120_000);
  });

  it('intervalo maior que o corte abre nova permanência', () => {
    const t = buildPersonTimeline(
      [
        reading({ id: 'a', timestampMs: T0 }),
        reading({ id: 'b', timestampMs: T0 + SESSION_GAP_MS + 1 }),
      ],
      WINDOW_END
    );
    expect(t.stays).toHaveLength(2);
  });

  it('exatamente no corte ainda é a mesma permanência (limite declarado)', () => {
    const t = buildPersonTimeline(
      [
        reading({ id: 'a', timestampMs: T0 }),
        reading({ id: 'b', timestampMs: T0 + SESSION_GAP_MS }),
      ],
      WINDOW_END
    );
    expect(t.stays).toHaveLength(1);
  });
});

describe('personTimeline — dúvida nunca vira certeza', () => {
  it('candidato não prolonga permanência confirmada', () => {
    const t = buildPersonTimeline(
      [
        reading({ id: 'a', timestampMs: T0, verdict: 'identified' }),
        reading({ id: 'b', timestampMs: T0 + 30_000, verdict: 'candidate' }),
      ],
      WINDOW_END
    );
    expect(t.stays).toHaveLength(2);
    expect(t.stays.map((s) => s.confidence).sort()).toEqual(['confirmed', 'unconfirmed']);
    // A permanência confirmada não teve seu fim empurrado pela dúvida.
    const confirmed = t.stays.find((s) => s.confidence === 'confirmed')!;
    expect(confirmed.endMs).toBe(T0);
  });

  it('não medido e fraude ficam fora da trajetória mas são contados', () => {
    const t = buildPersonTimeline(
      [
        reading({ id: 'a', verdict: 'unverified' }),
        reading({ id: 'b', verdict: 'spoof_suspect' }),
        reading({ id: 'c', verdict: 'unidentified' }),
      ],
      WINDOW_END
    );
    expect(t.stays).toHaveLength(0);
    expect(t.excluded).toEqual({ unverified: 1, spoofSuspect: 1, unidentified: 1 });
  });

  it('semelhança não medida nunca vira zero', () => {
    const t = buildPersonTimeline([reading({ id: 'a', similarity: null })], WINDOW_END);
    expect(t.stays[0]!.bestSimilarity).toBeNull();
  });
});

describe('personTimeline — permanência aberta', () => {
  it('encostar no fim da janela deixa a saída não observada', () => {
    const t = buildPersonTimeline(
      [reading({ id: 'a', timestampMs: WINDOW_END - 1000 })],
      WINDOW_END
    );
    expect(t.stays[0]!.openAtEdge).toBe(true);
    expect(describeStay(t.stays[0]!)).toContain('não foi observada');
  });

  it('fora da tolerância, a permanência é fechada', () => {
    const t = buildPersonTimeline(
      [reading({ id: 'a', timestampMs: WINDOW_END - EDGE_TOLERANCE_MS - 1 })],
      WINDOW_END
    );
    expect(t.stays[0]!.openAtEdge).toBe(false);
  });
});

describe('personTimeline — deslocamento e conflito', () => {
  it('duas câmeras em sequência geram trecho confirmado', () => {
    const t = buildPersonTimeline(
      [
        reading({ id: 'a', cameraId: 'cam-a', timestampMs: T0 }),
        reading({ id: 'b', cameraId: 'cam-b', timestampMs: T0 + 10 * 60_000 }),
      ],
      WINDOW_END
    );
    expect(t.transits).toHaveLength(1);
    expect(t.transits[0]!.flag).toBe('confirmed');
    expect(t.camerasVisited).toBe(2);
  });

  it('sobreposição em câmeras distintas é conflito, não escolha', () => {
    const t = buildPersonTimeline(
      [
        reading({ id: 'a', cameraId: 'cam-a', timestampMs: T0 }),
        reading({ id: 'a2', cameraId: 'cam-a', timestampMs: T0 + 120_000 }),
        reading({ id: 'b', cameraId: 'cam-b', timestampMs: T0 + 60_000 }),
      ],
      WINDOW_END
    );
    expect(t.hasConflict).toBe(true);
    expect(t.transits.some((x) => x.flag === 'co_presence_conflict')).toBe(true);
  });

  it('trecho com ponta duvidosa nunca é confirmado', () => {
    const t = buildPersonTimeline(
      [
        reading({ id: 'a', cameraId: 'cam-a', timestampMs: T0, verdict: 'identified' }),
        reading({
          id: 'b',
          cameraId: 'cam-b',
          timestampMs: T0 + 10 * 60_000,
          verdict: 'candidate',
        }),
      ],
      WINDOW_END
    );
    expect(t.transits[0]!.flag).toBe('unconfirmed');
  });

  it('havendo descarte na janela, todo trecho declara lacuna', () => {
    const t = buildPersonTimeline(
      [
        reading({ id: 'a', cameraId: 'cam-a', timestampMs: T0 }),
        reading({ id: 'x', verdict: 'unverified', timestampMs: T0 + 5 * 60_000 }),
        reading({ id: 'b', cameraId: 'cam-b', timestampMs: T0 + 10 * 60_000 }),
      ],
      WINDOW_END
    );
    expect(t.transits[0]!.hasBlindGap).toBe(true);
  });
});

describe('personTimeline — determinismo e teto', () => {
  it('a ordem de entrada não muda o resultado', () => {
    const rs = [
      reading({ id: 'a', timestampMs: T0 }),
      reading({ id: 'b', cameraId: 'cam-b', timestampMs: T0 + 600_000 }),
      reading({ id: 'c', timestampMs: T0 + 60_000 }),
    ];
    const forward = buildPersonTimeline(rs, WINDOW_END);
    const backward = buildPersonTimeline([...rs].reverse(), WINDOW_END);
    expect(backward).toEqual(forward);
  });

  it('excedente é truncado com aviso, nunca silenciosamente', () => {
    const rs = Array.from({ length: MAX_STAYS + 5 }, (_, i) =>
      reading({ id: `r${i}`, timestampMs: T0 + i * (SESSION_GAP_MS + 1000) })
    );
    const t = buildPersonTimeline(rs, WINDOW_END + 10 * 24 * 3600_000);
    expect(t.truncated).toBe(true);
    expect(t.stays).toHaveLength(MAX_STAYS);
  });
});
