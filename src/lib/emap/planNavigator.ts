/**
 * Onda 166 — navegação entre plantas (multi-andar).
 *
 * Regra única de como as plantas são listadas, numeradas para atalho de
 * teclado e rotuladas com o pior estado de suas câmeras.
 *
 * Princípios (aprendidos nas ondas anteriores do mapa):
 * - O rótulo de uma planta é o PIOR estado das suas câmeras, nunca uma média:
 *   um andar com 19 câmeras online e 1 em alarme é um andar em alarme.
 * - Planta sem câmera é "desconhecida", não "online". Ausência de prova não é
 *   prova de normalidade.
 * - Atalho de teclado só existe para as 9 primeiras: o operador não decora
 *   dois dígitos sob estresse, e um atalho ambíguo é pior que nenhum.
 * - Nada aqui toca em rede, relógio ou DOM — é função pura e testável.
 */

import { worstStatus, type MapMarkerStatus } from './floorPlanGeometry';

/** O mínimo que a navegação precisa saber de uma planta. */
export interface NavigablePlan {
  id: string;
  name: string;
  isDefault?: boolean;
}

/** Quais câmeras estão posicionadas em cada planta. */
export type PlanRoster = Readonly<Record<string, readonly string[]>>;

export interface PlanNavItem {
  planId: string;
  name: string;
  isDefault: boolean;
  /** 1..9 para as nove primeiras; `null` a partir da décima. */
  shortcut: number | null;
  cameraCount: number;
  worst: MapMarkerStatus;
  /** Quantas câmeras estão no pior estado (0 quando não há câmeras). */
  worstCount: number;
  /** Câmeras que exigem olhar humano: alarme ou offline. */
  attention: number;
  isActive: boolean;
}

export interface PlanNavigation {
  items: readonly PlanNavItem[];
  /** Índice do item ativo em `items`; -1 quando não há planta ativa válida. */
  activeIndex: number;
  /** Planta que a tela deve mostrar — resolve ativo inválido/ausente. */
  resolvedActiveId: string | null;
}

const MAX_SHORTCUTS = 9;
const ATTENTION: ReadonlySet<MapMarkerStatus> = new Set<MapMarkerStatus>(['alert', 'offline']);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export interface BuildNavigationInput {
  plans: readonly NavigablePlan[] | null | undefined;
  /** Câmeras por planta. Planta ausente do mapa é tratada como vazia. */
  roster?: PlanRoster | null;
  /** Estado ao vivo de cada câmera. Câmera desconhecida vira `unknown`. */
  statusOf?: (cameraId: string) => MapMarkerStatus | undefined;
  activePlanId?: string | null;
}

/**
 * Monta a lista de navegação preservando a ordem recebida (a consulta já
 * ordena por padrão/criação — reordenar aqui faria o atalho "2" mudar de andar
 * entre dois renders, que é a pior falha possível numa mesa de operação).
 */
export function buildPlanNavigation(input: BuildNavigationInput): PlanNavigation {
  const { plans, roster, statusOf, activePlanId } = input ?? {};
  const seen = new Set<string>();
  const items: PlanNavItem[] = [];

  for (const plan of plans ?? []) {
    if (!plan || !isNonEmptyString(plan.id)) continue;
    if (seen.has(plan.id)) continue;
    seen.add(plan.id);

    const cameraIds = (roster?.[plan.id] ?? []).filter(isNonEmptyString);
    const uniqueCameras = Array.from(new Set(cameraIds));
    const statuses: MapMarkerStatus[] = uniqueCameras.map(
      (cameraId) => statusOf?.(cameraId) ?? 'unknown',
    );

    const worst = statuses.length > 0 ? worstStatus(statuses) : 'unknown';

    items.push({
      planId: plan.id,
      name: isNonEmptyString(plan.name) ? plan.name : 'Planta sem nome',
      isDefault: plan.isDefault === true,
      shortcut: items.length < MAX_SHORTCUTS ? items.length + 1 : null,
      cameraCount: uniqueCameras.length,
      worst,
      worstCount: statuses.filter((status) => status === worst).length,
      attention: statuses.filter((status) => ATTENTION.has(status)).length,
      isActive: false,
    });
  }

  let activeIndex = isNonEmptyString(activePlanId)
    ? items.findIndex((item) => item.planId === activePlanId)
    : -1;
  // Ativo inválido não deixa a tela órfã: cai na primeira planta.
  if (activeIndex < 0 && items.length > 0) activeIndex = 0;

  if (activeIndex >= 0) items[activeIndex] = { ...items[activeIndex], isActive: true };

  return {
    items,
    activeIndex,
    resolvedActiveId: activeIndex >= 0 ? items[activeIndex].planId : null,
  };
}

/** Traduz a tecla pressionada em planta-alvo. Devolve `null` se não houver. */
export function resolveShortcutTarget(
  items: readonly PlanNavItem[] | null | undefined,
  key: unknown,
): string | null {
  if (typeof key !== 'string' || !/^[1-9]$/.test(key)) return null;
  const wanted = Number.parseInt(key, 10);
  const hit = (items ?? []).find((item) => item.shortcut === wanted);
  return hit ? hit.planId : null;
}

export type PlanStep = 'next' | 'previous';

/**
 * Passo circular entre plantas. Circular de propósito: quem varre andares num
 * plantão não quer bater numa parede invisível no último item.
 */
export function stepPlan(
  items: readonly PlanNavItem[] | null | undefined,
  activePlanId: string | null | undefined,
  direction: PlanStep,
): string | null {
  const list = items ?? [];
  if (list.length === 0) return null;
  const current = list.findIndex((item) => item.planId === activePlanId);
  if (current < 0) return list[0].planId;
  const delta = direction === 'previous' ? -1 : 1;
  const next = (current + delta + list.length) % list.length;
  return list[next].planId;
}

/**
 * Atalho de tecla não pode roubar dígito de quem está digitando um nome de
 * planta ou preenchendo um campo de FOV.
 */
export function isEditableTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false;
  const node = target as { tagName?: unknown; isContentEditable?: unknown };
  if (node.isContentEditable === true) return true;
  const tag = typeof node.tagName === 'string' ? node.tagName.toUpperCase() : '';
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** Rótulo curto e humano do estado de um andar. */
export function describePlanStatus(item: PlanNavItem): string {
  if (item.cameraCount === 0) return 'sem câmeras posicionadas';
  switch (item.worst) {
    case 'alert':
      return `${item.attention} em alarme`;
    case 'offline':
      return `${item.attention} offline`;
    case 'warning':
      return `${item.worstCount} em atenção`;
    case 'online':
      return 'tudo normal';
    default:
      return 'estado desconhecido';
  }
}
