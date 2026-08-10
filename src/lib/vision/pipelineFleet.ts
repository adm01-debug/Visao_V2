/**
 * Onda 209 — Retrato de frota dos pipelines de visão.
 *
 * As Ondas 206-208 selaram a decisão por câmera (cadência, barramento e
 * contrato). Falta a leitura agregada: como a operação enxerga dezenas de
 * câmeras em uma tela só sem que a média esconda o pior caso.
 *
 * Este módulo é a régua única dessa leitura. É puro, sem relógio próprio e sem
 * acesso a rede: recebe retratos (`PipelineView` + `BusView`) e devolve um
 * retrato de frota. Nenhuma tela pode recalcular saúde por conta própria.
 *
 * LEIS
 *  F1 — Pior estado governa. Nunca média, nunca maioria. Uma câmera com um
 *       processador suspenso é uma câmera suspensa.
 *  F2 — Ausência não é saúde. Câmera sem processador registrado é `unknown`,
 *       jamais `healthy`. (Espelha a lei da Onda 159.)
 *  F3 — Confiabilidade sem desfecho é desconhecida (`null`), nunca 100%.
 *  F4 — Pressão do barramento é eixo separado da saúde do processador. Frame
 *       descartado é custo, não doença: nunca rebaixa `health`.
 *  F5 — Contabilidade fechada. A soma dos baldes é exatamente o número de
 *       câmeras observadas.
 *  F6 — Ordem determinística: pior primeiro; empate resolve por `cameraId`
 *       crescente. A tela nunca embaralha entre dois renders iguais.
 *  F7 — `starved` (publicou e nunca entregou) é pressão máxima, acima de
 *       `backlogged`; `idle` sem publicação nenhuma é `unknown`, não calmo.
 */

import type { BusView, ConsumerHealth } from './frameBus';
import type { PipelineView, ProcessorHealth } from './visionPipeline';

/* ========================================================================== */
/* Saúde                                                                       */
/* ========================================================================== */

/** Saúde de uma câmera. `unknown` existe para não mentir sobre ausência (F2). */
export type CameraHealth = ProcessorHealth | 'unknown';

/** Severidade crescente. `unknown` fica acima de `healthy`: ignorância incomoda. */
const HEALTH_RANK: Readonly<Record<CameraHealth, number>> = {
  healthy: 0,
  unknown: 1,
  degraded: 2,
  probation: 3,
  quarantined: 4,
};

export function healthRank(health: CameraHealth): number {
  return HEALTH_RANK[health];
}

/** F1 — combina duas saúdes ficando sempre com a pior. */
export function worstHealth(a: CameraHealth, b: CameraHealth): CameraHealth {
  return HEALTH_RANK[b] > HEALTH_RANK[a] ? b : a;
}

/* ========================================================================== */
/* Pressão                                                                     */
/* ========================================================================== */

/** Pressão de entrega. Eixo independente da saúde (F4). */
export type CameraPressure = 'unknown' | 'calm' | 'backlogged' | 'starved';

const PRESSURE_RANK: Readonly<Record<CameraPressure, number>> = {
  calm: 0,
  unknown: 1,
  backlogged: 2,
  starved: 3,
};

export function pressureRank(pressure: CameraPressure): number {
  return PRESSURE_RANK[pressure];
}

export function worstPressure(a: CameraPressure, b: CameraPressure): CameraPressure {
  return PRESSURE_RANK[b] > PRESSURE_RANK[a] ? b : a;
}

/**
 * F7 — traduz a saúde de um consumidor do barramento em pressão. `idle` só é
 * `calm` quando houve publicação; sem publicação nenhuma nada foi observado.
 */
function consumerPressure(health: ConsumerHealth, publishedFrames: number): CameraPressure {
  switch (health) {
    case 'starved':
      return 'starved';
    case 'backlogged':
      return 'backlogged';
    case 'flowing':
      return 'calm';
    case 'idle':
      return publishedFrames > 0 ? 'calm' : 'unknown';
  }
}

/* ========================================================================== */
/* Retrato por câmera                                                          */
/* ========================================================================== */

export interface CameraPipelineInput {
  readonly pipeline: PipelineView;
  readonly bus: BusView;
}

export interface CameraPipelineSummary {
  readonly cameraId: string;
  readonly health: CameraHealth;
  readonly pressure: CameraPressure;
  readonly processorCount: number;
  /** Quantos processadores estão suspensos ou em observação. */
  readonly impairedCount: number;
  readonly publishedFrames: number;
  readonly droppedOutOfOrder: number;
  /** F3 — sucessos sobre desfechos conclusivos da câmera; `null` sem desfecho. */
  readonly successRatio: number | null;
  /** Frase curta e honesta para a tela. */
  readonly headline: string;
}

const IMPAIRED: ReadonlySet<ProcessorHealth> = new Set<ProcessorHealth>([
  'degraded',
  'probation',
  'quarantined',
]);

export function summarizeCamera(input: CameraPipelineInput): CameraPipelineSummary {
  const { pipeline, bus } = input;
  const processors = pipeline.processors;

  /* F2 — sem processador não há o que afirmar. */
  let health: CameraHealth = processors.length === 0 ? 'unknown' : 'healthy';
  let impairedCount = 0;
  let succeeded = 0;
  let settled = 0;

  for (const p of processors) {
    health = worstHealth(health, p.health);
    if (IMPAIRED.has(p.health)) impairedCount += 1;
    succeeded += p.stats.succeeded;
    settled += p.stats.succeeded + p.stats.failed;
  }

  /* F4/F7 — pressão é lida só do barramento. */
  let pressure: CameraPressure = bus.consumers.length === 0 ? 'unknown' : 'calm';
  for (const c of bus.consumers) {
    pressure = worstPressure(pressure, consumerPressure(c.health, bus.publishedFrames));
  }

  return {
    cameraId: pipeline.cameraId,
    health,
    pressure,
    processorCount: processors.length,
    impairedCount,
    publishedFrames: bus.publishedFrames,
    droppedOutOfOrder: bus.droppedOutOfOrder,
    successRatio: settled === 0 ? null : succeeded / settled,
    headline: describeCamera(health, pressure, impairedCount, processors.length),
  };
}

function describeCamera(
  health: CameraHealth,
  pressure: CameraPressure,
  impairedCount: number,
  processorCount: number
): string {
  if (health === 'unknown') return 'Sem processador registrado';
  if (health === 'quarantined') {
    return `${impairedCount} de ${processorCount} suspenso(s)`;
  }
  if (health === 'probation') return 'Retomando após suspensão';
  if (health === 'degraded') return 'Falhas recentes sem suspensão';
  if (pressure === 'starved') return 'Publicando sem entregar frames';
  if (pressure === 'backlogged') return 'Entrega em atraso';
  if (pressure === 'unknown') return 'Sem publicação observada';
  return 'Operando normalmente';
}

/* ========================================================================== */
/* Retrato da frota                                                            */
/* ========================================================================== */

export interface FleetBuckets {
  readonly healthy: number;
  readonly unknown: number;
  readonly degraded: number;
  readonly probation: number;
  readonly quarantined: number;
}

export interface FleetView {
  readonly cameras: readonly CameraPipelineSummary[];
  readonly total: number;
  readonly buckets: FleetBuckets;
  /** F1 — pior saúde de toda a frota. `unknown` quando não há câmera. */
  readonly worstHealth: CameraHealth;
  readonly worstPressure: CameraPressure;
  /** Câmeras que exigem olho humano (saúde pior que saudável ou pressão ruim). */
  readonly actionableCount: number;
  readonly headline: string;
}

export function summarizeFleet(inputs: readonly CameraPipelineInput[]): FleetView {
  const cameras = inputs.map(summarizeCamera).sort(compareCameras);

  const buckets = {
    healthy: 0,
    unknown: 0,
    degraded: 0,
    probation: 0,
    quarantined: 0,
  };

  let worst: CameraHealth = 'unknown';
  let worstPress: CameraPressure = 'unknown';
  let actionableCount = 0;

  for (const c of cameras) {
    buckets[c.health] += 1;
    worst = worstHealth(worst, c.health);
    worstPress = worstPressure(worstPress, c.pressure);
    if (c.health !== 'healthy' || PRESSURE_RANK[c.pressure] >= PRESSURE_RANK.backlogged) {
      actionableCount += 1;
    }
  }

  /* Frota inteiramente saudável nunca herda o `unknown` da semente. */
  if (cameras.length > 0 && buckets.healthy === cameras.length) {
    worst = 'healthy';
  }

  return {
    cameras,
    total: cameras.length,
    buckets,
    worstHealth: cameras.length === 0 ? 'unknown' : worst,
    worstPressure: cameras.length === 0 ? 'unknown' : worstPress,
    actionableCount,
    headline: describeFleet(cameras.length, actionableCount, worst),
  };
}

function describeFleet(total: number, actionable: number, worst: CameraHealth): string {
  if (total === 0) return 'Nenhuma câmera observada';
  if (actionable === 0) return `${total} câmera(s) operando normalmente`;
  const suffix = worst === 'quarantined' ? ' — há processador suspenso' : '';
  return `${actionable} de ${total} câmera(s) exigem atenção${suffix}`;
}

/** F6 — pior primeiro; pressão desempata; `cameraId` fecha de forma estável. */
function compareCameras(a: CameraPipelineSummary, b: CameraPipelineSummary): number {
  const byHealth = HEALTH_RANK[b.health] - HEALTH_RANK[a.health];
  if (byHealth !== 0) return byHealth;
  const byPressure = PRESSURE_RANK[b.pressure] - PRESSURE_RANK[a.pressure];
  if (byPressure !== 0) return byPressure;
  return a.cameraId < b.cameraId ? -1 : a.cameraId > b.cameraId ? 1 : 0;
}
