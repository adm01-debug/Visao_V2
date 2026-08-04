import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CADENCE,
  commitDecision,
  createCadenceState,
  decideCadence,
  describeBudget,
  releaseIdentify,
  type FrameObservation,
} from '../inferenceCadence';

const frame = (over: Partial<FrameObservation> = {}): FrameObservation => ({
  capturedAtMs: 1_000,
  hasActivity: true,
  trackId: 't1',
  trackEverIdentified: false,
  ...over,
});

describe('inferenceCadence', () => {
  it('descarta frame velho antes de qualquer outra consideração (C6)', () => {
    const d = decideCadence(createCadenceState(), frame({ capturedAtMs: 0 }), 5_000);
    expect(d.action).toBe('skip');
    expect(d.reason).toBe('stale_frame');
  });

  it('sem atividade não roda nada', () => {
    const d = decideCadence(createCadenceState(), frame({ hasActivity: false }), 1_000);
    expect(d).toMatchObject({ action: 'skip', reason: 'no_activity' });
  });

  it('primeira aparição da trilha identifica sem esperar intervalo (C4)', () => {
    const d = decideCadence(createCadenceState(), frame(), 1_000);
    expect(d.action).toBe('identify');
    expect(d.reason).toBe('first_sighting');
    expect(d.trackId).toBe('t1');
  });

  it('identificar implica rastrear no mesmo instante (C1)', () => {
    const s0 = createCadenceState();
    const d = decideCadence(s0, frame(), 1_000);
    const s1 = commitDecision(s0, d);
    expect(s1.lastTrackAtMs).toBe(1_000);
    expect(s1.lastIdentifyAtMsByTrack.t1).toBe(1_000);
  });

  it('respeita o piso de cadência do rastreio (C2)', () => {
    let s = createCadenceState();
    s = commitDecision(s, decideCadence(s, frame(), 1_000));
    const d = decideCadence(s, frame({ capturedAtMs: 1_100 }), 1_100);
    expect(d).toMatchObject({ action: 'skip', reason: 'track_interval' });
  });

  it('reidentificação antes do intervalo degrada para rastreio, nunca para skip', () => {
    let s = createCadenceState();
    s = commitDecision(s, decideCadence(s, frame(), 1_000));
    s = releaseIdentify(s);
    const d = decideCadence(s, frame({ capturedAtMs: 1_500, trackEverIdentified: true }), 1_500);
    expect(d).toMatchObject({ action: 'track', reason: 'identify_interval' });
  });

  it('orçamento esgotado estrangula o caro e preserva o barato (C3)', () => {
    let s = createCadenceState();
    const cfg = { ...DEFAULT_CADENCE, identifyBudget: 1 };
    s = commitDecision(s, decideCadence(s, frame(), 1_000, cfg), cfg);
    s = releaseIdentify(s);
    const d = decideCadence(s, frame({ capturedAtMs: 5_000, trackId: 't2' }), 5_000, cfg);
    expect(d).toMatchObject({ action: 'track', reason: 'budget_exhausted' });
  });

  it('concorrência saturada degrada para rastreio', () => {
    let s = createCadenceState();
    const cfg = { ...DEFAULT_CADENCE, maxConcurrentIdentify: 1 };
    s = commitDecision(s, decideCadence(s, frame(), 1_000, cfg), cfg);
    const d = decideCadence(s, frame({ capturedAtMs: 5_000, trackId: 't2' }), 5_000, cfg);
    expect(d).toMatchObject({
      action: 'track',
      reason: 'concurrency_saturated',
    });
  });

  it('relógio retrocedendo não libera execução extra (C5)', () => {
    let s = createCadenceState();
    s = commitDecision(s, decideCadence(s, frame({ capturedAtMs: 10_000 }), 10_000));
    const d = decideCadence(
      s,
      frame({ capturedAtMs: 10_050, trackId: 't1', trackEverIdentified: true }),
      2_000
    );
    expect(d.effectiveNowMs).toBe(10_000);
    expect(d.action).toBe('skip');
  });

  it('skip não move cadência, só o piso do relógio (C7)', () => {
    const s0 = createCadenceState();
    const d = decideCadence(s0, frame({ hasActivity: false }), 4_000);
    const s1 = commitDecision(s0, d);
    expect(s1.lastTrackAtMs).toBeNull();
    expect(s1.clockFloorMs).toBe(4_000);
  });

  it('descreve a pressão do orçamento para a tela', () => {
    let s = createCadenceState();
    const cfg = { ...DEFAULT_CADENCE, identifyBudget: 2 };
    expect(describeBudget(s, 0, cfg).pressure).toBe('healthy');
    s = commitDecision(s, decideCadence(s, frame(), 1_000, cfg), cfg);
    /* 1 de 2 = 50% do teto: ainda folgado. */
    expect(describeBudget(s, 1_000, cfg).pressure).toBe('healthy');
    /* 7 de 10 = 70%: aperto declarado antes do esgotamento. */
    expect(
      describeBudget(
        {
          ...createCadenceState(),
          recentIdentifyAtMs: [1, 2, 3, 4, 5, 6, 7],
        },
        1_000,
        { ...DEFAULT_CADENCE, identifyBudget: 10 }
      ).pressure
    ).toBe('tight');
    s = releaseIdentify(s);
    s = commitDecision(
      s,
      decideCadence(s, frame({ capturedAtMs: 5_000, trackId: 't2' }), 5_000, cfg),
      cfg
    );
    const view = describeBudget(s, 5_000, cfg);
    expect(view).toMatchObject({ used: 2, remaining: 0, pressure: 'exhausted' });
  });

  it('janela deslizante devolve orçamento após expirar', () => {
    let s = createCadenceState();
    const cfg = { ...DEFAULT_CADENCE, identifyBudget: 1, budgetWindowMs: 1_000 };
    s = commitDecision(s, decideCadence(s, frame(), 1_000, cfg), cfg);
    s = releaseIdentify(s);
    const d = decideCadence(s, frame({ capturedAtMs: 9_000, trackId: 't2' }), 9_000, cfg);
    expect(d.action).toBe('identify');
  });
});
