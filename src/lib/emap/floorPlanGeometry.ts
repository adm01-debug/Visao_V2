/**
 * Onda 161 — E-Map (planta baixa): regra única de geometria e agregação.
 *
 * Por que este módulo existe separado da UI:
 * um mapa de situação é lido sob pressão, muitas vezes durante um incidente.
 * Se a posição de uma câmera depender do tamanho da janela, ou se um marcador
 * em alarme puder ficar escondido atrás de um agrupamento verde, o mapa mente
 * exatamente no momento em que precisa ser confiável. As duas coisas são
 * decisões de regra, não de renderização — por isso moram aqui, puras e
 * testáveis, sem React, sem DOM, sem relógio e sem rede.
 *
 * Convenções fixas do padrão:
 *   - Posição é SEMPRE normalizada em [0,1] relativa à imagem da planta.
 *     Nunca em pixels: pixel depende de zoom, de DPI e do tamanho do contêiner.
 *   - Ângulo é em graus, 0° = norte da planta (para cima), crescendo no sentido
 *     horário — a mesma convenção de bússola que o instalador usa em campo.
 *   - A imagem é encaixada no contêiner por "contain" (mantém proporção e
 *     produz tarjas). Marcadores são posicionados relativos à IMAGEM, nunca ao
 *     contêiner, senão eles escorregam para cima da tarja ao redimensionar.
 */

/** Estado operacional de uma câmera no mapa, do mais grave ao mais benigno. */
export type MapMarkerStatus = 'alert' | 'offline' | 'warning' | 'online' | 'unknown';

/**
 * Precedência de gravidade. Índice menor = mais grave.
 *
 * `unknown` é deliberadamente MENOS grave que `warning` mas MAIS grave que
 * `online`: não saber não é um alarme, mas também nunca pode ser apresentado
 * como "tudo certo".
 */
const STATUS_SEVERITY: readonly MapMarkerStatus[] = [
  'alert',
  'offline',
  'warning',
  'unknown',
  'online',
] as const;

export const severityRank = (status: MapMarkerStatus): number => {
  const index = STATUS_SEVERITY.indexOf(status);
  return index === -1 ? STATUS_SEVERITY.indexOf('unknown') : index;
};

/** `true` quando `a` é estritamente mais grave que `b`. */
export const isWorseThan = (a: MapMarkerStatus, b: MapMarkerStatus): boolean =>
  severityRank(a) < severityRank(b);


/** Ponto normalizado dentro da planta. */
export interface NormalizedPoint {
  x: number;
  y: number;
}

/** Retângulo da imagem já encaixada dentro do contêiner, em pixels do contêiner. */
export interface FittedImageRect {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Fator aplicado à imagem original para caber no contêiner. */
  scale: number;
}

export interface MapPlacement {
  id: string;
  cameraId: string;
  label: string;
  position: NormalizedPoint;
  /** Direção para onde a câmera aponta, em graus de bússola. */
  headingDeg: number;
  /** Abertura do campo de visão, em graus. 0 = desconhecido (não desenha cone). */
  fovDeg: number;
  status: MapMarkerStatus;
}

export interface MarkerCluster {
  /** Chave estável, derivada dos membros — sobrevive a re-render. */
  key: string;
  /** Centro do agrupamento, normalizado. */
  center: NormalizedPoint;
  members: MapPlacement[];
  /** Estado do agrupamento: o mais grave entre os membros. Nunca a média. */
  status: MapMarkerStatus;
  /** Quantos membros estão no estado mais grave (para o rótulo "2 de 5"). */
  worstCount: number;
}

export interface ClampResult {
  point: NormalizedPoint;
  /** Verdadeiro quando o ponto original estava fora da planta e foi trazido de volta. */
  clamped: boolean;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Traz um ponto para dentro da planta.
 *
 * Um ponto fora de [0,1] é sempre um defeito na camada de arraste (ou um dado
 * legado). Preferimos corrigir e AVISAR a lançar exceção: recusar a desenhar o
 * mapa inteiro por causa de um marcador torto é pior para quem está de plantão.
 * Valores não numéricos (NaN, Infinity, undefined vindo de JSON) caem no centro
 * e são marcados como corrigidos — nunca viram `NaN%` no CSS, que some da tela
 * silenciosamente.
 */
export function clampToPlan(point: Partial<NormalizedPoint> | null | undefined): ClampResult {
  const rawX = isFiniteNumber(point?.x) ? (point as NormalizedPoint).x : Number.NaN;
  const rawY = isFiniteNumber(point?.y) ? (point as NormalizedPoint).y : Number.NaN;

  const x = Number.isFinite(rawX) ? Math.min(1, Math.max(0, rawX)) : 0.5;
  const y = Number.isFinite(rawY) ? Math.min(1, Math.max(0, rawY)) : 0.5;

  const clamped = !Number.isFinite(rawX) || !Number.isFinite(rawY) || x !== rawX || y !== rawY;

  return { point: { x, y }, clamped };
}

/**
 * Normaliza um ângulo para [0, 360).
 *
 * -90 vira 270; 360 vira 0; 725 vira 5. Sem isso, um `heading` negativo salvo
 * por um arraste anti-horário desenharia o cone em outro quadrante.
 */
export function normalizeAngle(deg: number): number {
  if (!isFiniteNumber(deg)) return 0;
  const wrapped = deg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** Abertura válida do cone: fora de (0, 360] não há cone a desenhar. */
export function normalizeFov(deg: number): number {
  if (!isFiniteNumber(deg) || deg <= 0) return 0;
  return Math.min(360, deg);
}

/**
 * Calcula o retângulo da imagem encaixada por "contain" no contêiner.
 *
 * Devolve largura/altura zeradas quando qualquer dimensão é inválida, para que
 * o chamador não divida por zero.
 */
export function fitImage(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number,
): FittedImageRect {
  const valid =
    isFiniteNumber(imageWidth) &&
    isFiniteNumber(imageHeight) &&
    isFiniteNumber(containerWidth) &&
    isFiniteNumber(containerHeight) &&
    imageWidth > 0 &&
    imageHeight > 0 &&
    containerWidth > 0 &&
    containerHeight > 0;

  if (!valid) {
    return { left: 0, top: 0, width: 0, height: 0, scale: 0 };
  }

  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
    scale,
  };
}

/** Converte ponto normalizado em pixels do contêiner, respeitando as tarjas. */
export function toContainerPixels(point: NormalizedPoint, rect: FittedImageRect): { x: number; y: number } {
  const safe = clampToPlan(point).point;
  return {
    x: rect.left + safe.x * rect.width,
    y: rect.top + safe.y * rect.height,
  };
}

/**
 * Converte pixels do contêiner (ex.: onde o dedo soltou o marcador) de volta
 * para coordenada normalizada. Solturas sobre a tarja são trazidas para a borda
 * da planta, não descartadas: o operador quis colocar a câmera ali na ponta.
 */
export function toNormalizedPoint(
  pixel: { x: number; y: number },
  rect: FittedImageRect,
): ClampResult {
  if (rect.width <= 0 || rect.height <= 0) {
    return { point: { x: 0.5, y: 0.5 }, clamped: true };
  }
  return clampToPlan({
    x: (pixel.x - rect.left) / rect.width,
    y: (pixel.y - rect.top) / rect.height,
  });
}

/**
 * Diz se um rumo está dentro do cone de visão, tratando a virada dos 360°.
 *
 * Um cone de 40° apontado para 350° cobre de 330° a 10°: sem o tratamento de
 * virada, o intervalo [330, 370] nunca conteria 5°.
 */
export function bearingWithinFov(bearingDeg: number, headingDeg: number, fovDeg: number): boolean {
  const fov = normalizeFov(fovDeg);
  if (fov === 0) return false;
  if (fov >= 360) return true;

  const bearing = normalizeAngle(bearingDeg);
  const heading = normalizeAngle(headingDeg);

  // Menor diferença angular absoluta entre os dois rumos.
  const delta = Math.abs(((bearing - heading + 540) % 360) - 180);
  return delta <= fov / 2 + 1e-9;
}

/**
 * Estado resultante de um conjunto de marcadores: o MAIS GRAVE vence.
 *
 * Regra de segurança: um agrupamento nunca pode parecer mais tranquilo do que
 * seu pior membro. Média, moda ou "estado do primeiro" esconderiam um alarme.
 */
export function worstStatus(statuses: readonly MapMarkerStatus[]): MapMarkerStatus {
  if (statuses.length === 0) return 'unknown';
  return statuses.reduce((worst, current) =>
    severityRank(current) < severityRank(worst) ? current : worst,
  );
}

export interface ClusterOptions {
  /** Distância mínima em pixels do contêiner para marcadores ficarem separados. */
  minSeparationPx: number;
  rect: FittedImageRect;
}

/**
 * Agrupa marcadores próximos demais para serem lidos separadamente.
 *
 * Propriedades garantidas (verificadas por simulação):
 *   - Todo marcador aparece em exatamente um agrupamento — nada some do mapa.
 *   - A ordem de entrada não muda o resultado (agrupamos por varredura
 *     determinística, ordenada por posição e depois por id).
 *   - O estado do agrupamento é o do pior membro.
 *   - Separação <= 0 desliga o agrupamento (um marcador por câmera).
 */
export function clusterMarkers(
  placements: readonly MapPlacement[],
  options: ClusterOptions,
): MarkerCluster[] {
  const { minSeparationPx, rect } = options;

  const sorted = [...placements].sort((a, b) => {
    const ax = clampToPlan(a.position).point;
    const bx = clampToPlan(b.position).point;
    if (ax.x !== bx.x) return ax.x - bx.x;
    if (ax.y !== bx.y) return ax.y - bx.y;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const buckets: MapPlacement[][] = [];

  for (const placement of sorted) {
    const pixel = toContainerPixels(placement.position, rect);
    let target: MapPlacement[] | undefined;

    if (minSeparationPx > 0 && rect.width > 0) {
      target = buckets.find((bucket) => {
        const head = bucket[0];
        if (!head) return false;
        const anchor = toContainerPixels(head.position, rect);

        const dx = anchor.x - pixel.x;
        const dy = anchor.y - pixel.y;
        return Math.hypot(dx, dy) < minSeparationPx;
      });
    }

    if (target) target.push(placement);
    else buckets.push([placement]);
  }

  return buckets.map((members) => {
    const status = worstStatus(members.map((m) => m.status));
    const sum = members.reduce(
      (acc, m) => {
        const p = clampToPlan(m.position).point;
        return { x: acc.x + p.x, y: acc.y + p.y };
      },
      { x: 0, y: 0 },
    );
    return {
      key: members
        .map((m) => m.id)
        .sort()
        .join('|'),
      center: { x: sum.x / members.length, y: sum.y / members.length },
      members,
      status,
      worstCount: members.filter((m) => m.status === status).length,
    };
  });
}

/** Resumo de situação da planta, para o cabeçalho da página. */
export interface PlanSummary {
  total: number;
  byStatus: Record<MapMarkerStatus, number>;
  worst: MapMarkerStatus;
  /** Quantos marcadores precisaram ser corrigidos por estarem fora da planta. */
  outOfBounds: number;
}

export function summarizePlan(placements: readonly MapPlacement[]): PlanSummary {
  const byStatus: Record<MapMarkerStatus, number> = {
    alert: 0,
    offline: 0,
    warning: 0,
    online: 0,
    unknown: 0,
  };
  let outOfBounds = 0;

  for (const placement of placements) {
    const status: MapMarkerStatus = STATUS_SEVERITY.includes(placement.status)
      ? placement.status
      : 'unknown';
    byStatus[status] += 1;
    if (clampToPlan(placement.position).clamped) outOfBounds += 1;
  }

  return {
    total: placements.length,
    byStatus,
    worst: worstStatus(placements.map((p) => p.status)),
    outOfBounds,
  };
}
