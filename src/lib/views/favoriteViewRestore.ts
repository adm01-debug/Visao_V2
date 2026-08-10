/**
 * Onda 188 — Visualizações favoritas: regra única de restauração de arranjo.
 *
 * Um favorito é um **arranjo posicional** (qual câmera em qual célula), nunca
 * uma lista ordenada. Restaurar um favorito é uma operação **pura**: não escreve
 * no banco, não corrige o favorito salvo e nunca inventa conteúdo.
 *
 * Invariantes (as quatro que não podem ser violadas):
 *  1. Célula é posição: câmera ausente vira célula VAZIA, jamais desloca as demais.
 *  2. Ausência tem causa: "removida" (não existe/sem acesso) ≠ "duplicada" ≠ "vazia".
 *  3. Layout menor não apaga o favorito: o que não cabe vira `overflow` declarado,
 *     visível para o operador, e o registro salvo permanece intocado.
 *  4. Entrada inválida (slot fora da faixa, não inteiro) nunca é silenciada.
 */

export type MonitorLayout = '1x1' | '2x2' | '3x3' | '4x4' | '1+5' | '2+8';

export const LAYOUT_SLOTS: Record<MonitorLayout, number> = {
  '1x1': 1,
  '2x2': 4,
  '3x3': 9,
  '4x4': 16,
  '1+5': 6,
  '2+8': 10,
};

export const MONITOR_LAYOUTS = Object.keys(LAYOUT_SLOTS) as MonitorLayout[];

/** Teto físico de `monitor_group_cameras.slot_index` (CHECK 0..31 no banco). */
export const MAX_SLOT_INDEX = 31;

/** Teto de favoritos por usuário — evita lista infinita na barra de acesso rápido. */
export const MAX_FAVORITE_VIEWS = 24;

export function isMonitorLayout(value: unknown): value is MonitorLayout {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LAYOUT_SLOTS, value);
}

export function layoutCapacity(layout: MonitorLayout): number {
  return LAYOUT_SLOTS[layout];
}

/** Motivo pelo qual uma célula do arranjo restaurado ficou sem câmera. */
export type VacancyReason =
  /** Nada foi salvo nessa posição. */
  | 'empty'
  /** A câmera salva não está mais visível para este usuário (apagada ou sem acesso). */
  | 'camera_removed'
  /** A mesma câmera já ocupou uma posição anterior do arranjo. */
  | 'duplicate_camera';

/** Motivo pelo qual uma linha salva não pôde ser colocada em nenhuma célula. */
export type OverflowReason =
  /** `slot_index` maior ou igual à capacidade do layout atual. */
  | 'out_of_capacity'
  /** Duas linhas salvas disputando a mesma posição — a primeira vence. */
  | 'duplicate_slot'
  /** `slot_index` não inteiro ou fora de 0..MAX_SLOT_INDEX. */
  | 'invalid_slot'
  /** `camera_id` ausente/vazio na linha salva. */
  | 'invalid_camera';

export interface SavedSlot {
  slot_index: number;
  camera_id: string;
}

export interface RestoredCell {
  slotIndex: number;
  cameraId: string | null;
  /** `null` quando a célula foi preenchida com sucesso. */
  vacancy: VacancyReason | null;
}

export interface OverflowSlot {
  slotIndex: number;
  cameraId: string | null;
  reason: OverflowReason;
}

export interface RestoreFavoriteViewInput {
  layout: MonitorLayout;
  saved: readonly SavedSlot[];
  /** Conjunto de câmeras que o usuário realmente enxerga agora. */
  visibleCameraIds: Iterable<string>;
}

export interface RestoreFavoriteViewResult {
  layout: MonitorLayout;
  capacity: number;
  cells: RestoredCell[];
  overflow: OverflowSlot[];
  /** Quantidade de células efetivamente preenchidas. */
  filled: number;
  /** Quantidade de posições salvas que não puderam ser honradas. */
  lost: number;
  /** `true` quando o arranjo exibido difere do arranjo salvo. */
  degraded: boolean;
}

function isValidSlotIndex(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_SLOT_INDEX;
}

/**
 * Restaura um arranjo favorito contra o estado atual da frota.
 * Função pura e determinística: mesma entrada, mesma saída, sem efeitos colaterais.
 */
export function restoreFavoriteView(input: RestoreFavoriteViewInput): RestoreFavoriteViewResult {
  const { layout } = input;
  const capacity = layoutCapacity(layout);

  const visible =
    input.visibleCameraIds instanceof Set
      ? (input.visibleCameraIds as Set<string>)
      : new Set(input.visibleCameraIds);

  const cells: RestoredCell[] = Array.from({ length: capacity }, (_, slotIndex) => ({
    slotIndex,
    cameraId: null,
    vacancy: 'empty' as VacancyReason | null,
  }));

  const overflow: OverflowSlot[] = [];

  // Ordem canônica: por posição crescente e, em empate, pela ordem de chegada.
  // `map` preserva o índice original para desempate estável.
  const ordered = input.saved
    .map((row, seq) => ({ row, seq }))
    .sort((a, b) => {
      const ai = Number(a.row?.slot_index);
      const bi = Number(b.row?.slot_index);
      const aValid = isValidSlotIndex(ai);
      const bValid = isValidSlotIndex(bi);
      if (aValid && bValid && ai !== bi) return ai - bi;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return a.seq - b.seq;
    });

  const takenSlots = new Set<number>();
  const placedCameras = new Set<string>();

  for (const { row } of ordered) {
    const slotIndex = Number(row?.slot_index);
    const cameraId = typeof row?.camera_id === 'string' ? row.camera_id.trim() : '';

    if (!isValidSlotIndex(slotIndex)) {
      overflow.push({
        slotIndex: Number.isFinite(slotIndex) ? slotIndex : -1,
        cameraId: cameraId || null,
        reason: 'invalid_slot',
      });
      continue;
    }
    if (!cameraId) {
      overflow.push({ slotIndex, cameraId: null, reason: 'invalid_camera' });
      continue;
    }
    if (takenSlots.has(slotIndex)) {
      overflow.push({ slotIndex, cameraId, reason: 'duplicate_slot' });
      continue;
    }
    takenSlots.add(slotIndex);

    if (slotIndex >= capacity) {
      overflow.push({ slotIndex, cameraId, reason: 'out_of_capacity' });
      continue;
    }

    const cell = cells[slotIndex]!;
    if (placedCameras.has(cameraId)) {
      cell.vacancy = 'duplicate_camera';
      continue;
    }
    if (!visible.has(cameraId)) {
      cell.vacancy = 'camera_removed';
      continue;
    }

    cell.cameraId = cameraId;
    cell.vacancy = null;
    placedCameras.add(cameraId);
  }

  const filled = cells.reduce((acc, c) => acc + (c.cameraId ? 1 : 0), 0);
  const vacancyLosses = cells.reduce(
    (acc, c) => acc + (c.vacancy !== null && c.vacancy !== 'empty' ? 1 : 0),
    0
  );
  const lost = vacancyLosses + overflow.length;

  return { layout, capacity, cells, overflow, filled, lost, degraded: lost > 0 };
}

const VACANCY_LABEL: Record<Exclude<VacancyReason, 'empty'>, string> = {
  camera_removed: 'câmera indisponível',
  duplicate_camera: 'câmera repetida no arranjo',
};

const OVERFLOW_LABEL: Record<OverflowReason, string> = {
  out_of_capacity: 'posição além da capacidade do layout',
  duplicate_slot: 'duas câmeras na mesma posição',
  invalid_slot: 'posição inválida',
  invalid_camera: 'registro sem câmera',
};

/** Texto PT-BR para o operador. Nunca acusa perda quando o arranjo veio íntegro. */
export function describeRestore(result: RestoreFavoriteViewResult): string {
  if (!result.degraded) {
    return `${result.filled}/${result.capacity} posições restauradas`;
  }
  const reasons = new Set<string>();
  for (const cell of result.cells) {
    if (cell.vacancy && cell.vacancy !== 'empty') reasons.add(VACANCY_LABEL[cell.vacancy]);
  }
  for (const over of result.overflow) reasons.add(OVERFLOW_LABEL[over.reason]);
  return `${result.filled}/${result.capacity} posições restauradas · ${result.lost} não honrada(s): ${[...reasons].join(', ')}`;
}

/**
 * Converte o arranjo exibido de volta para linhas persistíveis.
 * Preserva buracos: célula vazia simplesmente não gera linha, e as demais
 * mantêm o `slot_index` original (nunca é recompactado).
 */
export function cellsToSavedSlots(cells: readonly RestoredCell[]): SavedSlot[] {
  return cells
    .filter((c): c is RestoredCell & { cameraId: string } => Boolean(c.cameraId))
    .map((c) => ({ slot_index: c.slotIndex, camera_id: c.cameraId }));
}

/** Normaliza nome de favorito conforme o CHECK do banco (1..100 após trim). */
export function normalizeFavoriteName(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 1 || trimmed.length > 100) return null;
  return trimmed;
}
