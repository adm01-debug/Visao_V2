/**
 * Onda 138 — regra única dos contadores da navegação inferior (mobile).
 *
 * ## Os defeitos que este módulo corrige
 *
 * A `BottomNavigation` calculava badges inline, com três problemas que a
 * simulação de cenários expôs:
 *
 * 1. **Frota mentindo por omissão.** O badge de "Monitor" exibia apenas
 *    `onlineCameras`. Com 3 de 60 câmeras no ar, o operador via um discreto
 *    "3" — indistinguível de "3 de 3". Pior: com 0 online o badge sumia por
 *    completo (`badge > 0`), ou seja, a frota inteira caída era representada
 *    por *nada*. O desktop já mostrava `online/total`; o mobile não.
 * 2. **Console de manutenção invisível no celular.** A Onda 137 levou o
 *    contador de incidentes para a sidebar, mas quem opera pelo telefone —
 *    justamente quem é acordado pelo pager — continuava sem nenhum sinal.
 * 3. **Ponto de status engolido.** `statusColor && !badge` usava `!badge`,
 *    então um badge legítimo de valor `0` (falsy) fazia badge e bolinha
 *    aparecerem em disputa pelo mesmo canto.
 *
 * A regra aqui é declarativa e testável sem React: recebe o status agregado e
 * devolve, por categoria, o que desenhar. A renderização vira burra de
 * propósito — decisões de contagem não pertencem ao JSX.
 *
 * ## Invariantes varridas pelos testes
 *   B1  "monitoring" com frota cadastrada sempre renderiza `online/total`,
 *       inclusive quando `online === 0`
 *   B2  frota vazia (`total === 0`) nunca renderiza contador
 *   B3  o tom de "monitoring" acompanha a razão online/total (>=0.8 ok,
 *       >=0.5 atenção, abaixo disso crítico)
 *   B4  "security" só aparece com alertas não lidos; >5 é crítico
 *   B5  "settings" carrega o contador de manutenção e só para admin
 *   B6  crítico de manutenção pinta `destructive`; teto do escalonamento pulsa
 *   B7  todo descritor visível tem `srLabel` não vazio citando a contagem
 *   B8  badge e ponto de status são mutuamente exclusivos, sempre
 */

import { shouldRenderNavBadge, formatNavBadge, type NavBadgeValue } from './navBadge';
import { buildMaintenanceNavBadge } from '@/lib/maintenance/maintenanceNavBadge';

export type BottomNavTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface BottomNavBadgeDescriptor {
  /** Texto já formatado; `null` quando nenhum contador deve aparecer. */
  readonly text: string | null;
  /** Ponto de status; só existe quando não há contador (invariante B8). */
  readonly dot: BottomNavTone | null;
  readonly tone: BottomNavTone;
  readonly pulse: boolean;
  /** Rótulo acessível — sempre presente quando algo é desenhado. */
  readonly srLabel: string;
}

export interface BottomNavStatusInput {
  readonly unreadAlerts: number;
  readonly onlineCameras: number;
  readonly totalCameras: number;
  readonly registeredPersons: number;
  readonly openMaintenanceAlerts: number;
  readonly openMaintenanceCritical: number;
  readonly maintenanceAtCeiling: number;
}

const EMPTY: BottomNavBadgeDescriptor = {
  text: null,
  dot: null,
  tone: 'neutral',
  pulse: false,
  srLabel: '',
};

/** Normaliza contagens vindas de queries: NaN/negativo/fracionário viram inteiro >= 0. */
function count(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value as number)) : 0;
}

function make(
  badge: NavBadgeValue,
  tone: BottomNavTone,
  srLabel: string,
  pulse = false,
): BottomNavBadgeDescriptor {
  if (!shouldRenderNavBadge(badge)) return EMPTY;
  const text = formatNavBadge(badge);
  if (text.length === 0) return EMPTY;
  return { text, dot: null, tone, pulse, srLabel };
}

function dotOnly(tone: BottomNavTone, srLabel: string): BottomNavBadgeDescriptor {
  return { text: null, dot: tone, tone, pulse: false, srLabel };
}

/**
 * Tom da frota. A razão é calculada só com `total > 0`; frota vazia não é
 * "crítica", é "ainda não configurada" — pintar de vermelho um sistema recém
 * instalado treina o operador a ignorar vermelho.
 */
export function fleetTone(online: number, total: number): BottomNavTone {
  if (total <= 0) return 'neutral';
  const ratio = Math.min(1, online / total);
  if (ratio >= 0.8) return 'success';
  if (ratio >= 0.5) return 'warning';
  return 'danger';
}

export function buildBottomNavBadge(
  categoryId: string,
  status: BottomNavStatusInput,
  isAdmin: boolean,
): BottomNavBadgeDescriptor {
  switch (categoryId) {
    case 'monitoring': {
      const total = count(status.totalCameras);
      if (total === 0) return EMPTY; // B2
      const online = Math.min(count(status.onlineCameras), total);
      const tone = fleetTone(online, total);
      // B1 — rótulo textual: `0/60` é informação, não ausência de informação.
      return make(
        `${online}/${total}`,
        tone,
        `${online} de ${total} câmeras online`,
      );
    }

    case 'security': {
      const unread = count(status.unreadAlerts);
      if (unread === 0) return dotOnly('success', 'Nenhum alerta não lido');
      return make(
        unread,
        unread > 5 ? 'danger' : 'warning',
        `${unread} ${unread === 1 ? 'alerta não lido' : 'alertas não lidos'}`,
      );
    }

    case 'management': {
      const people = count(status.registeredPersons);
      return make(people, 'neutral', `${people} pessoas cadastradas`);
    }

    case 'settings': {
      // B5/B6 — reaproveita a mesma regra da sidebar; nada de segunda verdade.
      const maintenance = buildMaintenanceNavBadge(
        {
          open: count(status.openMaintenanceAlerts),
          openCritical: count(status.openMaintenanceCritical),
          atCeiling: count(status.maintenanceAtCeiling),
        },
        isAdmin,
      );
      if (maintenance.badge === undefined) return EMPTY;
      return make(
        maintenance.badge,
        maintenance.variant === 'destructive' ? 'danger' : 'warning',
        maintenance.srLabel,
        maintenance.pulse,
      );
    }

    default:
      return EMPTY;
  }
}
