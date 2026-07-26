/**
 * Onda 139 — contador da rede colaborativa na navegação.
 *
 * ## O problema que este módulo resolve
 *
 * A Onda 130 entregou a caixa de entrada e a Onda 131 o silenciamento, mas o
 * único caminho até esses avisos era abrir `/rede-colaborativa` por vontade
 * própria. Isso é especialmente ruim aqui porque um subconjunto dos avisos tem
 * **prazo**: um `invite_received` expira sozinho (Onda 128) e um
 * `membership_removed` significa que a organização perdeu acesso agora. Um
 * aviso com prazo que ninguém é convidado a ver é um aviso que vai vencer.
 *
 * ## Por que "não lidos" não bastava
 *
 * A contagem plana da Onda 131 tratava igual duas coisas muito diferentes:
 *
 *  - **informativo** — "fulano aceitou", "membro reintegrado": pode esperar, e
 *    inclusive pode ser silenciado pelo usuário;
 *  - **acionável** — convite recebido, remoção de participação: nunca é
 *    silenciável (regra do banco, `collab_notification_silenceable`) e alguém
 *    precisa responder.
 *
 * Seis informativos produziam o mesmo "6" discreto que um convite prestes a
 * vencer. A Onda 139 estendeu `collab_unread_counts` com `actionable`,
 * `critical` e `oldest_unread_at`, e este módulo transforma isso em decisão de
 * exibição — sem inventar uma segunda classificação no cliente: acionável é o
 * que o banco disse que é acionável.
 *
 * ## Regras
 *
 *  - Silenciado **não** conta. Silenciar é uma escolha explícita do usuário e
 *    desrespeitá-la no badge destruiria a confiança no próprio recurso.
 *  - Zero visível = sem badge. Badge permanente vira paisagem.
 *  - Acionável define o tom: `destructive` quando há crítico, `warning` quando
 *    há acionável não crítico, `default` para o resto.
 *  - O badge **pulsa** quando existe acionável esperando há mais que
 *    `STALE_ACTIONABLE_HOURS` — o análogo colaborativo do "teto do
 *    escalonamento" da manutenção: ninguém mais vai lembrar o usuário.
 *  - Somar organizações é correto porque a navegação é global; o detalhe por
 *    organização continua na página.
 *
 * ## Invariantes varridas pelos testes
 *   C1  lista vazia (ou nula) nunca produz badge
 *   C2  o valor exibido é exatamente a soma de `unread` de todas as orgs
 *   C3  `silenced` jamais influencia valor, tom ou pulso
 *   C4  crítico > 0 ⇔ tom `destructive`; acionável sem crítico ⇔ `warning`
 *   C5  `actionable <= unread` é saneado (dados inconsistentes não vazam)
 *   C6  pulso exige acionável **e** idade acima do limiar — nunca só idade
 *   C7  `srLabel` sempre cita a contagem exibida e nunca fica vazio quando visível
 *   C8  datas inválidas/futuras nunca produzem pulso nem NaN
 */

export type CollabNavTone = 'default' | 'warning' | 'destructive';

/** Acima disso, um item que exige resposta está velho o bastante para insistir. */
export const STALE_ACTIONABLE_HOURS = 24;

export interface CollabUnreadRow {
  readonly organization_id: string;
  readonly unread: number;
  readonly silenced: number;
  readonly actionable: number;
  readonly critical: number;
  readonly oldest_unread_at: string | null;
}

export interface CollabUnreadSummary {
  readonly unread: number;
  readonly silenced: number;
  readonly actionable: number;
  readonly critical: number;
  /** Idade em horas do item visível mais antigo; `null` se não houver. */
  readonly oldestAgeHours: number | null;
  readonly organizations: number;
}

export interface CollabNavBadge {
  readonly badge: number | undefined;
  readonly tone: CollabNavTone;
  readonly pulse: boolean;
  readonly srLabel: string;
}

const EMPTY_SUMMARY: CollabUnreadSummary = {
  unread: 0,
  silenced: 0,
  actionable: 0,
  critical: 0,
  oldestAgeHours: null,
  organizations: 0,
};

const HIDDEN: CollabNavBadge = {
  badge: undefined,
  tone: 'default',
  pulse: false,
  srLabel: 'Nenhum aviso novo da rede colaborativa',
};

/** Inteiro >= 0 tolerante a `null`, `NaN`, fracionário e negativo. */
function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

/**
 * Idade em horas de um timestamp ISO. Devolve `null` para entrada ausente,
 * inválida ou no futuro — relógio adiantado de servidor não pode virar
 * "esperando há -3 horas" e muito menos NaN dentro de uma comparação.
 */
export function ageInHours(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (typeof iso !== 'string' || iso.trim().length === 0) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  const diffMs = now.getTime() - ts;
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;
  return diffMs / 3_600_000;
}

/** Agrega as linhas por organização em um único retrato para a navegação. */
export function summarizeCollabUnread(
  rows: readonly CollabUnreadRow[] | null | undefined,
  now: Date = new Date(),
): CollabUnreadSummary {
  if (!Array.isArray(rows) || rows.length === 0) return EMPTY_SUMMARY;

  let unread = 0;
  let silenced = 0;
  let actionable = 0;
  let critical = 0;
  let oldestAgeHours: number | null = null;
  let organizations = 0;

  for (const row of rows) {
    if (!row) continue;
    organizations += 1;
    const rowUnread = count(row.unread);
    unread += rowUnread;
    silenced += count(row.silenced);
    // C5 — o banco garante `actionable <= unread`, mas o cliente não confia em
    // garantia remota: saturar aqui evita "8 de 3 exigem ação" na tela.
    actionable += Math.min(count(row.actionable), rowUnread);
    critical += Math.min(count(row.critical), rowUnread);

    const age = ageInHours(row.oldest_unread_at, now);
    if (age !== null && (oldestAgeHours === null || age > oldestAgeHours)) {
      oldestAgeHours = age;
    }
  }

  return { unread, silenced, actionable, critical, oldestAgeHours, organizations };
}

export function buildCollabNavBadge(
  summary: CollabUnreadSummary | null | undefined,
  staleHours: number = STALE_ACTIONABLE_HOURS,
): CollabNavBadge {
  if (!summary) return HIDDEN;

  const unread = count(summary.unread);
  if (unread === 0) return HIDDEN; // C1/C3 — silenciado sozinho nunca acende nada.

  const actionable = Math.min(count(summary.actionable), unread);
  const critical = Math.min(count(summary.critical), unread);
  const threshold = Number.isFinite(staleHours) && staleHours > 0 ? staleHours : STALE_ACTIONABLE_HOURS;
  const age = typeof summary.oldestAgeHours === 'number' && Number.isFinite(summary.oldestAgeHours)
    ? summary.oldestAgeHours
    : null;

  // C6 — idade sozinha não insiste: um informativo velho é só um informativo.
  const pulse = actionable > 0 && age !== null && age >= threshold;

  const tone: CollabNavTone = critical > 0 ? 'destructive' : actionable > 0 ? 'warning' : 'default';

  const parts = [`${unread} ${unread === 1 ? 'aviso novo' : 'avisos novos'} da rede colaborativa`];
  if (actionable > 0) {
    parts.push(`${actionable} ${actionable === 1 ? 'exige resposta' : 'exigem resposta'}`);
  }
  if (pulse && age !== null) {
    parts.push(`o mais antigo aguarda há ${Math.floor(age)}h`);
  }

  return { badge: unread, tone, pulse, srLabel: parts.join('; ') };
}
