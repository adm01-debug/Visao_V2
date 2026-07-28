/**
 * Onda 206 — Simulação exaustiva do gate de custo da inferência.
 *
 * Prova, por força bruta sobre trajetórias longas e produto cartesiano de
 * configurações:
 *
 *  S1. Identificar implica rastrear — todo `identify` grava `lastTrackAtMs`.
 *  S2. Piso de cadência — jamais dois rastreios a menos de `trackIntervalMs`.
 *  S3. Piso de identificação — jamais duas identificações da MESMA trilha a
 *      menos de `identifyIntervalMs` (salvo a primeira, que não tem anterior).
 *  S4. Orçamento — identificações em qualquer janela deslizante nunca excedem
 *      o teto.
 *  S5. Concorrência — em voo nunca ultrapassa `maxConcurrentIdentify`.
 *  S6. O barato nunca é sacrificado — sempre que houver atividade, frame fresco
 *      e cadência vencida, a decisão é `track` ou `identify`, nunca `skip`.
 *  S7. Anti-retrocesso — relógio recuando nunca produz execução que o relógio
 *      monotônico não produziria.
 *  S8. Pureza — `decideCadence` não muta o estado e é determinística.
 */

import {
  DEFAULT_CADENCE,
  commitDecision,
  createCadenceState,
  decideCadence,
  releaseIdentify,
  type CadenceConfig,
  type CadenceState,
  type FrameObservation,
} from '../src/lib/vision/inferenceCadence';

let assertions = 0;
const failures: string[] = [];
function check(label: string, ok: boolean): void {
  assertions += 1;
  if (!ok) failures.push(label);
}

/* -- Gerador determinístico ------------------------------------------------ */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CONFIGS: CadenceConfig[] = [];
for (const trackIntervalMs of [100, 300]) {
  for (const identifyIntervalMs of [500, 2_000]) {
    for (const identifyBudget of [1, 3, 30]) {
      for (const maxConcurrentIdentify of [1, 2]) {
        for (const budgetWindowMs of [2_000, 60_000]) {
          CONFIGS.push({
            ...DEFAULT_CADENCE,
            trackIntervalMs,
            identifyIntervalMs,
            identifyBudget,
            budgetWindowMs,
            maxConcurrentIdentify,
          });
        }
      }
    }
  }
}

const TRACKS = ['t1', 't2', 't3'];

interface Executed {
  readonly action: 'track' | 'identify';
  readonly at: number;
  readonly trackId: string | null;
}

function runTrajectory(
  config: CadenceConfig,
  seed: number,
  steps: number,
  jitterClock: boolean,
): Executed[] {
  const rnd = mulberry32(seed);
  let state = createCadenceState();
  let clock = 1_000;
  const log: Executed[] = [];
  const everIdentified = new Set<string>();

  for (let i = 0; i < steps; i += 1) {
    clock += Math.floor(rnd() * 400);
    const now = jitterClock && rnd() < 0.15 ? clock - Math.floor(rnd() * 900) : clock;
    const trackId = rnd() < 0.2 ? null : TRACKS[Math.floor(rnd() * TRACKS.length)];
    const frame: FrameObservation = {
      capturedAtMs: now - Math.floor(rnd() * 1_200),
      hasActivity: rnd() > 0.1,
      trackId,
      trackEverIdentified: trackId !== null && everIdentified.has(trackId),
    };

    const before: CadenceState = JSON.parse(JSON.stringify(state));
    const decision = decideCadence(state, frame, now, config);
    const again = decideCadence(state, frame, now, config);

    /* S8 — pureza e determinismo. */
    check(
      `pureza seed=${seed} i=${i}`,
      JSON.stringify(before) === JSON.stringify(state),
    );
    check(
      `determinismo seed=${seed} i=${i}`,
      JSON.stringify(decision) === JSON.stringify(again),
    );

    const effNow = Math.max(now, state.clockFloorMs);
    const fresh = effNow - frame.capturedAtMs <= config.maxFrameAgeMs;
    const trackDue =
      state.lastTrackAtMs === null ||
      effNow - state.lastTrackAtMs >= config.trackIntervalMs;

    /* S6 — o barato nunca é sacrificado. */
    if (fresh && frame.hasActivity && trackDue) {
      check(
        `barato preservado seed=${seed} i=${i} (${decision.action}/${decision.reason})`,
        decision.action !== 'skip',
      );
    } else {
      check(
        `sem execução indevida seed=${seed} i=${i}`,
        decision.action === 'skip',
      );
    }

    /* S7 — anti-retrocesso. */
    check(
      `relógio monotônico seed=${seed} i=${i}`,
      decision.effectiveNowMs >= state.clockFloorMs,
    );

    state = commitDecision(state, decision, config);

    if (decision.action !== 'skip') {
      /* S1 */
      check(
        `identify implica track seed=${seed} i=${i}`,
        state.lastTrackAtMs === decision.effectiveNowMs,
      );
      log.push({
        action: decision.action,
        at: decision.effectiveNowMs,
        trackId: decision.trackId,
      });
      if (decision.action === 'identify' && decision.trackId) {
        everIdentified.add(decision.trackId);
      }
    }

    /* S5 — concorrência. */
    check(
      `concorrência seed=${seed} i=${i}`,
      state.inFlightIdentify <= config.maxConcurrentIdentify,
    );

    /* Devolução aleatória de slots em voo. */
    if (state.inFlightIdentify > 0 && rnd() < 0.6) {
      state = releaseIdentify(state);
    }
  }

  return log;
}

for (const config of CONFIGS) {
  for (let seed = 1; seed <= 6; seed += 1) {
    for (const jitter of [false, true]) {
      const log = runTrajectory(config, seed * 7 + (jitter ? 1 : 0), 120, jitter);

      /* S2 — piso do rastreio. */
      let prevTrack: number | null = null;
      for (const entry of log) {
        if (prevTrack !== null) {
          check(
            `S2 piso rastreio cfg=${config.trackIntervalMs}/${config.identifyBudget} seed=${seed}`,
            entry.at - prevTrack >= config.trackIntervalMs,
          );
        }
        prevTrack = entry.at;
      }

      /* S3 — piso da identificação por trilha. */
      const lastByTrack = new Map<string, number>();
      for (const entry of log) {
        if (entry.action !== 'identify' || !entry.trackId) continue;
        const prev = lastByTrack.get(entry.trackId);
        if (prev !== undefined) {
          check(
            `S3 piso identificação seed=${seed} track=${entry.trackId}`,
            entry.at - prev >= config.identifyIntervalMs,
          );
        }
        lastByTrack.set(entry.trackId, entry.at);
      }

      /* S4 — orçamento em qualquer janela deslizante. */
      const ids = log.filter((e) => e.action === 'identify').map((e) => e.at);
      for (let i = 0; i < ids.length; i += 1) {
        const windowStart = ids[i];
        const inWindow = ids.filter(
          (at) => at >= windowStart && at - windowStart < config.budgetWindowMs,
        ).length;
        check(
          `S4 orçamento cfg=${config.identifyBudget}/${config.budgetWindowMs} seed=${seed}`,
          inWindow <= config.identifyBudget,
        );
      }
    }
  }
}

/* -- Exaustão de decisão isolada ------------------------------------------ */

const AGES = [0, 300, 900, 901, 5_000];
const SINCE_TRACK = [0, 99, 100, 299, 300, 5_000];
const SINCE_IDENTIFY = [undefined, 0, 499, 500, 1_999, 2_000, 10_000];

for (const config of CONFIGS.slice(0, 8)) {
  for (const age of AGES) {
    for (const sinceTrack of SINCE_TRACK) {
      for (const sinceIdentify of SINCE_IDENTIFY) {
        for (const activity of [true, false]) {
          const now = 1_000_000;
          const state: CadenceState = {
            lastTrackAtMs: now - sinceTrack,
            lastIdentifyAtMsByTrack:
              sinceIdentify === undefined ? {} : { t1: now - sinceIdentify },
            recentIdentifyAtMs:
              sinceIdentify === undefined ? [] : [now - sinceIdentify],
            inFlightIdentify: 0,
            clockFloorMs: now - sinceTrack,
          };
          const decision = decideCadence(
            state,
            {
              capturedAtMs: now - age,
              hasActivity: activity,
              trackId: 't1',
              trackEverIdentified: sinceIdentify !== undefined,
            },
            now,
            config,
          );

          if (decision.action === 'identify') {
            check(
              'exaustão: identify exige frame fresco',
              age <= config.maxFrameAgeMs,
            );
            check('exaustão: identify exige atividade', activity);
            check(
              'exaustão: identify exige cadência de rastreio vencida',
              sinceTrack >= config.trackIntervalMs,
            );
            check(
              'exaustão: identify respeita intervalo ou é primeira leitura',
              sinceIdentify === undefined ||
                sinceIdentify >= config.identifyIntervalMs,
            );
          }
          if (decision.action === 'track') {
            check(
              'exaustão: track exige frame fresco e atividade',
              age <= config.maxFrameAgeMs && activity,
            );
          }
        }
      }
    }
  }
}

/* -- Relatório ------------------------------------------------------------- */

console.log(`Onda 206 — asserções: ${assertions}`);
if (failures.length > 0) {
  console.error(`FALHAS: ${failures.length}`);
  for (const f of failures.slice(0, 20)) console.error(` - ${f}`);
  process.exit(1);
}
console.log('Onda 206 — todas as invariantes do gate de custo se sustentaram.');
