/**
 * Onda 248 — **Reconhecer não é consertar.**
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 247 levou a mudez do despachante ao barramento. Mas a auditoria que
 * abriu esta onda encontrou um buraco mais grave, e mais antigo, no próprio
 * conceito de reconhecimento:
 *
 * ```
 *   críticos (90d)          216
 *   jamais entregues        216   ← nenhuma notificação externa saiu, nunca
 *   já reconhecidos           7   ← "tratados" sem que ninguém fosse avisado
 * ```
 *
 * O veredito de entregabilidade contava "críticos abertos" como
 * `acknowledged_at IS NULL`. Isso significa que **reconhecer os alertas no
 * console reduz a acusação de mudez** — bastaria um admin marcar os 209
 * restantes como vistos para o despachante mudo cair de `critical` para
 * `warning`, sem que uma única mensagem tivesse saído. A métrica que deveria
 * medir *dano externo* estava sendo apagada por um *gesto interno*. Isso é
 * lavagem de acusação: o número que sustenta a prova é destruído pela pessoa
 * que a prova acusa.
 *
 * Há um segundo defeito, gêmeo do primeiro. Reconhecimento é permanente:
 * `acknowledged_at` congela a escada para sempre. Para uma condição
 * **transitória** isso é correto — alguém viu, tratou, acabou. Para uma
 * condição **persistente e medível** (o canal continua ausente agora, neste
 * segundo) o reconhecimento vira um botão de desligar o alarme de incêndio
 * enquanto o fogo queima. O operador não mentiu: ele viu. Mas ver não apaga.
 *
 * ## A tese
 *
 * Reconhecimento é uma afirmação sobre **atenção humana**, nunca sobre o
 * **estado do mundo**. As duas coisas têm donos diferentes: a atenção é
 * declarada por uma pessoa; o estado é medido pelo sistema. Um sistema que
 * deixa a declaração sobrescrever a medição perdeu a capacidade de discordar
 * do seu operador — e um supervisor que não pode discordar não supervisiona.
 *
 * Daí a **janela de promessa**: reconhecer uma condição persistente compra
 * silêncio por um prazo, não para sempre. Vencido o prazo com a condição
 * ainda verdadeira, o reconhecimento **decai** e a acusação volta — sem
 * perder o degrau de escada já conquistado, porque o problema nunca foi
 * embora.
 *
 * ## Leis (X1–X10)
 *
 *  X1. Reconhecimento afirma atenção, **jamais** remediação. Nenhum veredito
 *      derivado desta régua pode dizer "resolvido" por causa de um ack.
 *  X2. **A acusação conta dano, não desatenção.** Críticos sem aviso são os
 *      que nunca foram *entregues*, não os que não foram *reconhecidos*.
 *      Reconhecer nunca reduz a contagem que sustenta a prova.
 *  X3. Quando a condição é medível e **persiste**, o ack tem validade
 *      limitada (janela de promessa). Vencida, decai para `expired`.
 *  X4. **Quem encerra a validade é a condição, não o relógio.** Condição
 *      resolvida honra o ack para sempre (`honored`), mesmo vencido o prazo.
 *      O prazo só importa enquanto o defeito ainda existe.
 *  X5. **Agravamento invalida o ack** (`void_aggravated`). Reconhecer um
 *      `warning` nunca compra silêncio sobre o `critical` que veio depois:
 *      o operador consentiu com um fato menor do que o atual.
 *  X6. Ack decaído **nunca rebaixa o degrau** da escada já atingido. O
 *      problema não recomeçou; ele nunca parou. Zerar o degrau presentearia
 *      o defeito persistente com a mesma paciência do defeito novo.
 *  X7. Ack de alerta **auto-referente** (Onda 247 — o aviso que não sai por
 *      canal externo) nunca pinta a rotina como saudável, em nenhum estado.
 *  X8. A janela de promessa deriva da severidade, entre piso e teto. Crítico
 *      compra menos silêncio que aviso: a urgência encurta a paciência.
 *  X9. Ack **sem autor legível** é `void_unattributed`. Silêncio comprado por
 *      ninguém não é consentimento; mas também nunca é tratado como "não
 *      reconhecido" em silêncio — o defeito de atribuição é declarado.
 *  X10. Todo estado é **nomeado e distinguível**: `none`, `pending`,
 *      `honored`, `expired`, `void_aggravated`, `void_unattributed`. Um
 *      booleano `reconhecido: sim/não` foi exatamente o que permitiu o
 *      defeito; a régua recusa voltar a ele.
 *
 * Módulo **puro**: não conhece banco, React nem relógio global. É a fonte da
 * verdade espelhada por `public.acknowledgement_state()` e
 * `public.undelivered_critical_count()`.
 */

/** Severidade aceita pelo barramento de manutenção. */
export type AlertSeverity = 'warning' | 'critical';

/**
 * X10 — estados nomeados do reconhecimento.
 *
 *  - `none`               — nunca reconhecido.
 *  - `pending`            — reconhecido, dentro da janela, condição persiste.
 *  - `honored`            — condição resolvida: o ack cumpriu seu papel.
 *  - `expired`            — janela vencida com a condição ainda verdadeira.
 *  - `void_aggravated`    — a severidade subiu depois do ack (X5).
 *  - `void_unattributed`  — ack sem autor legível (X9).
 */
export type AcknowledgementState =
  'none' | 'pending' | 'honored' | 'expired' | 'void_aggravated' | 'void_unattributed';

/** Piso e teto da janela de promessa, em minutos. */
export const PROMISE_FLOOR_MINUTES = 30;
export const PROMISE_CEILING_MINUTES = 1440;

/** Janela base por severidade (X8): urgência encurta a paciência. */
const PROMISE_BASE_MINUTES: Record<AlertSeverity, number> = {
  critical: 120,
  warning: 720,
};

/**
 * X8 — janela de promessa derivada da severidade, ajustada pela cadência da
 * fonte (uma condição reavaliada de hora em hora não deve ser reacusada antes
 * de ser remedida), sempre entre piso e teto.
 */
export function promiseWindowMinutes(severity: AlertSeverity, cadenceMinutes: number = 60): number {
  if (!Number.isFinite(cadenceMinutes) || cadenceMinutes <= 0) {
    throw new RangeError(`cadência inválida para janela de promessa: ${cadenceMinutes}`);
  }
  const base = PROMISE_BASE_MINUTES[severity];
  // Nunca reacusar antes de a fonte ter tido ao menos uma nova chance de medir.
  const floor = Math.max(PROMISE_FLOOR_MINUTES, Math.round(cadenceMinutes));
  return Math.min(PROMISE_CEILING_MINUTES, Math.max(floor, base));
}

/** Entrada da avaliação — tudo o que se sabe sobre um reconhecimento. */
export interface AcknowledgementInput {
  /** Instante do ack em ms; `null` quando nunca reconhecido. */
  readonly acknowledgedAtMs: number | null;
  /** Autor do ack; `null`/vazio torna o ack inatribuível (X9). */
  readonly acknowledgedBy: string | null;
  /** Severidade no momento do ack. */
  readonly severityAtAck: AlertSeverity | null;
  /** Severidade agora — pode ter subido desde o ack (X5). */
  readonly severityNow: AlertSeverity;
  /**
   * A condição que originou o alerta ainda é verdadeira **agora**, medida
   * pelo sistema? `null` quando não pôde ser medida — e nesse caso a régua
   * assume persistência (fail-safe: nunca honrar por ignorância).
   */
  readonly conditionPersists: boolean | null;
  /** O alerta é auto-referente (Onda 247)? */
  readonly selfReferential: boolean;
  readonly cadenceMinutes?: number;
}

export interface AcknowledgementVerdict {
  readonly state: AcknowledgementState;
  /** O ack, agora, compra silêncio da escada de escalonamento? */
  readonly suppressesEscalation: boolean;
  /** A rotina pode ser pintada como saudável por causa deste ack? */
  readonly clearsCondition: boolean;
  /** Minutos restantes de validade; `null` quando não se aplica. */
  readonly minutesRemaining: number | null;
  readonly windowMinutes: number;
  readonly reason: string;
}

/** Severidade subiu entre o ack e agora? */
function aggravated(at: AlertSeverity | null, now: AlertSeverity): boolean {
  return at === 'warning' && now === 'critical';
}

/**
 * Avalia o reconhecimento contra o estado medido do mundo.
 *
 * Nunca lança, exceto por cadência inválida (X8). A ausência de informação
 * sempre resolve para o lado conservador: não honra, não limpa, não silencia
 * indefinidamente.
 */
export function assessAcknowledgement(
  input: AcknowledgementInput,
  nowMs: number
): AcknowledgementVerdict {
  const severity = input.severityNow;
  const window = promiseWindowMinutes(severity, input.cadenceMinutes ?? 60);

  // Nunca reconhecido: nada a decidir.
  if (input.acknowledgedAtMs === null || !Number.isFinite(input.acknowledgedAtMs)) {
    return {
      state: 'none',
      suppressesEscalation: false,
      clearsCondition: false,
      minutesRemaining: null,
      windowMinutes: window,
      reason: 'sem reconhecimento registrado',
    };
  }

  // X9 — silêncio comprado por ninguém não é consentimento.
  const author = typeof input.acknowledgedBy === 'string' ? input.acknowledgedBy.trim() : '';
  if (author === '') {
    return {
      state: 'void_unattributed',
      suppressesEscalation: false,
      clearsCondition: false,
      minutesRemaining: null,
      windowMinutes: window,
      reason: 'reconhecimento sem autor legível — não é consentimento válido',
    };
  }

  // X5 — o operador consentiu com um fato menor do que o atual.
  if (aggravated(input.severityAtAck, severity)) {
    return {
      state: 'void_aggravated',
      suppressesEscalation: false,
      clearsCondition: false,
      minutesRemaining: null,
      windowMinutes: window,
      reason:
        'condição agravou de aviso para crítico após o reconhecimento — ' +
        'o consentimento anterior não cobre o fato atual',
    };
  }

  // X4 — quem encerra a validade é a condição, não o relógio. Ignorância
  // (`null`) nunca honra: não medir não é o mesmo que estar resolvido.
  if (input.conditionPersists === false) {
    return {
      state: 'honored',
      suppressesEscalation: true,
      // X7 — auto-referente jamais pinta saúde, mesmo com a condição limpa:
      // a prova de que o canal voltou tem de vir do canal, não do console.
      clearsCondition: !input.selfReferential,
      minutesRemaining: null,
      windowMinutes: window,
      reason: 'condição não persiste — reconhecimento cumprido',
    };
  }

  const elapsed = (nowMs - input.acknowledgedAtMs) / 60_000;
  const remaining = window - elapsed;

  // X3 — vencida a promessa com a condição viva, a acusação volta.
  if (remaining <= 0) {
    return {
      state: 'expired',
      suppressesEscalation: false,
      clearsCondition: false,
      minutesRemaining: 0,
      windowMinutes: window,
      reason:
        `janela de promessa de ${window} min vencida com a condição ainda ativa — ` +
        'reconhecimento decaiu e a acusação voltou',
    };
  }

  // Ack no futuro (relógio adiantado) nunca compra mais silêncio que a janela.
  const clamped = Math.min(remaining, window);

  return {
    state: 'pending',
    suppressesEscalation: true,
    clearsCondition: false, // X1 — atenção nunca é remediação.
    minutesRemaining: Math.max(0, Math.round(clamped)),
    windowMinutes: window,
    reason:
      `reconhecido por ${author}; condição ainda ativa, ` +
      `${Math.max(0, Math.round(clamped))} min restantes de silêncio acordado`,
  };
}

/** Uma linha de alerta crítico, reduzida ao que a contagem de dano exige. */
export interface CriticalAlertRow {
  /** Houve ao menos um despacho com status `sent` para este alerta? */
  readonly delivered: boolean;
  readonly acknowledgedAtMs: number | null;
}

/**
 * X2 — **a acusação conta dano, não desatenção.**
 *
 * Este é o coração corretivo da onda. A contagem que sustenta a acusação de
 * mudez é a de críticos que **nunca foram entregues**, independentemente de
 * terem sido reconhecidos. Reconhecer no console é um gesto interno; ele não
 * avisa o plantonista que está longe do computador, e portanto não pode
 * apagar a prova de que ninguém foi avisado.
 */
export function undeliveredCriticalCount(rows: readonly CriticalAlertRow[]): number {
  let total = 0;
  for (const row of rows) {
    if (!row.delivered) total += 1;
  }
  return total;
}

/**
 * Quantos críticos foram reconhecidos **sem nunca terem sido entregues** —
 * a medida direta da lavagem de acusação. Publicada para que o console possa
 * mostrar o número em vez de escondê-lo.
 */
export function launderedCriticalCount(rows: readonly CriticalAlertRow[]): number {
  let total = 0;
  for (const row of rows) {
    if (!row.delivered && row.acknowledgedAtMs !== null) total += 1;
  }
  return total;
}

const STATE_LABEL: Record<AcknowledgementState, string> = {
  none: 'não reconhecido',
  pending: 'reconhecido (silêncio acordado)',
  honored: 'reconhecido e resolvido',
  expired: 'reconhecimento vencido',
  void_aggravated: 'reconhecimento invalidado por agravamento',
  void_unattributed: 'reconhecimento sem autor',
};

export function acknowledgementLabel(state: AcknowledgementState): string {
  return STATE_LABEL[state];
}
