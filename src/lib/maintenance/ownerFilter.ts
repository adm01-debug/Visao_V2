/**
 * Onda 148 — Filtro por RESPONSÁVEL no console de manutenção.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 147 fez o alerta nascer endereçado (`detail.owner`), mas a tela
 * continuou sendo uma lista única. Na operação real isso significa que o
 * técnico de campo lê 40 linhas para achar as 3 que são dele — e a chance de
 * um alerta crítico ser lido por "todo mundo menos o dono" cresce com a frota.
 *
 * Este módulo é a regra única do recorte por dono. É puro (sem React, sem
 * rede) para que centenas de cenários sejam varridos no CI.
 *
 * ## Decisões e o porquê
 *
 *  - **O balde é derivado das linhas, nunca fixo.** Mostrar "Técnico de campo
 *    (0)" para quem não tem nada é ruído. Só aparece quem tem alerta.
 *  - **`unrouted` é um balde de primeira classe.** As rotinas das Ondas 110–135
 *    são anteriores ao roteamento e continuam válidas; escondê-las atrás de um
 *    filtro que elas não conseguem satisfazer seria perder incidente.
 *  - **A contagem do balde conta ABERTOS**, porque é o trabalho pendente que
 *    decide para onde olhar. `total` fica disponível para não mentir sobre o
 *    tamanho da lista quando o recorte é aplicado.
 *  - **Seleção inválida degrada para `all`.** O recorte pode desaparecer entre
 *    dois refetches (o dono reconheceu tudo). Uma tela vazia sem explicação é
 *    pior do que voltar para a lista completa.
 *  - **O filtro nunca reordena.** A ordenação por urgência é da Onda 136 e é a
 *    única fonte de prioridade; recortar não pode alterar a fila.
 *
 * Invariantes varridas pelos testes e pela simulação:
 *   I1 os baldes particionam as linhas: soma dos `total` = total de linhas
 *   I2 nenhum balde vazio de abertos E de reconhecidos é oferecido
 *   I3 aplicar o filtro é idempotente e é subconjunto que preserva a ordem
 *   I4 `all` devolve exatamente a entrada
 *   I5 chave desconhecida ou sem balde degrada para `all` (nunca lista vazia)
 *   I6 a soma dos abertos dos baldes de dono + `unrouted` = abertos totais
 */

import type { MaintenanceAlertView } from '@/lib/maintenance/maintenanceConsoleView';
import type { MaintenanceOwner } from '@/lib/maintenance/maintenanceOwner';

/** Chave de recorte. `unrouted` = alerta sem `detail.owner`. */
export type OwnerFilterKey = 'all' | 'unrouted' | MaintenanceOwner;

export interface OwnerBucket {
  readonly key: OwnerFilterKey;
  readonly label: string;
  /** Alertas abertos no balde — é o número que decide a atenção. */
  readonly open: number;
  /** Abertos com severidade crítica, para destacar o crachá. */
  readonly critical: number;
  /** Total de linhas no balde (abertos + reconhecidos). */
  readonly total: number;
}

const UNROUTED_LABEL = 'Sem responsável';

/** Ordem estável dos baldes: `all` primeiro, donos por urgência, `unrouted` no fim. */
function bucketRank(bucket: OwnerBucket): number {
  if (bucket.key === 'all') return -1;
  if (bucket.key === 'unrouted') return Number.MAX_SAFE_INTEGER;
  return 0;
}

function ownerKeyOf(row: MaintenanceAlertView): OwnerFilterKey {
  return row.routing === null ? 'unrouted' : row.routing.owner;
}

function labelOf(row: MaintenanceAlertView): string {
  return row.routing === null ? UNROUTED_LABEL : row.routing.label;
}

/**
 * Constrói os baldes oferecidos pela tela. Sempre inclui `all` — mesmo com a
 * lista vazia — para que o controle nunca fique sem opção selecionada.
 */
export function buildOwnerBuckets(rows: readonly MaintenanceAlertView[]): readonly OwnerBucket[] {
  const byKey = new Map<
    OwnerFilterKey,
    { label: string; open: number; critical: number; total: number }
  >();

  for (const row of rows) {
    const key = ownerKeyOf(row);
    const entry = byKey.get(key) ?? { label: labelOf(row), open: 0, critical: 0, total: 0 };
    entry.total += 1;
    if (row.status === 'open') {
      entry.open += 1;
      if (row.severity === 'critical') entry.critical += 1;
    }
    byKey.set(key, entry);
  }

  const openTotal = rows.filter((row) => row.status === 'open').length;
  const criticalTotal = rows.filter(
    (row) => row.status === 'open' && row.severity === 'critical'
  ).length;

  const buckets: OwnerBucket[] = [
    { key: 'all', label: 'Todos', open: openTotal, critical: criticalTotal, total: rows.length },
    ...[...byKey.entries()].map(([key, entry]) => ({
      key,
      label: entry.label,
      open: entry.open,
      critical: entry.critical,
      total: entry.total,
    })),
  ];

  // Mais trabalho pendente primeiro; empate pelo rótulo para ser determinístico.
  buckets.sort((a, b) => {
    const rank = bucketRank(a) - bucketRank(b);
    if (rank !== 0) return rank;
    if (a.open !== b.open) return b.open - a.open;
    if (a.total !== b.total) return b.total - a.total;
    return a.label.localeCompare(b.label, 'pt-BR');
  });

  return buckets;
}

/** Normaliza a chave selecionada contra os baldes existentes (I5). */
export function resolveOwnerFilter(
  buckets: readonly OwnerBucket[],
  selected: string | null | undefined
): OwnerFilterKey {
  if (selected === null || selected === undefined) return 'all';
  const found = buckets.find((bucket) => bucket.key === selected);
  return found ? found.key : 'all';
}

/**
 * Recorta as linhas preservando a ordem original. `all` devolve a mesma
 * referência para não invalidar memoizações a jusante.
 */
export function applyOwnerFilter(
  rows: readonly MaintenanceAlertView[],
  key: OwnerFilterKey
): readonly MaintenanceAlertView[] {
  if (key === 'all') return rows;
  return rows.filter((row) => ownerKeyOf(row) === key);
}
