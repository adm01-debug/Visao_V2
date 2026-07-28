/**
 * Simulação Wave 209 — retrato de frota dos pipelines de visão.
 *
 * Força bruta sobre combinações de saúde de processadores e pressão de
 * barramento, verificando as sete leis de `pipelineFleet.ts`.
 */

import {
  summarizeCamera,
  summarizeFleet,
  healthRank,
  pressureRank,
  worstHealth,
  type CameraHealth,
  type CameraPipelineInput,
  type CameraPressure,
} from '../src/lib/vision/pipelineFleet';
import type { BusView, ConsumerHealth, ConsumerView } from '../src/lib/vision/frameBus';
import type { PipelineView, ProcessorHealth, ProcessorView } from '../src/lib/vision/visionPipeline';

let assertions = 0;
let failures = 0;

function check(cond: boolean, label: string): void {
  assertions += 1;
  if (!cond) {
    failures += 1;
    if (failures <= 20) console.error(`✗ ${label}`);
  }
}

const HEALTHS: ProcessorHealth[] = ['healthy', 'degraded', 'probation', 'quarantined'];
const CONSUMER_HEALTHS: ConsumerHealth[] = ['idle', 'flowing', 'backlogged', 'starved'];

function processor(id: string, health: ProcessorHealth, succeeded: number, failed: number): ProcessorView {
  return {
    processorId: id,
    capabilities: ['track'],
    health,
    stats: { admitted: succeeded + failed, succeeded, failed, late: 0, refused: 0 },
    successRatio: succeeded + failed === 0 ? null : succeeded / (succeeded + failed),
  };
}

function consumer(id: string, health: ConsumerHealth): ConsumerView {
  return {
    consumerId: id,
    health,
    inFlight: false,
    hasPending: false,
    stats: { delivered: health === 'starved' ? 0 : 1, dropped: 0, lastDeliveredFrameId: null } as ConsumerView['stats'],
    deliveryRatio: health === 'starved' ? 0 : 1,
  };
}

function camera(
  cameraId: string,
  procs: ProcessorView[],
  consumers: ConsumerView[],
  publishedFrames: number,
): CameraPipelineInput {
  const pipeline: PipelineView = {
    cameraId,
    processors: procs,
    degraded: procs.some((p) => p.health !== 'healthy'),
  };
  const bus: BusView = { cameraId, publishedFrames, droppedOutOfOrder: 0, consumers };
  return { pipeline, bus };
}

/* ---------------------------------------------------------------- Cenário 1 */
/* F1 — pior estado governa em toda combinação de até 3 processadores.        */
for (const a of HEALTHS) {
  for (const b of HEALTHS) {
    for (const c of HEALTHS) {
      const procs = [processor('a', a, 1, 0), processor('b', b, 1, 0), processor('c', c, 1, 0)];
      const s = summarizeCamera(camera('cam', procs, [consumer('a', 'flowing')], 10));
      const expected = [a, b, c].reduce<CameraHealth>((acc, h) => worstHealth(acc, h), 'healthy');
      check(s.health === expected, `F1 pior estado ${a}/${b}/${c} => ${s.health}`);
      check(
        s.impairedCount === [a, b, c].filter((h) => h !== 'healthy').length,
        `F1 contagem de comprometidos ${a}/${b}/${c}`,
      );
    }
  }
}

/* ---------------------------------------------------------------- Cenário 2 */
/* F2 — ausência de processador nunca é saúde.                                */
for (const ch of CONSUMER_HEALTHS) {
  for (const published of [0, 1, 100]) {
    const s = summarizeCamera(camera('cam', [], [consumer('a', ch)], published));
    check(s.health === 'unknown', `F2 sem processador => unknown (${ch}/${published})`);
    check(s.health !== 'healthy', `F2 ausência jamais healthy (${ch}/${published})`);
    check(s.successRatio === null, `F3 sem desfecho => null (${ch}/${published})`);
  }
}

/* ---------------------------------------------------------------- Cenário 3 */
/* F3 — confiabilidade sem desfecho é desconhecida, nunca 100%.               */
for (let succ = 0; succ <= 20; succ += 1) {
  for (let fail = 0; fail <= 20; fail += 1) {
    const s = summarizeCamera(
      camera('cam', [processor('a', 'healthy', succ, fail)], [consumer('a', 'flowing')], 5),
    );
    if (succ + fail === 0) {
      check(s.successRatio === null, 'F3 zero desfecho => null');
    } else {
      const expected = succ / (succ + fail);
      check(Math.abs((s.successRatio ?? -1) - expected) < 1e-9, `F3 razão ${succ}/${fail}`);
      check((s.successRatio ?? -1) <= 1, 'F3 razão nunca acima de 1');
    }
  }
}

/* ---------------------------------------------------------------- Cenário 4 */
/* F4 — pressão nunca contamina saúde, e vice-versa.                          */
for (const ph of HEALTHS) {
  for (const ch of CONSUMER_HEALTHS) {
    for (const published of [0, 7]) {
      const s = summarizeCamera(
        camera('cam', [processor('a', ph, 3, 0)], [consumer('a', ch)], published),
      );
      check(s.health === ph, `F4 pressão ${ch} não muda saúde ${ph}`);
      const expectedPressure: CameraPressure =
        ch === 'starved'
          ? 'starved'
          : ch === 'backlogged'
            ? 'backlogged'
            : ch === 'flowing'
              ? 'calm'
              : published > 0
                ? 'calm'
                : 'unknown';
      check(s.pressure === expectedPressure, `F7 pressão ${ch}/${published} => ${s.pressure}`);
    }
  }
}

/* ---------------------------------------------------------------- Cenário 5 */
/* F5/F6 — contabilidade fechada e ordenação determinística em frotas.        */
function pseudoRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

for (let seed = 1; seed <= 400; seed += 1) {
  const rnd = pseudoRandom(seed);
  const size = Math.floor(rnd() * 12);
  const inputs: CameraPipelineInput[] = [];
  for (let i = 0; i < size; i += 1) {
    const procCount = Math.floor(rnd() * 3);
    const procs = Array.from({ length: procCount }, (_, k) =>
      processor(`p${k}`, HEALTHS[Math.floor(rnd() * HEALTHS.length)]!, Math.floor(rnd() * 5), Math.floor(rnd() * 3)),
    );
    const consumers = [consumer('p0', CONSUMER_HEALTHS[Math.floor(rnd() * CONSUMER_HEALTHS.length)]!)];
    inputs.push(camera(`cam-${String(i).padStart(2, '0')}`, procs, consumers, Math.floor(rnd() * 20)));
  }

  const view = summarizeFleet(inputs);
  const bucketSum =
    view.buckets.healthy +
    view.buckets.unknown +
    view.buckets.degraded +
    view.buckets.probation +
    view.buckets.quarantined;
  check(bucketSum === view.total, `F5 baldes fecham (seed ${seed})`);
  check(view.total === inputs.length, `F5 total = entradas (seed ${seed})`);
  check(view.cameras.length === inputs.length, `F5 nenhuma câmera some (seed ${seed})`);

  for (let i = 1; i < view.cameras.length; i += 1) {
    const prev = view.cameras[i - 1]!;
    const cur = view.cameras[i]!;
    const ok =
      healthRank(prev.health) > healthRank(cur.health) ||
      (healthRank(prev.health) === healthRank(cur.health) &&
        (pressureRank(prev.pressure) > pressureRank(cur.pressure) ||
          (pressureRank(prev.pressure) === pressureRank(cur.pressure) &&
            prev.cameraId <= cur.cameraId)));
    check(ok, `F6 ordem determinística (seed ${seed}, pos ${i})`);
  }

  /* Idempotência da ordenação: rodar de novo com entrada embaralhada dá igual. */
  const shuffled = [...inputs].reverse();
  const again = summarizeFleet(shuffled);
  check(
    again.cameras.map((c) => c.cameraId).join('|') === view.cameras.map((c) => c.cameraId).join('|'),
    `F6 ordem estável sob permutação (seed ${seed})`,
  );

  /* F1 na frota: worstHealth é o máximo real das câmeras. */
  const expectedWorst = view.cameras.reduce<CameraHealth>(
    (acc, c) => worstHealth(acc, c.health),
    view.cameras.length === 0 ? 'unknown' : 'healthy',
  );
  check(view.worstHealth === expectedWorst, `F1 frota (seed ${seed})`);

  /* Acionáveis: nunca menor que o número de câmeras não saudáveis. */
  const unhealthy = view.cameras.filter((c) => c.health !== 'healthy').length;
  check(view.actionableCount >= unhealthy, `Acionáveis cobrem os não saudáveis (seed ${seed})`);
  check(view.actionableCount <= view.total, `Acionáveis nunca excedem o total (seed ${seed})`);
  if (view.actionableCount === 0) {
    check(view.worstHealth === 'healthy' || view.total === 0, `Zero acionável => frota sã (seed ${seed})`);
  }
}

/* ---------------------------------------------------------------- Cenário 6 */
/* Frota vazia é honesta.                                                     */
{
  const empty = summarizeFleet([]);
  check(empty.total === 0, 'Frota vazia total 0');
  check(empty.worstHealth === 'unknown', 'Frota vazia nunca é saudável');
  check(empty.actionableCount === 0, 'Frota vazia sem acionáveis');
  check(empty.headline === 'Nenhuma câmera observada', 'Frota vazia com frase honesta');
}

/* ---------------------------------------------------------------- Cenário 7 */
/* Monotonicidade: piorar uma câmera nunca melhora o retrato da frota.        */
for (let i = 0; i < HEALTHS.length; i += 1) {
  for (let j = i; j < HEALTHS.length; j += 1) {
    const base = summarizeFleet([
      camera('cam-a', [processor('a', HEALTHS[i]!, 1, 0)], [consumer('a', 'flowing')], 3),
      camera('cam-b', [processor('b', 'healthy', 1, 0)], [consumer('b', 'flowing')], 3),
    ]);
    const worse = summarizeFleet([
      camera('cam-a', [processor('a', HEALTHS[j]!, 1, 0)], [consumer('a', 'flowing')], 3),
      camera('cam-b', [processor('b', 'healthy', 1, 0)], [consumer('b', 'flowing')], 3),
    ]);
    check(
      healthRank(worse.worstHealth) >= healthRank(base.worstHealth),
      `Monotonicidade ${HEALTHS[i]} -> ${HEALTHS[j]}`,
    );
    check(
      worse.actionableCount >= base.actionableCount,
      `Monotonicidade acionáveis ${HEALTHS[i]} -> ${HEALTHS[j]}`,
    );
  }
}

console.log(`\nWave 209: ${assertions} asserções, ${failures} falha(s).`);
if (failures > 0) process.exit(1);
