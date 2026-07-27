/**
 * Onda 149 — DÍVIDA DE ATENDIMENTO por responsável.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 147 deu endereço ao alerta e a Onda 148 deu o recorte por dono. As
 * duas respondem "de quem é?" — nenhuma responde **"há quanto tempo está
 * parado?"**. Na operação real esse é o dado que decide a ordem do dia:
 *
 *  - o crachá da Onda 148 conta abertos, e 12 avisos recém-nascidos pesam mais
 *    na tela do que 1 crítico esquecido há 9 horas;
 *  - a escada da Onda 117 já bateu no teto (`paged`) e parou de avisar, ou
 *    seja, exatamente o alerta mais antigo é o que perdeu voz;
 *  - e o console não distingue "ninguém viu ainda" de "ninguém vai ver".
 *
 * Este módulo é a **regra única do prazo de atendimento**. Puro (sem React,
 * sem rede, sem relógio próprio) para que centenas de cenários sejam varridos
 * no CI: a idade já vem calculada em `MaintenanceAlertView.ageMinutes`, com o
 * relógio injetado lá em cima por `buildMaintenanceConsole(rows, nowMs)`.
 *
 * ## Decisões e o porquê
 *
 *  - **O prazo é do PAR (dono, severidade), não do dono.** Um crítico do
 *    técnico de campo e um aviso do cadastro não têm a mesma urgência física.
 *    Prazo único por dono forçaria escolher entre alarmar demais o aviso ou de
 *    menos o crítico.
 *  - **`triage` e `unrouted` têm o prazo mais curto entre os avisos.** Alerta
 *    sem endereço não tem quem o defenda: se ficar parado, some. O prazo curto
 *    é o que devolve o incidente para a mesa humana.
 *  - **O estado do balde é o do PIOR alerta aberto**, nunca a média. Média
 *    esconde exatamente o caso que interessa (I2 abaixo).
 *  - **Reconhecido não conta.** Reconhecer é o ato que encerra o relógio da
 *    Onda 136; contar o reconhecido reintroduziria trabalho já fechado.
 *  - **Sem relógio próprio.** Recalcular `Date.now()` aqui faria a tela
 *    divergir do resto do console entre dois renders.
 *  - **Estado é degrau, não gradiente:** `idle` → `on_track` → `at_risk`
 *    (≥75% do prazo) → `breached` (prazo estourado). Três nomes cabem num
 *    crachá; um percentual não cabe.
 *
 * Invariantes varridas pelos testes e pela simulação:
 *   A1 apenas alertas ABERTOS influenciam qualquer campo do balde
 *   A2 o estado do balde é o do pior alerta aberto (nunca melhor que ele)
 *   A3 `breached` ⇔ `minutesRemaining <= 0` (e `on_track`/`at_risk` ⇒ > 0)
 *   A4 envelhecer um alerta nunca melhora o estado nem aumenta o restante
 *   A5 balde sem abertos ⇒ `idle`, `oldestOpenMinutes = 0`, restante `null`
 *   A6 a soma dos `breached` por balde = total de estourados da lista
 *   A7 a função é total: qualquer dono/severidade tem prazo definido
 */

import type { MaintenanceSeverity } from '@/lib/maintenanceEscalation';
import type { MaintenanceAlertView } from '@/lib/maintenance/maintenanceConsoleView';
import type { MaintenanceOwner } from '@/lib/maintenance/maintenanceOwner';
import type { OwnerFilterKey } from '@/lib/maintenance/ownerFilter';

/** Fração do prazo a partir da qual o balde entra em risco. */
export const AT_RISK_FRACTION = 0.75;

export type OwnerSlaState = 'idle' | 'on_track' | 'at_risk' | 'breached';

/**
 * Prazo de atendimento em minutos, por (dono, severidade).
 *
 * Os números seguem a natureza do trabalho, não a hierarquia:
 * deslocamento físico (`field_tech`) é mais lento que uma correção de cadastro;
 * `platform` responde rápido no crítico porque a falha é global.
 */
export const OWNER_SLA_MINUTES: Readonly<
  Record<MaintenanceOwner | 'unrouted', Readonly<Record<MaintenanceSeverity, number>>>
> = {
  field_tech: { critical: 240, warning: 1440 },
  network_ops: { critical: 60, warning: 480 },
  registry_admin: { critical: 120, warning: 720 },
  platform: { critical: 30, warning: 240 },
  triage: { critical: 60, warning: 360 },
  unrouted: { critical: 60, warning: 360 },
};

export interface OwnerAging {
  readonly key: OwnerFilterKey;
  /** Idade do alerta aberto mais antigo do balde; 0 quando não há abertos. */
  readonly oldestOpenMinutes: number;
  /**
   * Minutos restantes do alerta mais apertado (menor folga). Negativo ou zero
   * significa prazo estourado. `null` quando o balde não tem abertos.
   */
  readonly minutesRemaining: number | null;
  readonly state: OwnerSlaState;
  /** Quantos abertos já estouraram o prazo. */
  readonly breached: number;
  /** Quantos abertos estão em risco (≥75% do prazo) sem ter estourado. */
  readonly atRisk: number;
}

const IDLE_BASE = { oldestOpenMinutes: 0, minutesRemaining: null, state: 'idle', breached: 0, atRisk: 0 } as const;

function slaFor(key: OwnerFilterKey, severity: MaintenanceSeverity): number {
  // `all` é agregado: usa o prazo mais curto do vocabulário para não afrouxar
  // o cabeçalho em relação a qualquer balde individual (A2 no agregado).
  if (key === 'all') return severity === 'critical' ? 30 : 240;
  const row = OWNER_SLA_MINUTES[key as MaintenanceOwner | 'unrouted'];
  // A7: dono desconhecido (dado de rede) cai no prazo de triagem.
  return (row ?? OWNER_SLA_MINUTES.triage)[severity];
}

function bucketKeyOf(row: MaintenanceAlertView): OwnerFilterKey {
  return row.routing === null ? 'unrouted' : row.routing.owner;
}

/** Arredonda para 1 casa sem cruzar o zero (preserva o sinal da folga). */
function roundKeepingSign(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  if (value > 0 && rounded <= 0) return 0.1;
  if (value <= 0 && rounded > 0) return 0;
  return rounded;
}

const STATE_RANK: Readonly<Record<OwnerSlaState, number>> = {
  idle: 0,
  on_track: 1,
  at_risk: 2,
  breached: 3,
};

/** Estado de um único alerta aberto contra o prazo do seu balde. */
export function alertSlaState(ageMinutes: number, slaMinutes: number): Exclude<OwnerSlaState, 'idle'> {
  const age = Number.isFinite(ageMinutes) ? Math.max(0, ageMinutes) : 0;
  if (age >= slaMinutes) return 'breached';
  if (age >= slaMinutes * AT_RISK_FRACTION) return 'at_risk';
  return 'on_track';
}

/**
 * Calcula a dívida de atendimento de um balde a partir das linhas JÁ
 * recortadas para ele. Não filtra por dono: quem recorta é `applyOwnerFilter`.
 */
export function computeOwnerAging(
  key: OwnerFilterKey,
  rows: readonly MaintenanceAlertView[],
): OwnerAging {
  const open = rows.filter((row) => row.status === 'open');
  if (open.length === 0) return { key, ...IDLE_BASE };

  let oldest = 0;
  let tightest = Number.POSITIVE_INFINITY;
  let breached = 0;
  let atRisk = 0;
  let worst: OwnerSlaState = 'on_track';

  for (const row of open) {
    const sla = slaFor(key, row.severity);
    const age = Number.isFinite(row.ageMinutes) ? Math.max(0, row.ageMinutes) : 0;
    const state = alertSlaState(age, sla);

    if (age > oldest) oldest = age;
    tightest = Math.min(tightest, sla - age);
    if (state === 'breached') breached += 1;
    else if (state === 'at_risk') atRisk += 1;
    if (STATE_RANK[state] > STATE_RANK[worst]) worst = state;
  }

  return {
    key,
    oldestOpenMinutes: Math.round(oldest * 10) / 10,
    // Arredondamento que NÃO cruza o zero: uma folga positiva de 0,04 min não
    // pode virar "0" e passar a mentir que o prazo estourou (A3).
    minutesRemaining: roundKeepingSign(tightest),
    state: worst,
    breached,
    atRisk,
  };
}

/** Mapa dono → dívida, derivado da lista completa (baldes vazios não existem). */
export function buildOwnerAgingMap(
  rows: readonly MaintenanceAlertView[],
): ReadonlyMap<OwnerFilterKey, OwnerAging> {
  const grouped = new Map<OwnerFilterKey, MaintenanceAlertView[]>();
  for (const row of rows) {
    const key = bucketKeyOf(row);
    const list = grouped.get(key);
    if (list) list.push(row);
    else grouped.set(key, [row]);
  }

  const result = new Map<OwnerFilterKey, OwnerAging>();
  result.set('all', computeOwnerAging('all', rows));
  for (const [key, list] of grouped) result.set(key, computeOwnerAging(key, list));
  return result;
}

/** Texto curto para o crachá; `null` quando não há nada a dizer. */
export function agingLabel(aging: OwnerAging): string | null {
  switch (aging.state) {
    case 'breached':
      return `${aging.breached} fora do prazo`;
    case 'at_risk':
      return `${aging.atRisk} perto do prazo`;
    default:
      return null;
  }
}
