import { describe, expect, it } from 'vitest';

import {
  ATTESTATION_GENESIS,
  assessTimeline,
  buildTimelineAttestation,
  describeAttestationVerdict,
  describeCaveat,
  verifyTimelineAttestation,
  type AttestationInput,
} from '../timelineAttestation';
import type { PersonStay, PersonTimeline, PersonTransit } from '../personTimeline';

const stay = (over: Partial<PersonStay> = {}): PersonStay => ({
  id: 'stay-1',
  cameraId: 'cam-a',
  personId: 'p1',
  startMs: 1_000,
  endMs: 61_000,
  durationMs: 60_000,
  sightings: 4,
  confidence: 'confirmed',
  bestSimilarity: 0.92,
  openAtEdge: false,
  firstImageUrl: null,
  ...over,
});

const transit = (over: Partial<PersonTransit> = {}): PersonTransit => ({
  fromStayId: 'stay-1',
  toStayId: 'stay-2',
  fromCameraId: 'cam-a',
  toCameraId: 'cam-b',
  gapMs: 30_000,
  flag: 'confirmed',
  hasBlindGap: false,
  rationale: 'ok',
  ...over,
});

const timeline = (over: Partial<PersonTimeline> = {}): PersonTimeline => ({
  stays: [stay(), stay({ id: 'stay-2', cameraId: 'cam-b', startMs: 91_000, endMs: 151_000 })],
  transits: [transit()],
  excluded: { unverified: 0, spoofSuspect: 0, unidentified: 0 },
  firstSeenMs: 1_000,
  lastSeenMs: 151_000,
  camerasVisited: 2,
  hasConflict: false,
  truncated: false,
  ...over,
});

const input = (tl: PersonTimeline, personId: string | null = 'p1'): AttestationInput => ({
  attestationId: 'att-1',
  subject: { personId, label: 'Fulano' },
  window: { fromUtc: '2026-07-01T00:00:00.000Z', toUtc: '2026-07-01T01:00:00.000Z' },
  timeline: tl,
  issuance: {
    issuedAtUtc: '2026-07-01T02:00:00.000Z',
    issuedBy: 'operador@visao',
    sourceSystem: 'visao/1.0',
  },
});

describe('assessTimeline', () => {
  it('corrobora trajetória limpa', () => {
    const { verdict, caveats } = assessTimeline(timeline(), { personId: 'p1', label: null });
    expect(verdict).toBe('corroborated');
    expect(caveats).toHaveLength(0);
  });

  it('trata ausência de permanência como inconclusiva, nunca como ausência da pessoa', () => {
    const tl = timeline({ stays: [], transits: [], camerasVisited: 0 });
    const { verdict, caveats } = assessTimeline(tl, { personId: 'p1', label: null });
    expect(verdict).toBe('inconclusive');
    expect(caveats.map((c) => c.code)).toContain('no_observation');
  });

  it('conflito de co-presença contesta a trajetória', () => {
    const tl = timeline({
      transits: [transit({ flag: 'co_presence_conflict', gapMs: -5_000 })],
      hasConflict: true,
    });
    expect(assessTimeline(tl, { personId: 'p1', label: null }).verdict).toBe('contested');
  });

  it('permanência de outra pessoa contesta o atestado', () => {
    const tl = timeline({ stays: [stay(), stay({ id: 'stay-2', personId: 'p9' })] });
    expect(assessTimeline(tl, { personId: 'p1', label: null }).verdict).toBe('contested');
  });

  it('leitura descartada enfraquece sem contestar', () => {
    const tl = timeline({ excluded: { unverified: 2, spoofSuspect: 0, unidentified: 1 } });
    const { verdict, caveats } = assessTimeline(tl, { personId: 'p1', label: null });
    expect(verdict).toBe('partial');
    expect(caveats.find((c) => c.code === 'excluded_unverified')?.count).toBe(2);
  });

  it('câmera única não enfraquece o veredito', () => {
    const tl = timeline({
      stays: [stay()],
      transits: [],
      camerasVisited: 1,
    });
    const { verdict, caveats } = assessTimeline(tl, { personId: 'p1', label: null });
    expect(verdict).toBe('corroborated');
    expect(caveats.map((c) => c.code)).toEqual(['single_camera']);
  });

  it('contestação vence enfraquecimento', () => {
    const tl = timeline({
      stays: [stay({ confidence: 'unconfirmed' })],
      transits: [transit({ flag: 'co_presence_conflict' })],
      camerasVisited: 2,
    });
    expect(assessTimeline(tl, { personId: 'p1', label: null }).verdict).toBe('contested');
  });
});

describe('buildTimelineAttestation', () => {
  it('sela e reconfere', async () => {
    const att = await buildTimelineAttestation(input(timeline()));
    expect(att.genesis).toBe(ATTESTATION_GENESIS);
    expect(att.chain).toHaveLength(2);
    const v = await verifyTimelineAttestation(att);
    expect(v).toMatchObject({ intact: true, firstBrokenIndex: null, rootMatches: true });
  });

  it('não soma permanência aberta ao total confirmado', async () => {
    const tl = timeline({
      stays: [stay(), stay({ id: 'stay-2', openAtEdge: true, durationMs: 30_000 })],
    });
    const att = await buildTimelineAttestation(input(tl));
    expect(att.stats.confirmedDwellMs).toBe(60_000);
    expect(att.stats.openFloorMs).toBe(30_000);
    expect(att.verdict).toBe('partial');
  });

  it('é determinístico', async () => {
    const a = await buildTimelineAttestation(input(timeline()));
    const b = await buildTimelineAttestation(input(timeline()));
    expect(a.rootHash).toBe(b.rootHash);
  });

  it('denuncia permanência editada pelo primeiro elo divergente', async () => {
    const att = await buildTimelineAttestation(input(timeline()));
    const tampered = {
      ...att,
      stays: [att.stays[0], { ...att.stays[1], endMs: 999_999 }],
    };
    const v = await verifyTimelineAttestation(tampered);
    expect(v.intact).toBe(false);
    expect(v.firstBrokenIndex).toBe(1);
  });

  it('denuncia veredito falsificado mesmo com corrente coerente', async () => {
    const tl = timeline({ excluded: { unverified: 3, spoofSuspect: 0, unidentified: 0 } });
    const att = await buildTimelineAttestation(input(tl));
    const forged = { ...att, verdict: 'corroborated' as const };
    const v = await verifyTimelineAttestation(forged);
    expect(v.verdictMatches).toBe(false);
    expect(v.recomputedVerdict).toBe('partial');
    expect(v.intact).toBe(false);
  });

  it('referencia o selo de vídeo sem reafirmá-lo', async () => {
    const att = await buildTimelineAttestation({
      ...input(timeline()),
      relatedExportRootHash: 'a'.repeat(64),
    });
    expect(att.relatedExportRootHash).toBe('a'.repeat(64));
    expect(Object.keys(att)).not.toContain('segments');
  });

  it('rotula veredito e ressalvas em português', () => {
    expect(describeAttestationVerdict('contested')).toMatch(/contestada/i);
    expect(describeCaveat('open_stay')).toMatch(/saída/i);
  });
});
