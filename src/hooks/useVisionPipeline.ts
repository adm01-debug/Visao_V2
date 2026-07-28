/**
 * Onda 210 — Ligação do contrato de visão ao ciclo de vida do React.
 *
 * A lógica de decisão vive em módulos puros (Ondas 206-209). Este hook não
 * decide nada: ele apenas guarda o estado entre renders, encaminha chamadas e
 * publica um retrato estável para a UI.
 *
 * DECISÕES
 *  H1 — O estado do pipeline mora em `useRef`, não em `useState`: um frame por
 *       instante não pode disparar um render por frame. O render só acontece
 *       quando o *retrato* muda (assinatura textual comparada).
 *  H2 — `tick` e `settle` são estáveis (`useCallback` sem dependências
 *       mutáveis), para que efeitos do chamador não reassinem a cada frame.
 *  H3 — Reregistrar processadores preserva contadores e saúde: a troca de props
 *       nunca zera a quarentena de um processador problemático.
 *  H4 — Desmontar não apaga nada além do próprio ref; nenhum efeito colateral
 *       global é criado aqui.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { describeBus, type BusView } from '@/lib/vision/frameBus';
import {
  DEFAULT_CADENCE,
  type CadenceConfig,
  type FrameObservation,
} from '@/lib/vision/inferenceCadence';
import {
  createPipeline,
  describePipeline,
  registerProcessor,
  settleTask,
  tickPipeline,
  type PipelineState,
  type PipelineTask,
  type PipelineTick,
  type PipelineView,
  type SettleResult,
  type TaskOutcome,
  type VisionProcessor,
} from '@/lib/vision/visionPipeline';

export interface UseVisionPipelineOptions {
  readonly cameraId: string;
  readonly processors: readonly VisionProcessor[];
  readonly config?: CadenceConfig;
}

export interface UseVisionPipelineResult {
  /** Publica um frame e devolve as tarefas admitidas neste instante. */
  readonly tick: (frame: FrameObservation) => PipelineTick;
  /** Registra o desfecho de uma tarefa executada. */
  readonly settle: (task: PipelineTask, outcome: TaskOutcome, nowMs: number) => SettleResult;
  /** Retrato estável para a UI; só muda quando algo relevante muda. */
  readonly view: PipelineView;
  readonly busView: BusView;
}

/** Assinatura barata do retrato — evita render por frame (H1). */
function signature(view: PipelineView, bus: BusView): string {
  const procs = view.processors
    .map((p) => `${p.processorId}:${p.health}:${p.stats.succeeded}:${p.stats.failed}:${p.stats.refused}`)
    .join(',');
  const cons = bus.consumers.map((c) => `${c.consumerId}:${c.health}`).join(',');
  return `${view.cameraId}|${procs}|${cons}|${bus.publishedFrames}|${bus.droppedOutOfOrder}`;
}

export function useVisionPipeline(options: UseVisionPipelineOptions): UseVisionPipelineResult {
  const { cameraId, processors, config = DEFAULT_CADENCE } = options;

  const stateRef = useRef<PipelineState>(createPipeline(cameraId, config));
  const [, forceRender] = useState(0);
  const signatureRef = useRef<string>('');

  /* Recria o pipeline apenas quando a câmera muda: trocar de câmera é trocar de
   * assunto, e o histórico da anterior não se aplica. */
  useEffect(() => {
    stateRef.current = createPipeline(cameraId, config);
    signatureRef.current = '';
    forceRender((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  /* H3 — registro idempotente: reaplicar a mesma lista preserva estatísticas. */
  const processorKey = processors
    .map((p) => `${p.id}:${p.capabilities.join('+')}:${p.minIntervalMs}:${p.maxFrameAgeMs}`)
    .join('|');

  useEffect(() => {
    let next = stateRef.current;
    for (const p of processors) next = registerProcessor(next, p);
    stateRef.current = next;
    publishIfChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processorKey, cameraId]);

  const publishIfChanged = useCallback(() => {
    const view = describePipeline(stateRef.current);
    const bus = describeBus(stateRef.current.bus);
    const sig = signature(view, bus);
    if (sig !== signatureRef.current) {
      signatureRef.current = sig;
      forceRender((n) => n + 1);
    }
  }, []);

  const tick = useCallback(
    (frame: FrameObservation): PipelineTick => {
      const result = tickPipeline(stateRef.current, frame);
      stateRef.current = result.state;
      publishIfChanged();
      return result;
    },
    [publishIfChanged],
  );

  const settle = useCallback(
    (task: PipelineTask, outcome: TaskOutcome, nowMs: number): SettleResult => {
      const result = settleTask(stateRef.current, task, outcome, nowMs);
      stateRef.current = result.state;
      publishIfChanged();
      return result;
    },
    [publishIfChanged],
  );

  const view = useMemo(
    () => describePipeline(stateRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signatureRef.current],
  );
  const busView = useMemo(
    () => describeBus(stateRef.current.bus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signatureRef.current],
  );

  return { tick, settle, view, busView };
}
