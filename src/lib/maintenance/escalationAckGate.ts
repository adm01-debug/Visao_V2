/**
 * Onda 249 — **A escada também esquece o reconhecimento.**
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 248 provou que reconhecer não conserta: a acusação de mudez passou a
 * contar *entrega ausente* e o reconhecimento de condição persistente ganhou
 * uma **janela de promessa** que decai. Só que a correção parou na
 * contabilidade. A **escada de escalonamento** — o mecanismo que existe
 * justamente para o caso "ninguém pegou o incidente" — continuou lendo
 * reconhecimento como um interruptor permanente:
 *
 * ```sql
 *   WHERE e.acknowledged_at IS NULL   -- em escalate_stale_maintenance_alerts
 * ```
 *
 * ```ts
 *   const acknowledged = alert.acknowledgedAtMs !== null;  // I1 — congela
 * ```
 *
 * O resultado é a mesma lavagem da onda anterior, aplicada a outro órgão: um
 * clique em "reconhecer" **desliga a escada para sempre**, mesmo que a
 * condição continue verdadeira daqui a uma semana. O alerta nunca chega ao
 * plantão, nunca vira evento no barramento, e o incidente envelhece com um
 * carimbo de "alguém está olhando" emitido há dez dias.
 *
 * ## A tese
 *
 * Congelar a escada é comprar tempo, e tempo comprado tem preço e prazo. O
 * reconhecimento é uma **promessa de tratamento**, não uma prova dele. Quem
 * encerra a promessa é a **condição**: resolvida, o ack foi cumprido e vale
 * para sempre; ainda viva depois do prazo, a promessa venceu e a escada
 * retoma exatamente de onde parou — nunca do zero, porque o problema também
 * não recomeçou do zero.
 *
 * Este módulo é o **portão** entre a régua de decaimento (Onda 248,
 * `acknowledgementDecay.ts`) e a régua de escada (Onda 117/238,
 * `maintenanceEscalation.ts`). Ele não decide degraus e não mede idade: ele
 * responde uma única pergunta — *este reconhecimento, agora, ainda compra
 * silêncio da escada?* — e diz por quê, com nome.
 *
 * ## Leis (Y1–Y10)
 *
 *  Y1. Reconhecimento congela a escada **por um prazo**, jamais para sempre.
 *      A janela é a mesma da Onda 248 (X8): crítico compra menos silêncio.
 *  Y2. Ack decaído **nunca rebaixa** o degrau já conquistado (X6). A escada
 *      retoma do nível atual; zerar presentearia o defeito persistente com a
 *      paciência reservada ao defeito novo.
 *  Y3. **Condição resolvida honra o ack para sempre.** Prazo vencido com o
 *      problema morto não reabre nada — a régua não persegue fantasma.
 *  Y4. **Agravamento fura o congelamento na hora**, sem esperar prazo: quem
 *      consentiu com um aviso não consentiu com o crítico que veio depois.
 *  Y5. Ack **sem autor legível** nunca congela. Silêncio comprado por ninguém
 *      não é promessa de ninguém.
 *  Y6. Ack decaído **não zera o cooldown** entre degraus. A promessa vencida
 *      devolve a escada ao ponto em que estava, não concede um degrau extra
 *      como compensação.
 *  Y7. Ack decaído **não reancora a idade**. A idade continua contando desde
 *      a criação (ou desde a âncora da condição): reconhecer não rejuvenesce
 *      o incidente.
 *  Y8. Apenas ack **vigente ou honrado** corta a série da condição (âncora
 *      `streak` da Onda 238). Um ack decaído que cortasse a série apagaria a
 *      memória do degrau já atingido — seria o Y2 burlado pela porta dos
 *      fundos.
 *  Y9. **Não conseguir medir a condição nunca honra o ack.** Ignorância
 *      resolve para "ainda persiste", e a promessa segue correndo prazo.
 *  Y10. O portão devolve **estado nomeado** e motivo legível; nunca um
 *      booleano nu. Foi o booleano `reconhecido: sim/não` que criou os dois
 *      defeitos (Ondas 248 e 249) e a régua recusa voltar a ele.
 *
 * Módulo **puro**: sem banco, sem React, sem `Date.now()`. Espelhado em SQL
 * por `public.escalation_ack_gate()`.
 */

import {
  assessAcknowledgement,
  acknowledgementLabel,
  type AcknowledgementState,
  type AlertSeverity,
} from './acknowledgementDecay.ts';

/**
 * Tudo o que a escada precisa saber sobre o reconhecimento de um alerta.
 *
 * Deliberadamente **separado** de `AlertSnapshot`: um chamador que ainda não
 * sabe medir a condição pode omitir o contexto inteiro, e nesse caso a Y9
 * decide por ele (persiste), em vez de o silêncio virar congelamento eterno
 * por omissão.
 */
export interface EscalationAckContext {
  /** Autor do reconhecimento; vazio/`null` invalida (Y5). */
  readonly acknowledgedBy: string | null;
  /** Severidade registrada no instante do ack; `null` quando desconhecida. */
  readonly severityAtAck: AlertSeverity | null;
  /**
   * A condição que originou o alerta ainda é verdadeira **agora**?
   * `null` = não medida → Y9 assume que sim.
   */
  readonly conditionPersists: boolean | null;
  /** Alerta auto-referente (Onda 247)? */
  readonly selfReferential?: boolean;
  /** Cadência da fonte, em minutos — dimensiona a janela (X8). */
  readonly cadenceMinutes?: number;
}

export interface EscalationAckGateInput {
  readonly acknowledgedAtMs: number | null;
  readonly severityNow: AlertSeverity;
  readonly ack?: EscalationAckContext | null;
}

export interface EscalationAckGateVerdict {
  /** Y10 — estado nomeado, herdado da régua da Onda 248. */
  readonly state: AcknowledgementState;
  /** O ack, agora, congela a escada? */
  readonly freezesLadder: boolean;
  /** Y8 — o ack corta a série da condição (âncora `streak`)? */
  readonly cutsStreak: boolean;
  /**
   * `true` quando houve reconhecimento e ele **perdeu** a validade — o caso
   * que a Onda 249 existe para tornar visível. Distinto de "nunca
   * reconhecido": um é promessa quebrada, o outro é ausência de promessa.
   */
  readonly decayed: boolean;
  /** Minutos restantes de congelamento; `null` quando não se aplica. */
  readonly minutesRemaining: number | null;
  readonly windowMinutes: number;
  readonly reason: string;
}

/**
 * Estados em que o reconhecimento ainda vale como consentimento vivo.
 * `honored` entra porque a condição morreu (Y3): não há o que escalar.
 */
const LIVE_STATES: ReadonlySet<AcknowledgementState> = new Set<AcknowledgementState>([
  'pending',
  'honored',
]);

/**
 * Estados que representam uma promessa **quebrada ou inválida**, e portanto
 * devolvem o alerta à escada. `none` não entra: nunca houve promessa.
 */
const BROKEN_STATES: ReadonlySet<AcknowledgementState> = new Set<AcknowledgementState>([
  'expired',
  'void_aggravated',
  'void_unattributed',
]);

/**
 * Avalia se o reconhecimento ainda compra silêncio da escada.
 *
 * Nunca lança para entradas plausíveis; cadência inválida propaga o
 * `RangeError` da Onda 248 de propósito — uma cadência absurda é defeito de
 * configuração, e engoli-la produziria janela silenciosamente errada.
 */
export function escalationAckGate(
  input: EscalationAckGateInput,
  nowMs: number
): EscalationAckGateVerdict {
  const ack = input.ack ?? null;

  const verdict = assessAcknowledgement(
    {
      acknowledgedAtMs: input.acknowledgedAtMs,
      // Y5 x compatibilidade: quando NÃO há contexto algum, o ack existe e é
      // atribuído por definição (a coluna `acknowledged_by` do banco é NOT
      // NULL na prática); é a condição que fica desconhecida, e a Y9 cuida
      // dela. Só um contexto **presente e vazio** invalida por autoria.
      acknowledgedBy: ack === null ? 'desconhecido' : ack.acknowledgedBy,
      severityAtAck: ack?.severityAtAck ?? null,
      severityNow: input.severityNow,
      // Y9 — ignorância nunca honra.
      conditionPersists: ack === null ? null : ack.conditionPersists,
      selfReferential: ack?.selfReferential ?? false,
      cadenceMinutes: ack?.cadenceMinutes,
    },
    nowMs
  );

  const live = LIVE_STATES.has(verdict.state);
  const broken = BROKEN_STATES.has(verdict.state);

  return {
    state: verdict.state,
    // Y1/Y3/Y4/Y5 — congela só enquanto a promessa vale (ou a condição morreu).
    freezesLadder: live,
    // Y8 — só promessa viva corta a série; a quebrada preserva a memória.
    cutsStreak: live,
    decayed: broken,
    minutesRemaining: verdict.minutesRemaining,
    windowMinutes: verdict.windowMinutes,
    reason: broken
      ? `${acknowledgementLabel(verdict.state)} — ${verdict.reason}; escada retomada do degrau atual`
      : verdict.reason,
  };
}

/**
 * Frase curta para a UI e para o `reason` do degrau. Mantida aqui (e não no
 * componente) porque o texto é parte do contrato auditável: o operador tem de
 * conseguir ler no console a mesma justificativa que ficou gravada na trilha.
 */
export function escalationAckLabel(verdict: EscalationAckGateVerdict): string {
  switch (verdict.state) {
    case 'none':
      return 'sem reconhecimento';
    case 'pending':
      return `congelada por ${verdict.minutesRemaining ?? 0} min (promessa vigente)`;
    case 'honored':
      return 'congelada — condição resolvida';
    case 'expired':
      return `promessa de ${verdict.windowMinutes} min vencida — escada retomada`;
    case 'void_aggravated':
      return 'agravamento após o reconhecimento — escada retomada';
    case 'void_unattributed':
      return 'reconhecimento sem autor — escada nunca congelou';
  }
}
