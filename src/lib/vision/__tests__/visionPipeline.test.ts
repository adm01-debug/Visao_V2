import { describe, expect, it } from 'vitest';
import { DEFAULT_CADENCE, type FrameObservation } from '../inferenceCadence';
import {
  createPipeline,
  describePipeline,
  registerProcessor,
  settleTask,
  tickPipeline,
  type VisionProcessor,
} from '../visionPipeline';

const T0 = 1_700_000_000_000;

const proc = (over: Partial<VisionProcessor> & Pick<VisionProcessor, 'id'>): VisionProcessor => ({
  capabilities: ['track'],
  minIntervalMs: 0,
  maxFrameAgeMs: 10_000,
  failureThreshold: 2,
  quarantineMs: 1_000,
  ...over,
});

const obs = (at: number, over: Partial<FrameObservation> = {}): FrameObservation => ({
  capturedAtMs: at,
  hasActivity: true,
  trackId: 't1',
  trackEverIdentified: false,
  ...over,
});

describe('visionPipeline — Onda 208', () => {
  it('P2: processador só recebe tarefa da capacidade que declarou', () => {
    let state = registerProcessor(createPipeline('cam'), proc({ id: 'tr' }));
    state = registerProcessor(state, proc({ id: 'id', capabilities: ['identify'] }));
    const tick = tickPipeline(state, { frameId: 1, capturedAtMs: T0 }, obs(T0), T0);
    const kinds = Object.fromEntries(tick.tasks.map((t) => [t.processorId, t.kind]));
    expect(kinds).toEqual({ tr: 'track', id: 'identify' });
  });

  it('P3: identificação é única por tick, mesmo com dois capazes', () => {
    let state = registerProcessor(
      createPipeline('cam'),
      proc({ id: 'a', capabilities: ['track', 'identify'] })
    );
    state = registerProcessor(state, proc({ id: 'b', capabilities: ['track', 'identify'] }));
    const tick = tickPipeline(state, { frameId: 1, capturedAtMs: T0 }, obs(T0), T0);
    expect(tick.tasks.filter((t) => t.kind === 'identify')).toHaveLength(1);
    expect(tick.tasks.filter((t) => t.kind === 'track')).toHaveLength(1);
  });

  it('P5: identificação sem quem a assuma nunca é cobrada do orçamento', () => {
    const state = registerProcessor(createPipeline('cam'), proc({ id: 'tr' }));
    const tick = tickPipeline(state, { frameId: 1, capturedAtMs: T0 }, obs(T0), T0);
    expect(tick.decision?.action).toBe('identify');
    expect(tick.tasks.every((t) => t.kind === 'track')).toBe(true);
    expect(tick.state.cadence.recentIdentifyAtMs).toHaveLength(0);
    expect(tick.state.cadence.inFlightIdentify).toBe(0);
  });

  it('P5: falha na identificação libera concorrência, nunca o orçamento', () => {
    const state = registerProcessor(
      createPipeline('cam'),
      proc({ id: 'id', capabilities: ['identify'] })
    );
    const tick = tickPipeline(state, { frameId: 1, capturedAtMs: T0 }, obs(T0), T0);
    const task = tick.tasks[0]!;
    expect(tick.state.cadence.inFlightIdentify).toBe(1);
    const settled = settleTask(tick.state, task, 'failure', T0 + 50);
    expect(settled.state.cadence.inFlightIdentify).toBe(0);
    expect(settled.state.cadence.recentIdentifyAtMs).toHaveLength(1);
  });

  it('P6: quarentena suspende, volta em observação e recaída suspende de novo', () => {
    let state = registerProcessor(createPipeline('cam'), proc({ id: 'q' }));
    let now = T0;
    const push = () => {
      now += 500;
      const tick = tickPipeline(
        state,
        { frameId: now, capturedAtMs: now },
        obs(now, { trackId: null }),
        now
      );
      state = tick.state;
      return tick;
    };

    state = settleTask(state, push().tasks[0]!, 'failure', now).state;
    expect(state.runtimes['q']?.health).toBe('degraded');
    state = settleTask(state, push().tasks[0]!, 'failure', now).state;
    expect(state.runtimes['q']?.health).toBe('quarantined');

    const refused = push();
    expect(refused.tasks).toHaveLength(0);
    expect(refused.refusals[0]?.reason).toBe('quarantined');

    now += 2_000;
    const back = push();
    expect(back.tasks).toHaveLength(1);
    expect(state.runtimes['q']?.health).toBe('probation');

    const relapse = settleTask(state, back.tasks[0]!, 'failure', now);
    expect(relapse.state.runtimes['q']?.health).toBe('quarantined');
    const cured = settleTask(state, back.tasks[0]!, 'success', now);
    expect(cured.state.runtimes['q']?.health).toBe('healthy');
  });

  it('P4: laudo de frame superado é tardio e não altera a saúde', () => {
    const state = registerProcessor(createPipeline('cam'), proc({ id: 'p' }));
    const first = tickPipeline(state, { frameId: 1, capturedAtMs: T0 }, obs(T0), T0);
    const done = settleTask(first.state, first.tasks[0]!, 'success', T0 + 10);
    const second = tickPipeline(
      done.state,
      { frameId: 2, capturedAtMs: T0 + 400 },
      obs(T0 + 400),
      T0 + 400
    );
    const late = settleTask(second.state, first.tasks[0]!, 'failure', T0 + 500);
    expect(late.late).toBe(true);
    expect(late.state.runtimes['p']?.health).toBe('healthy');
    expect(late.state.runtimes['p']?.stats.late).toBe(1);
  });

  it('recusa libera o slot do barramento no mesmo tick', () => {
    let state = registerProcessor(createPipeline('cam'), proc({ id: 'q' }));
    const t = tickPipeline(state, { frameId: 1, capturedAtMs: T0 }, obs(T0), T0);
    state = settleTask(t.state, t.tasks[0]!, 'failure', T0 + 1).state;
    const t2 = tickPipeline(state, { frameId: 2, capturedAtMs: T0 + 500 }, obs(T0 + 500), T0 + 500);
    state = settleTask(t2.state, t2.tasks[0]!, 'failure', T0 + 501).state;
    expect(state.runtimes['q']?.health).toBe('quarantined');

    const refused = tickPipeline(
      state,
      { frameId: 3, capturedAtMs: T0 + 900 },
      obs(T0 + 900),
      T0 + 900
    );
    expect(refused.state.bus.slots['q']?.inFlightFrameId).toBeNull();
    expect(refused.state.bus.slots['q']?.pending).toBeNull();
  });

  it('P1: sem atividade não há tarefa, e a recusa é registrada', () => {
    const state = registerProcessor(createPipeline('cam'), proc({ id: 'p' }));
    const tick = tickPipeline(
      state,
      { frameId: 1, capturedAtMs: T0 },
      obs(T0, { hasActivity: false }),
      T0
    );
    expect(tick.tasks).toHaveLength(0);
    expect(tick.refusals[0]?.reason).toBe('cadence_skip');
    expect(tick.state.runtimes['p']?.stats.refused).toBe(1);
  });

  it('describePipeline expõe degradação e razão de sucesso', () => {
    const state = registerProcessor(createPipeline('cam', DEFAULT_CADENCE), proc({ id: 'p' }));
    const tick = tickPipeline(state, { frameId: 1, capturedAtMs: T0 }, obs(T0), T0);
    const done = settleTask(tick.state, tick.tasks[0]!, 'success', T0 + 5);
    const view = describePipeline(done.state);
    expect(view.degraded).toBe(false);
    expect(view.processors[0]?.successRatio).toBe(1);
  });
});
