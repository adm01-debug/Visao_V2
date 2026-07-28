/**
 * Onda 213 — Simulação do contrato de entrada/saída do `VisionProcessor`.
 *
 * O envelope só vale se sobreviver a processadores mal-educados: laudo de outro
 * frame, confiança `NaN`, rastreador que tenta identificar, LLM que se declara
 * sensor, laudo vencido, id duplicado, objeto nulo, promessa rejeitada.
 *
 * Rodar: npm run simulate:wave213
 */

import {
  adaptProcessor,
  auditOutput,
  buildProcessorInput,
  normalizeProcessorOutput,
  ProcessorContractError,
  DETECTION_REJECTIONS,
  type NormalizedOutput,
  type ProcessorInput,
  type RawDetection,
  type RawProcessorOutput,
} from '../src/lib/vision/processorContract';
import { PROVENANCE_WEIGHT } from '../src/lib/provenance/readingProvenance';
import type { PipelineTask, ProcessorCapability } from '../src/lib/vision/visionPipeline';

let assertions = 0;
const failures: string[] = [];

function check(label: string, condition: boolean): void {
  assertions += 1;
  if (!condition) failures.push(label);
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CAPABILITIES: readonly ProcessorCapability[] = ['track', 'identify'];

const PROVENANCE_POOL: readonly (readonly string[])[] = [
  [],
  ['human'],
  ['sensor'],
  ['model'],
  ['llm'],
  ['sensor', 'llm'],
  ['human', 'model'],
  ['MODEL'],
  ['telepatia'],
  ['sensor', 'telepatia'],
];

const CONFIDENCE_POOL: readonly unknown[] = [
  0, 0.25, 0.5, 0.749, 0.75, 0.9, 0.95, 1, -0.01, 1.01, Number.NaN, Infinity, '0.9', null, undefined,
];

function task(kind: ProcessorCapability, frameId: number): PipelineTask {
  return {
    processorId: 'proc-1',
    kind,
    frameId,
    capturedAtMs: 10_000,
    trackId: kind === 'identify' ? 'trk-1' : null,
  };
}

function detectionFrom(random: () => number, index: number): unknown {
  const roll = random();
  if (roll < 0.06) return null;
  if (roll < 0.1) return { kind: 'face', confidence: 0.9 }; // sem id
  if (roll < 0.14) return { id: `det-${index}`, confidence: 0.9 }; // sem kind

  const detection: Record<string, unknown> = {
    id: random() < 0.12 ? 'det-dup' : `det-${index}`,
    kind: random() < 0.5 ? 'face' : 'plate',
    label: random() < 0.5 ? `L${index}` : null,
    confidence: CONFIDENCE_POOL[Math.floor(random() * CONFIDENCE_POOL.length)],
    provenance: PROVENANCE_POOL[Math.floor(random() * PROVENANCE_POOL.length)],
    identifies: random() < 0.5,
  };

  const boxRoll = random();
  if (boxRoll < 0.25) detection.box = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 };
  else if (boxRoll < 0.35) detection.box = { x: 0.9, y: 0.9, w: 0.5, h: 0.5 }; // estoura
  else if (boxRoll < 0.4) detection.box = { x: 0, y: 0, w: 0, h: 0.2 }; // degenerada
  else if (boxRoll < 0.45) detection.box = { x: Number.NaN, y: 0, w: 0.1, h: 0.1 };

  return detection;
}

function outputFrom(random: () => number, input: ProcessorInput): unknown {
  const roll = random();
  if (roll < 0.04) return null;
  if (roll < 0.07) return 'concluído';
  if (roll < 0.1) return { status: 'talvez', frameId: input.frameId, producedAtMs: input.startedAtMs + 5 };
  if (roll < 0.13) return { status: 'ok', frameId: input.frameId }; // sem carimbo

  const count = Math.floor(random() * 5);
  const detections: unknown[] = [];
  for (let i = 0; i < count; i += 1) detections.push(detectionFrom(random, i));

  const late = random() < 0.2;
  const foreign = random() < 0.15;
  const statusRoll = random();

  return {
    status: statusRoll < 0.1 ? 'failed' : statusRoll < 0.25 ? 'no_result' : 'ok',
    frameId: foreign ? input.frameId + 1 : input.frameId,
    detections,
    reason: statusRoll < 0.1 ? 'modelo indisponível' : undefined,
    modelId: random() < 0.7 ? 'arcface-v3' : undefined,
    producedAtMs: input.startedAtMs + (late ? 60_000 : Math.floor(random() * 50)),
  };
}

/** Todas as leis verificadas sobre um laudo normalizado. */
function assertLaws(input: ProcessorInput, raw: unknown, output: NormalizedOutput): void {
  /* C9 — autoteste do envelope. */
  check('C9 auditoria limpa', auditOutput(output).length === 0);

  /* C10 — determinismo: normalizar duas vezes dá o mesmo laudo. */
  check(
    'C10 determinismo',
    JSON.stringify(normalizeProcessorOutput(input, raw)) === JSON.stringify(output),
  );

  /* C1 — o envelope nunca troca de frame nem de modo. */
  check('C1 frame do envelope', output.frameId === input.frameId);
  check('C1 modo do envelope', output.capability === input.capability);

  /* C4 — saudável se e somente se não houve rejeição de laudo. */
  check('C4 saúde = ausência de rejeição', output.healthy === (output.rejection === null));

  /* C9 — soma dos baldes fecha com a lista. */
  const bucketSum = DETECTION_REJECTIONS.reduce(
    (acc, bucket) => acc + output.rejectionCounts[bucket],
    0,
  );
  check('C9 baldes somam', bucketSum === output.rejectedDetections.length);

  for (const detection of output.detections) {
    /* C5 — nenhuma confiança inválida sobrevive. */
    check(
      'C5 confiança válida',
      Number.isFinite(detection.confidence) &&
        detection.confidence >= 0 &&
        detection.confidence <= 1,
    );
    /* C6 — rastreio nunca entrega identificação. */
    check(
      'C6 capacidade respeitada',
      !detection.identifies || input.capability === 'identify',
    );
    /* C7 — origem fraca jamais afirma. */
    if (PROVENANCE_WEIGHT[detection.provenance] <= PROVENANCE_WEIGHT.llm) {
      check('C7 origem fraca é investigativa', detection.standing === 'investigative');
    }
    check(
      'C7 modelo nunca confirma sozinho',
      detection.provenance !== 'model' || detection.standing !== 'confirmed',
    );
    /* C7 — origem não declarada nunca vira `model`. */
    /* Só comparamos com a origem quando o id é único no laudo: com id repetido
     * a busca por id acharia a cópia rejeitada, não a aceita. */
    const stages = (raw as { detections?: readonly RawDetection[] })?.detections;
    if (Array.isArray(stages)) {
      const matches = stages.filter((d) => d?.id === detection.id);
      if (matches.length === 1 && (matches[0]!.provenance ?? []).length === 0) {
        check('C7 ausência é unknown', detection.provenance === 'unknown');
      }
    }
  }

  /* C3/C8 — laudo estrangeiro ou vencido nunca entrega detecção aceita. */
  if (output.rejection === 'foreign_frame' || output.rejection === 'timed_out') {
    check('C3/C8 nada aproveitado', output.detections.length === 0);
  }
  /* C8 — vencido contabiliza toda detecção perdida. */
  if (output.rejection === 'timed_out') {
    check(
      'C8 perdas contabilizadas',
      output.rejectionCounts.expired === output.claimedDetections,
    );
  }

  /* Duração nunca negativa. */
  check('duração ≥ 0', output.durationMs >= 0);
}

async function main(): Promise<void> {
  let scenarios = 0;

  /* ---------------- Bateria aleatória sobre laudos hostis ---------------- */
  for (let seed = 1; seed <= 12_000; seed += 1) {
    const random = rng(9_001 + seed * 7);
    const capability = CAPABILITIES[seed % CAPABILITIES.length]!;
    const input = buildProcessorInput('cam-1', task(capability, 42), 20_000);
    const raw = outputFrom(random, input);
    scenarios += 1;

    const output = normalizeProcessorOutput(input, raw);
    assertLaws(input, raw, output);
  }

  /* ---------------- Casos-limite nomeados ---------------- */
  {
    const input = buildProcessorInput('cam-1', task('identify', 7), 1_000);

    /* C2 — laudo indefinido. */
    const undef = normalizeProcessorOutput(input, undefined);
    check('C2 indefinido é rejeitado', undef.rejection === 'malformed_output');
    check('C2 indefinido não é saudável', !undef.healthy);

    /* C3 — laudo perfeito, frame errado. */
    const foreign = normalizeProcessorOutput(input, {
      status: 'ok',
      frameId: 8,
      producedAtMs: 1_010,
      detections: [{ id: 'a', kind: 'face', confidence: 1, provenance: ['human'] }],
    } satisfies RawProcessorOutput);
    check('C3 frame estrangeiro', foreign.rejection === 'foreign_frame');
    check('C3 sem detecção aceita', foreign.detections.length === 0);

    /* C4 — vazio é saudável. */
    const empty = normalizeProcessorOutput(input, {
      status: 'no_result',
      frameId: 7,
      producedAtMs: 1_010,
    } satisfies RawProcessorOutput);
    check('C4 vazio é veredito empty', empty.verdict === 'empty');
    check('C4 vazio é saudável', empty.healthy);

    /* C5/C7 — confiança máxima não promove um LLM. */
    const llm = normalizeProcessorOutput(input, {
      status: 'ok',
      frameId: 7,
      producedAtMs: 1_010,
      detections: [
        { id: 'a', kind: 'plate', label: 'ABC1D23', confidence: 1, provenance: ['llm'] },
      ],
    } satisfies RawProcessorOutput);
    check('C7 LLM é investigativo', llm.detections[0]?.standing === 'investigative');

    /* C7 — elo mais fraco: sensor parafraseado por LLM é LLM. */
    const paraphrase = normalizeProcessorOutput(input, {
      status: 'ok',
      frameId: 7,
      producedAtMs: 1_010,
      detections: [
        { id: 'a', kind: 'plate', confidence: 0.99, provenance: ['sensor', 'llm'] },
      ],
    } satisfies RawProcessorOutput);
    check('C7 elo mais fraco governa', paraphrase.detections[0]?.provenance === 'llm');

    /* C6 — rastreio tentando identificar. */
    const trackInput = buildProcessorInput('cam-1', task('track', 7), 1_000);
    const overreach = normalizeProcessorOutput(trackInput, {
      status: 'ok',
      frameId: 7,
      producedAtMs: 1_010,
      detections: [
        { id: 'a', kind: 'face', confidence: 0.9, provenance: ['model'], identifies: true },
      ],
    } satisfies RawProcessorOutput);
    check('C6 excesso rejeitado', overreach.rejectionCounts.capability_overreach === 1);
    check('C6 laudo segue saudável', overreach.healthy);

    /* C9 — id duplicado derruba a segunda cópia, não mescla. */
    const dup = normalizeProcessorOutput(input, {
      status: 'ok',
      frameId: 7,
      producedAtMs: 1_010,
      detections: [
        { id: 'a', kind: 'face', confidence: 0.8, provenance: ['model'] },
        { id: 'a', kind: 'face', confidence: 0.2, provenance: ['model'] },
      ],
    } satisfies RawProcessorOutput);
    check('C9 duplicata rejeitada', dup.rejectionCounts.duplicate_id === 1);
    check('C9 primeira cópia mantida', dup.detections[0]?.confidence === 0.8);
    scenarios += 7;
  }

  /* ---------------- Ponte com o ciclo ---------------- */
  {
    let now = 5_000;
    const clock = () => {
      const value = now;
      now += 10;
      return value;
    };
    const received: NormalizedOutput[] = [];
    const sink = (output: NormalizedOutput) => received.push(output);

    /* Processador que explode: vira erro de contrato, com laudo no sink. */
    const boom = adaptProcessor(
      () => {
        throw new Error('cuda oom');
      },
      { cameraId: 'cam-1', clock, sink },
    );
    let threw = false;
    try {
      await boom(task('identify', 1));
    } catch (error) {
      threw = true;
      check('ponte lança erro de contrato', error instanceof ProcessorContractError);
      check(
        'ponte preserva motivo',
        error instanceof ProcessorContractError && error.rejection === 'declared_failure',
      );
    }
    check('ponte não engole exceção', threw);
    check('sink recebeu laudo da falha', received.length === 1);
    check('motivo preservado no laudo', received[0]?.reason === 'cuda oom');

    /* Processador vazio: não lança (C4). */
    const quiet = adaptProcessor(
      (input) => ({
        status: 'no_result' as const,
        frameId: input.frameId,
        producedAtMs: input.startedAtMs + 1,
      }),
      { cameraId: 'cam-1', clock, sink },
    );
    let quietThrew = false;
    try {
      await quiet(task('track', 2));
    } catch {
      quietThrew = true;
    }
    check('C4 vazio não lança', !quietThrew);
    check('sink recebeu laudo vazio', received[1]?.verdict === 'empty');

    /* Processador lento: estoura o prazo e vira falha. */
    const slow = adaptProcessor(
      (input) => ({
        status: 'ok' as const,
        frameId: input.frameId,
        producedAtMs: input.deadlineMs + 1,
        detections: [{ id: 'a', kind: 'face', confidence: 0.9, provenance: ['model'] }],
      }),
      { cameraId: 'cam-1', clock, sink },
    );
    let slowThrew = false;
    try {
      await slow(task('identify', 3));
    } catch (error) {
      slowThrew = true;
      check(
        'C8 prazo vira timed_out',
        error instanceof ProcessorContractError && error.rejection === 'timed_out',
      );
    }
    check('C8 laudo vencido lança', slowThrew);
    check('C8 nada aceito do vencido', received[2]?.detections.length === 0);
    scenarios += 3;
  }

  if (failures.length > 0) {
    const unique = [...new Set(failures)];
    console.error(`❌ Onda 213 — ${failures.length} violações (${unique.length} distintas):`);
    for (const violation of unique.slice(0, 20)) console.error(`   • ${violation}`);
    process.exit(1);
  }

  console.log(
    `✅ Onda 213 — contrato VisionProcessor: ${assertions.toLocaleString('pt-BR')} asserções em ${scenarios} cenários`,
  );
}

void main();
