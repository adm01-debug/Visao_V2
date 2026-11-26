/**
 * Onda Shinobi 6 — Máscaras de movimento.
 *
 * O frame enviado para `analyze-image` é o que gera detecções, contagem de
 * pessoas e alertas no app. Para que as máscaras tenham efeito real, elas são
 * pintadas sobre o quadro ANTES do envio: a área mascarada chega preta à IA e
 * não produz detecção nenhuma. Semântica idêntica à da função de banco
 * `point_triggers_motion`: `exclude` prevalece e, quando existe ao menos um
 * `include`, só o interior dele é analisado.
 *
 * As coordenadas das máscaras são normalizadas (0..1) — ver `useMotionMasks` —,
 * então a redação independe da resolução do stream.
 *
 * O canvas é hoje a única autoridade sobre a regra: um polígono com arestas
 * cruzadas é preenchido pela regra de voltas do canvas, exatamente como o
 * editor de máscaras desenha na tela.
 */
import type { MaskPolygon } from '@/hooks/useMotionMasks';

// eslint-disable-next-line visao/no-hardcoded-colors -- Canvas 2D exige string CSS; o preto é redação de quadro, não cor de tema.
const REDACTION_FILL = '#000000';

export interface FrameMaskSource {
  mode: 'include' | 'exclude';
  polygon: MaskPolygon;
  enabled: boolean;
}

export interface FrameMaskPlan {
  includePolygons: MaskPolygon[];
  excludePolygons: MaskPolygon[];
}

function isUsablePolygon(polygon: MaskPolygon | undefined | null): polygon is MaskPolygon {
  return Array.isArray(polygon) && polygon.length >= 3;
}

/** Separa as máscaras habilitadas por semântica, descartando polígonos incompletos. */
export function buildFrameMaskPlan(masks: readonly FrameMaskSource[]): FrameMaskPlan {
  const usable = masks.filter((mask) => mask.enabled && isUsablePolygon(mask.polygon));
  return {
    includePolygons: usable.filter((mask) => mask.mode === 'include').map((mask) => mask.polygon),
    excludePolygons: usable.filter((mask) => mask.mode === 'exclude').map((mask) => mask.polygon),
  };
}

export function hasMaskRedaction(plan: FrameMaskPlan): boolean {
  return plan.includePolygons.length > 0 || plan.excludePolygons.length > 0;
}

/** Converte o polígono normalizado (0..1) para pixels do canvas de captura. */
export function toCanvasPoints(
  polygon: MaskPolygon,
  width: number,
  height: number
): Array<[number, number]> {
  return polygon.map(([x, y]) => [x * width, y * height] as [number, number]);
}

function tracePolygon(ctx: CanvasRenderingContext2D, points: Array<[number, number]>): void {
  const [first, ...rest] = points;
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first[0], first[1]);
  for (const [x, y] of rest) ctx.lineTo(x, y);
  ctx.closePath();
}

/**
 * Desenha o quadro já com a redação das máscaras aplicada.
 * Sem máscara habilitada o quadro é desenhado sem alteração (fail-open).
 */
export function paintFrameMask(
  ctx: CanvasRenderingContext2D,
  plan: FrameMaskPlan,
  video: CanvasImageSource,
  width: number,
  height: number
): void {
  const includes = plan.includePolygons.filter(isUsablePolygon);

  if (includes.length === 0) {
    ctx.drawImage(video, 0, 0, width, height);
  } else {
    // Com `include`, o quadro todo é redigido e só o interior dos polígonos é desenhado.
    ctx.fillStyle = REDACTION_FILL;
    ctx.fillRect(0, 0, width, height);
    for (const polygon of includes) {
      ctx.save();
      tracePolygon(ctx, toCanvasPoints(polygon, width, height));
      ctx.clip();
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();
    }
  }

  // `exclude` é sempre aplicado por último: prevalece sobre qualquer `include`.
  ctx.fillStyle = REDACTION_FILL;
  for (const polygon of plan.excludePolygons.filter(isUsablePolygon)) {
    tracePolygon(ctx, toCanvasPoints(polygon, width, height));
    ctx.fill();
  }
}
