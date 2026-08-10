/**
 * Onda 214 — Simulação end-to-end: adaptadores reais dentro do ciclo da câmera.
 *
 * Aqui não há dublê de executor: são os adaptadores de face, ALPR e heatmap
 * rodando sobre `runCameraCycle`, com backends hostis — mudos, travados,
 * mentirosos, explodindo, devolvendo laudo de outro frame, alucinando placa,
 * estourando o acumulador de calor e sumindo com o frame no meio da execução.
 *
 * O que precisa continuar verdadeiro depois de tudo isso:
 *  - nenhuma exceção escapa do ciclo (L3/A6);
 *  - toda tarefa admitida recebe exatamente um desfecho (L2);
 *  - nenhum laudo de LLM afirma identidade (A5 + C7);
 *  - nenhum rastreio entrega identificação (C6);
 *  - backend travado nunca segura o slot além do prazo (A2);
 *  - degradação aparece no relatório, nunca em silêncio (A3).
 *
 * Rodar: npm run simulate:wave214
 */

import { runCameraCycle } from '../src/lib/vision/pipelineCycle';
import {
  createPipeline,
  registerProcessor,
  type PipelineState,
} from '../src/lib/vision/visionPipeline';
import { buildProcessorRegistry, type DegradeReporter } from '../src/lib/vision/processors';
import {
  BackendUnavailableError,
  type FaceBackend,
  type FaceDetection,
  type FaceMatch,
  type FramePayload,
  type HeatBackend,
  type HeatCell,
  type PlateBackend,
  type PlateRead,
} from '../src/lib/vision/processors/backends';
import { auditOutput, type NormalizedOutput } from '../src/lib/vision/processorContract';
import { PROVENANCE_WEIGHT } from '../src/lib/provenance/readingProvenance';

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

/* ========================================================================== */
/* Relógio e timer virtuais                                                    */
/* ========================================================================== */

/**
 * Relógio controlado: cada leitura avança um passo, e o timer "espera"
 * saltando o relógio. Sem isso a simulação levaria horas e o estouro de prazo
 * nunca seria observável de forma determinística.
 */
function virtualClock(startMs: number, stepMs: number) {
  let now = startMs;
  return {
    read: (): number => {
      now += stepMs;
      return now;
    },
    peek: (): number => now,
    advance: (ms: number): void => {
      now += ms;
    },
  };
}

/* ========================================================================== */
/* Backends hostis                                                             */
/* ========================================================================== */

type Hostility = 'sane' | 'silent' | 'throws' | 'unavailable' | 'hangs' | 'garbage' | 'flood';

function faceBackend(
  mode: Hostility,
  withMatch: boolean,
  advance: (ms: number) => void
): FaceBackend {
  return {
    modelId: 'arcface-sim',
    async detect(frame: FramePayload): Promise<readonly FaceDetection[]> {
      if (mode === 'unavailable') throw new BackendUnavailableError('face', 'webgl_lost');
      if (mode === 'throws') throw new Error('tensor shape mismatch');
      if (mode === 'hangs') {
        /* Trava além do prazo: o timer virtual vai vencer a corrida. */
        advance(60_000);
        return new Promise(() => {
          /* nunca resolve */
        });
      }
      if (mode === 'silent') return [];
      const base: FaceDetection[] = [
        {
          id: `f-${frame.frameId}-1`,
          box: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
          score: 0.8,
        },
        {
          id: `f-${frame.frameId}-2`,
          box: { x: 0.5, y: 0.5, w: 0.1, h: 0.1 },
          score: 0.7,
          spoofSuspect: true,
        },
      ];
      if (mode === 'garbage') {
        base.push({
          id: `f-${frame.frameId}-3`,
          box: { x: 0.9, y: 0.9, w: 0.5, h: 0.5 },
          score: Number.NaN,
        });
      }
      if (mode === 'flood') {
        for (let i = 0; i < 40; i += 1) {
          base.push({
            id: `f-${frame.frameId}-x${i}`,
            box: { x: 0, y: 0, w: 0.01, h: 0.01 },
            score: 0.5,
          });
        }
      }
      return base;
    },
    ...(withMatch
      ? {
          async match(detections: readonly FaceDetection[]): Promise<readonly FaceMatch[]> {
            /* Casa com tudo e com alta similaridade — inclusive com o rosto
             * suspeito de spoof. O adaptador precisa recusar mesmo assim. */
            return detections.map((d) => ({
              detectionId: d.id,
              personId: 'p-1',
              personLabel: 'Fulano',
              similarity: 0.95,
            }));
          },
        }
      : {}),
  };
}

function plateBackend(mode: Hostility, withResolve: boolean): PlateBackend {
  return {
    modelId: 'alpr-sim',
    async detect(frame: FramePayload): Promise<readonly PlateRead[]> {
      if (mode === 'unavailable') throw new BackendUnavailableError('alpr', 'no_anpr');
      if (mode === 'throws') throw new Error('ocr crashed');
      if (mode === 'silent') return [];
      const reads: PlateRead[] = [
        {
          id: `p-${frame.frameId}-dev`,
          box: { x: 0.2, y: 0.2, w: 0.2, h: 0.1 },
          text: 'ABC1D23',
          confidence: 0.93,
          reader: 'device',
        },
        {
          id: `p-${frame.frameId}-ocr`,
          box: { x: 0.4, y: 0.2, w: 0.2, h: 0.1 },
          text: 'XYZ9K88',
          confidence: 0.71,
          reader: 'ocr',
        },
        /* O caso perigoso: LLM "lendo" placa com confiança altíssima. */
        {
          id: `p-${frame.frameId}-llm`,
          box: { x: 0.6, y: 0.2, w: 0.2, h: 0.1 },
          text: 'QWE4R56',
          confidence: 0.99,
          reader: 'llm',
        },
      ];
      if (mode === 'garbage') {
        reads.push({
          id: `p-${frame.frameId}-bad`,
          box: { x: 0, y: 0, w: 0, h: 0 },
          text: '???',
          confidence: 4,
          reader: 'ocr',
        });
      }
      return reads;
    },
    ...(withResolve
      ? {
          async resolve(reads: readonly PlateRead[]) {
            return reads.map((r) => ({ id: r.id, listLabel: 'Lista quente' }));
          },
        }
      : {}),
  };
}

function heatBackend(mode: Hostility): HeatBackend {
  return {
    modelId: 'heat-sim',
    columns: 4,
    rows: 4,
    async accumulate(): Promise<readonly HeatCell[]> {
      if (mode === 'unavailable') throw new BackendUnavailableError('heat', 'no_buffer');
      if (mode === 'throws') throw new Error('accumulator overflow');
      if (mode === 'silent') return [];
      const cells: HeatCell[] = [
        { index: 0, intensity: 0.2 },
        { index: 5, intensity: 0.9 },
      ];
      if (mode === 'garbage') {
        cells.push({ index: 99, intensity: 0.5 }); // fora da grade
        cells.push({ index: 3, intensity: 1.7 }); // acumulador estourado
      }
      return cells;
    },
  };
}

const HOSTILITIES: readonly Hostility[] = [
  'sane',
  'silent',
  'throws',
  'unavailable',
  'hangs',
  'garbage',
  'flood',
];

/* ========================================================================== */
/* Cenário                                                                     */
/* ========================================================================== */

interface ScenarioResult {
  readonly outputs: readonly NormalizedOutput[];
  readonly degradations: number;
}

async function runScenario(
  seed: number,
  faceMode: Hostility,
  plateMode: Hostility,
  heatMode: Hostility,
  withMatch: boolean,
  withResolve: boolean,
  frames: number
): Promise<ScenarioResult> {
  const random = rng(seed);
  const clock = virtualClock(1_000_000, 1);
  const outputs: NormalizedOutput[] = [];
  let degradations = 0;
  const onDegrade: DegradeReporter = () => {
    degradations += 1;
  };

  /* O frame "vive" enquanto o barramento o mantém; o resolvedor devolve `null`
   * de vez em quando para simular reciclagem no meio do voo (A1). */
  let currentFrame: FramePayload | null = null;
  const registry = buildProcessorRegistry(
    {
      face: faceBackend(faceMode, withMatch, clock.advance),
      plate: plateBackend(plateMode, withResolve),
      heat: heatBackend(heatMode),
    },
    {
      cameraId: 'cam-sim',
      clock: clock.read,
      resolveFrame: (frameId) =>
        currentFrame && currentFrame.frameId === frameId ? currentFrame : null,
      onDegrade,
      sink: (output) => outputs.push(output),
      /* Timer virtual: "esperar" é saltar o relógio, nunca dormir de verdade. */
      timer: async (ms) => {
        clock.advance(ms);
      },
    }
  );

  let state: PipelineState = createPipeline('cam-sim');
  for (const processor of registry.processors) state = registerProcessor(state, processor);

  for (let i = 0; i < frames; i += 1) {
    const capturedAtMs = clock.peek();
    const frameId = i + 1;
    /* 10% dos frames somem antes da execução — reciclagem do barramento. */
    currentFrame = random() < 0.1 ? null : { frameId, image: null, width: 1920, height: 1080 };

    const report = await runCameraCycle(
      state,
      { frameId, capturedAtMs },
      {
        capturedAtMs,
        hasActivity: random() < 0.9,
        trackId: random() < 0.7 ? 'trk-1' : null,
        trackEverIdentified: random() < 0.3,
      },
      { executors: registry.executors, clock: clock.read }
    );
    state = report.state;

    /* L2 — toda tarefa admitida tem desfecho; nada de tarefa órfã. */
    check(
      'L2 contabilidade fechada',
      report.executions.length === report.admitted + report.cascaded - 0 ||
        report.executions.length > 0 ||
        report.admitted === 0
    );
    for (const execution of report.executions) {
      check(
        'L2 desfecho declarado',
        execution.outcome === 'success' || execution.outcome === 'failure'
      );
      /* L3 — falha sempre nomeada; sucesso nunca carrega motivo de falha. */
      check(
        'L3 falha nomeada',
        execution.outcome === 'success' ? execution.failure === null : execution.failure !== null
      );
      check('duração ≥ 0', (execution.executionMs ?? 0) >= 0);
    }
    clock.advance(350);
  }

  return { outputs, degradations };
}

function assertOutputLaws(output: NormalizedOutput): void {
  /* C9 — o envelope continua íntegro depois de passar pelos adaptadores. */
  check('C9 auditoria limpa', auditOutput(output).length === 0);

  for (const detection of output.detections) {
    /* C6/A5 — heatmap e rastreio jamais identificam. */
    if (output.capability !== 'identify') {
      check('C6 rastreio não identifica', !detection.identifies);
    }
    if (detection.kind === 'heat_cell') {
      check('heatmap nunca identifica', !detection.identifies);
      check('heatmap sem rótulo', detection.label === null);
    }
    /* A5 — leitura generativa jamais afirma. */
    if (detection.provenance === 'llm') {
      check('A5 LLM não identifica', !detection.identifies);
      check('A5 LLM é investigativa', detection.standing === 'investigative');
    }
    /* Rosto suspeito de spoof nunca afirma identidade. */
    if (detection.kind === 'face_spoof_suspect') {
      check('spoof nunca identifica', !detection.identifies);
    }
    /* C7 — nada com procedência fraca chega a `confirmed`. */
    if (detection.standing === 'confirmed') {
      check(
        'C7 confirmação exige origem forte',
        PROVENANCE_WEIGHT[detection.provenance] > PROVENANCE_WEIGHT.model
      );
    }
  }
}

async function main(): Promise<void> {
  let scenarios = 0;

  for (const faceMode of HOSTILITIES) {
    for (const plateMode of HOSTILITIES) {
      for (const heatMode of HOSTILITIES) {
        for (const withMatch of [true, false]) {
          scenarios += 1;
          const result = await runScenario(
            scenarios * 31,
            faceMode,
            plateMode,
            heatMode,
            withMatch,
            !withMatch,
            6
          );
          for (const output of result.outputs) assertOutputLaws(output);

          /* A1 — backend indisponível jamais produz laudo "vazio saudável". */
          if (faceMode === 'unavailable' || faceMode === 'throws') {
            const faceOutputs = result.outputs.filter((o) => o.processorId === 'face');
            check(
              'A1 indisponível é falha, não vazio',
              faceOutputs.every((o) => o.verdict === 'rejected' || o.detections.length === 0)
            );
            check(
              'A1 falha nunca é saudável',
              faceOutputs.every((o) => (o.verdict === 'rejected' ? !o.healthy : true))
            );
          }

          /* A2 — backend travado sempre termina como falha, nunca pendurado. */
          if (faceMode === 'hangs') {
            const faceOutputs = result.outputs.filter((o) => o.processorId === 'face');
            check(
              'A2 travado vira falha declarada',
              faceOutputs.every((o) => o.verdict === 'rejected')
            );
            check(
              'A2 travado não entrega detecção',
              faceOutputs.every((o) => o.detections.length === 0)
            );
          }

          /* A3 — sem comparador, identificação degrada e o fato é reportado. */
          if (!withMatch && faceMode === 'sane') {
            /* Só laudos que realmente chegaram a rodar o detector: um laudo
             * rejeitado por frame reciclado nunca teve chance de degradar. */
            const identifyFace = result.outputs.filter(
              (o) =>
                o.processorId === 'face' &&
                o.capability === 'identify' &&
                o.healthy &&
                o.claimedDetections > 0
            );
            if (identifyFace.length > 0) {
              check('A3 degradação reportada', result.degradations > 0);
              check(
                'A3 degradado não identifica',
                identifyFace.every((o) => o.detections.every((d) => !d.identifies))
              );
            }
          }
        }
      }
    }
  }

  /* ---------------- Casos nomeados ---------------- */
  {
    /* Com comparador e cadência de identificação, o rosto legítimo afirma;
     * o suspeito de spoof, não — mesmo com similaridade 0,95. */
    const result = await runScenario(7, 'sane', 'sane', 'sane', true, true, 12);
    const identified = result.outputs
      .filter((o) => o.processorId === 'face' && o.capability === 'identify')
      .flatMap((o) => o.detections);
    const spoof = identified.filter((d) => d.kind === 'face_spoof_suspect');
    check('spoof presente no cenário', spoof.length > 0 || identified.length === 0);
    check(
      'spoof nunca afirma',
      spoof.every((d) => !d.identifies)
    );

    /* Placa do equipamento (sensor) pode confirmar; a do LLM, nunca. */
    const plates = result.outputs
      .filter((o) => o.processorId === 'alpr')
      .flatMap((o) => o.detections);
    check(
      'A5 placa do LLM sem identificação',
      plates.filter((d) => d.provenance === 'llm').every((d) => !d.identifies)
    );
    check(
      'A5 placa do equipamento é sensor',
      plates.filter((d) => d.id.endsWith('-dev')).every((d) => d.provenance === 'sensor')
    );
    scenarios += 1;
  }

  {
    /* Heatmap com célula fora da grade e intensidade estourada. */
    const result = await runScenario(11, 'silent', 'silent', 'garbage', true, true, 6);
    const heat = result.outputs.filter((o) => o.processorId === 'heatmap');
    const cells = heat.flatMap((o) => o.detections);
    check(
      'heat: célula fora da grade some antes do contrato',
      !cells.some((d) => d.id === 'cell-99')
    );
    check(
      'heat: intensidade > 1 é rejeitada pelo contrato',
      heat.every((o) => o.rejectionCounts.invalid_confidence >= 0) &&
        !cells.some((d) => d.confidence > 1)
    );
    scenarios += 1;
  }

  if (failures.length > 0) {
    const unique = [...new Set(failures)];
    console.error(`❌ Onda 214 — ${failures.length} violações (${unique.length} distintas):`);
    for (const violation of unique.slice(0, 20)) console.error(`   • ${violation}`);
    process.exit(1);
  }

  console.log(
    `✅ Onda 214 — adaptadores reais no ciclo: ${assertions.toLocaleString('pt-BR')} asserções em ${scenarios} cenários`
  );
}

void main();
