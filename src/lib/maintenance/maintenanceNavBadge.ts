/**
 * Onda 137 — contador de incidentes de manutenção na navegação.
 *
 * ## Por que existe
 *
 * A Onda 136 entregou o console `/manutencao`, mas ele só era alcançável
 * digitando a URL. Um console de incidentes que ninguém encontra tem o mesmo
 * efeito prático do console que não existia: o alerta continua sem
 * reconhecimento e a escada da Onda 117 sobe até o teto. Descoberta não é
 * enfeite aqui — é parte do fechamento do incidente.
 *
 * ## Regras de exibição
 *
 *  - **Só admin vê.** A RLS já devolveria zero linhas para os demais, mas
 *    exibir "0" para quem não pode agir é ruído; o contador simplesmente não
 *    existe fora do papel que tem o botão.
 *  - **Zero aberto = sem badge.** Badge permanente vira paisagem e deixa de ser
 *    lido — o mesmo motivo pelo qual o barramento tem cooldown.
 *  - **A cor segue o pior aberto**, não a maioria: um `critical` no meio de
 *    vinte `warning` pinta o contador de crítico.
 *  - **Teto da escada pulsa.** Alerta que já esgotou o escalonamento não terá
 *    mais nenhum aviso automático: a navegação é o último canal restante.
 *
 * Invariantes varridas pelos testes:
 *   M1 não-admin nunca recebe badge, qualquer que seja o resumo
 *   M2 `open === 0` nunca produz badge, mesmo com reconhecidos na lista
 *   M3 o valor do badge é exatamente `summary.open`
 *   M4 existe `critical` aberto ⇔ variante `destructive`
 *   M5 pulso ⇔ existe aberto no teto da escada
 *   M6 o rótulo acessível cita a mesma contagem exibida
 */

import type { MaintenanceConsoleSummary } from './maintenanceConsoleView';

export type NavBadgeVariant = 'default' | 'destructive' | 'warning' | 'success';

export interface MaintenanceNavBadge {
  /** Contagem a exibir; `undefined` quando o contador não deve aparecer. */
  readonly badge: number | undefined;
  readonly variant: NavBadgeVariant;
  /** Chama atenção quando ninguém mais será avisado automaticamente. */
  readonly pulse: boolean;
  /** Texto para leitores de tela e tooltip. */
  readonly srLabel: string;
}

const HIDDEN: MaintenanceNavBadge = {
  badge: undefined,
  variant: 'default',
  pulse: false,
  srLabel: 'Sem incidentes de manutenção abertos',
};

export function buildMaintenanceNavBadge(
  summary: Pick<MaintenanceConsoleSummary, 'open' | 'openCritical' | 'atCeiling'> | null | undefined,
  isAdmin: boolean,
): MaintenanceNavBadge {
  if (!isAdmin || !summary) return HIDDEN;

  const open = Number.isFinite(summary.open) ? Math.max(0, Math.trunc(summary.open)) : 0;
  if (open === 0) return HIDDEN;

  const critical = Number.isFinite(summary.openCritical)
    ? Math.max(0, Math.trunc(summary.openCritical))
    : 0;
  const atCeiling = Number.isFinite(summary.atCeiling)
    ? Math.max(0, Math.trunc(summary.atCeiling))
    : 0;

  const plural = open === 1 ? 'incidente aberto' : 'incidentes abertos';
  const ceilingNote =
    atCeiling > 0
      ? `; ${atCeiling} no teto do escalonamento, sem novos avisos automáticos`
      : '';

  return {
    badge: open,
    variant: critical > 0 ? 'destructive' : 'warning',
    pulse: atCeiling > 0,
    srLabel: `${open} ${plural} de manutenção${critical > 0 ? `, ${critical} crítico(s)` : ''}${ceilingNote}`,
  };
}
