/**
 * Onda 122 — Saúde de reentrega da fila de relay (observabilidade honesta).
 *
 * A Onda 121 tornou a fila resiliente: lease com prazo, reentrega com recuo e
 * teto de tentativas. O efeito colateral é que a fila passou a **absorver
 * silenciosamente** um agente doente. Antes, um agente que morria no meio da
 * execução deixava rastro de tarefa expirada; agora a tarefa é reentregue, na
 * maioria das vezes conclui, e ninguém percebe que aquele agente exige o dobro
 * de entregas para produzir o mesmo trabalho. A resiliência virou um cobertor
 * sobre a falha — o oposto de observabilidade.
 *
 * Esta onda mede a *taxa de reentrega* por agente e a transforma em alerta de
 * manutenção. Três armadilhas estatísticas guiaram o desenho:
 *
 *  D1 — **Amostra pequena mente.** Um agente com 2 tarefas, uma reentregue,
 *  tem taxa de 50% — e não significa absolutamente nada. Usar a proporção crua
 *  produz alarme falso justamente nos agentes menos usados. Corrigimos com o
 *  **limite inferior do intervalo de Wilson** (95%): a pior taxa plausível
 *  dado o tamanho da amostra. Com n pequeno o limite inferior desaba para
 *  perto de zero e o agente não é acusado; com n grande ele converge para a
 *  proporção observada.
 *
 *  D2 — **Oscilação no limiar.** Uma taxa que passeia em torno do corte gera
 *  alerta/silêncio/alerta. Aplicamos **histerese**: sobe-se de nível no limiar
 *  de entrada e só se desce abaixo do limiar de saída (entrada menos a folga).
 *
 *  D3 — **Culpa mal atribuída.** Reentrega causada por encerramento nosso
 *  (`task_expired_deadline`, abandono do backend) não é sintoma do agente.
 *  Só contam como reentrega os ciclos em que o agente recebeu o lease e ficou
 *  em silêncio — a mesma régua de justiça das Ondas 119/120.
 *
 * Invariantes verificadas pelo simulador e pelo gate:
 *
 *  I1  Amostra abaixo de `minSamples` nunca gera severidade (nem warning).
 *  I2  O limite inferior de Wilson nunca excede a proporção observada.
 *  I3  Zero reentregas ⇒ severidade 'none', qualquer que seja n.
 *  I4  A severidade é monotônica não decrescente na contagem de reentregas
 *      (mantidos n e estado anterior).
 *  I5  Histerese: partindo de um nível, a saída exige cair abaixo do limiar de
 *      entrada menos a folga — nunca há salto de dois níveis para baixo em um
 *      passo dentro da zona de folga.
 *  I6  Função pura: mesmo estado ⇒ mesmo veredito (idempotência do avaliador).
 */

/** Severidade do veredito, alinhada a `maintenance_alert_events.severity`. */
export type RedeliverySeverity = 'none' | 'warning' | 'critical';

/** Política de avaliação. Espelhada em SQL — mudou aqui, mude lá. */
export interface RedeliveryPolicy {
  /** Mínimo de tarefas concluídas na janela para emitir qualquer veredito. */
  readonly minSamples: number;
  /** Limite inferior de Wilson que dispara `warning`. */
  readonly warnRate: number;
  /** Limite inferior de Wilson que dispara `critical`. */
  readonly criticalRate: number;
  /** Folga de histerese subtraída do limiar na descida. */
  readonly hysteresis: number;
  /** Janela de observação, em horas. */
  readonly windowHours: number;
}

export const DEFAULT_REDELIVERY_POLICY: RedeliveryPolicy = {
  minSamples: 20,
  warnRate: 0.15,
  criticalRate: 0.35,
  hysteresis: 0.05,
  windowHours: 6,
};

/** z para 95% unilateral-ish (padrão de Wilson bilateral 95%). */
const WILSON_Z = 1.959963984540054;

/**
 * Limite inferior do intervalo de Wilson para uma proporção. Escolhido no
 * lugar do intervalo normal (Wald) porque Wald degenera para largura zero
 * quando a proporção observada é 0 ou 1 — exatamente os casos de fila.
 */
export function wilsonLowerBound(successes: number, total: number, z: number = WILSON_Z): number {
  if (total <= 0) return 0;
  const k = Math.min(Math.max(successes, 0), total);
  const p = k / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  const lower = (center - margin) / denom;
  return Math.min(Math.max(lower, 0), 1);
}

/** Contagens observadas para um agente na janela. */
export interface RedeliveryFacts {
  readonly agentId: string;
  /** Ciclos de entrega totais (tarefas encerradas na janela). */
  readonly deliveries: number;
  /**
   * Ciclos em que houve reentrega imputável ao agente (lease vencido em
   * silêncio). Encerramentos administrativos NÃO entram aqui (D3).
   */
  readonly redeliveries: number;
  /** Severidade vigente do agente, para aplicar histerese. */
  readonly previousSeverity: RedeliverySeverity;
}

export interface RedeliveryVerdict {
  readonly agentId: string;
  readonly severity: RedeliverySeverity;
  /** Proporção crua observada (apenas informativa). */
  readonly observedRate: number;
  /** Pior taxa plausível — base da decisão. */
  readonly lowerBound: number;
  readonly reason: string;
}

const RANK: Record<RedeliverySeverity, number> = { none: 0, warning: 1, critical: 2 };

/**
 * Limiar efetivo de um nível, considerando histerese: para *permanecer* em um
 * nível já ativo basta ficar acima do limiar reduzido pela folga.
 */
function effectiveThreshold(
  target: RedeliverySeverity,
  previous: RedeliverySeverity,
  policy: RedeliveryPolicy
): number {
  const base = target === 'critical' ? policy.criticalRate : policy.warnRate;
  return RANK[previous] >= RANK[target] ? Math.max(0, base - policy.hysteresis) : base;
}

/** Avalia um agente. Função pura (I6). */
export function evaluateRedelivery(
  facts: RedeliveryFacts,
  policy: RedeliveryPolicy = DEFAULT_REDELIVERY_POLICY
): RedeliveryVerdict {
  const deliveries = Math.max(0, Math.floor(facts.deliveries));
  const redeliveries = Math.min(Math.max(0, Math.floor(facts.redeliveries)), deliveries);
  const observedRate = deliveries > 0 ? redeliveries / deliveries : 0;
  const lowerBound = wilsonLowerBound(redeliveries, deliveries);

  const base = { agentId: facts.agentId, observedRate, lowerBound };

  // I1 — amostra insuficiente jamais acusa.
  if (deliveries < policy.minSamples) {
    return {
      ...base,
      severity: 'none',
      reason: `amostra insuficiente (${deliveries}/${policy.minSamples} entregas na janela)`,
    };
  }

  // I3 — nenhuma reentrega imputável, nenhum veredito.
  if (redeliveries === 0) {
    return { ...base, severity: 'none', reason: 'nenhuma reentrega imputável ao agente na janela' };
  }

  if (lowerBound >= effectiveThreshold('critical', facts.previousSeverity, policy)) {
    return {
      ...base,
      severity: 'critical',
      reason:
        `reentrega imputável em ${(observedRate * 100).toFixed(1)}% de ${deliveries} entregas ` +
        `(piso estatístico ${(lowerBound * 100).toFixed(1)}%) — agente entrega pela metade`,
    };
  }

  if (lowerBound >= effectiveThreshold('warning', facts.previousSeverity, policy)) {
    return {
      ...base,
      severity: 'warning',
      reason:
        `reentrega imputável em ${(observedRate * 100).toFixed(1)}% de ${deliveries} entregas ` +
        `(piso estatístico ${(lowerBound * 100).toFixed(1)}%) — degradação em curso`,
    };
  }

  return {
    ...base,
    severity: 'none',
    reason: `taxa dentro do esperado (piso estatístico ${(lowerBound * 100).toFixed(1)}%)`,
  };
}
