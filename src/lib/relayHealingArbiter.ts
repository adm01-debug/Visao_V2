/**
 * Onda 123 — Árbitro entre a escada de cura (Onda 115/118) e a saúde de
 * reentrega (Onda 122).
 *
 * Contexto do problema:
 * as duas ondas anteriores produziram sinais que nunca se falam, e o silêncio
 * entre elas cria dois erros simétricos — um de omissão, outro de comissão.
 *
 * **G1 — o agente meia-boca é invisível.** A escada da Onda 115 só enxerga
 * duas coisas: heartbeat atrasado e tarefa sem resposta com janela justa. Um
 * agente que bate heartbeat pontualmente e responde *todas* as tarefas — mas
 * só na segunda ou terceira reentrega — é `none` para a escada. A Onda 122
 * enxerga esse agente (piso de Wilson alto), mas só sabe reclamar no
 * barramento de alertas: nenhuma evidência é gravada na trilha de cura, e o
 * episódio nunca entra no histórico do agente.
 *
 * **G2 — reinício aplicado ao diagnóstico errado.** O inverso é pior. Quando
 * a Onda 116 já atribuiu a degradação a uma causa externa (relógio de câmera
 * fora, saturação de partição, link do site), reiniciar o agente é a ação
 * mais destrutiva possível: derruba os streams que ainda funcionavam, zera a
 * contagem de tentativas e o problema real segue intacto. A escada, sozinha,
 * não tem como saber disso.
 *
 * A regra que unifica os dois: **reinício exige que o agente seja o suspeito
 * mais provável; qualquer prova de vida ou de causa externa rebaixa a ação
 * para observação, nunca a suprime.** Rebaixar não é silenciar — a evidência
 * continua sendo gravada e alertada; o que se perde é apenas a permissão de
 * derrubar o processo.
 *
 * Ação nova introduzida aqui: `observe`. Não é invasiva, não consome orçamento
 * de reinício (Onda 118) e não conta como tentativa na escada — ela existe
 * para que a decisão de *não* agir também deixe rastro auditável.
 *
 * Invariantes garantidas (varridas por `scripts/simulate-wave123-scenarios.mjs`):
 *   I1  o árbitro nunca eleva a invasividade acima do que a escada pediu
 *       (exceto `none` → `observe`, que não toca no agente)
 *   I2  causa externa atribuída ⇒ nunca `restart`
 *   I3  prova de vida na janela (entregas > 0) e severidade apenas `warning`
 *       ⇒ nunca `restart`
 *   I4  `escalate` é preservado: esgotar tentativas é fato da escada, e o
 *       árbitro não devolve autonomia a quem já foi escalado
 *   5.  toda decisão que difere da escada carrega motivo legível
 *   I6  idempotência e pureza: mesma entrada ⇒ mesma saída
 *   I7  monotonicidade: agravar o sinal de reentrega nunca reduz a severidade
 *   I8  a severidade final nunca é menor que a da escada
 */

import type { AgentHealingAction, AgentHealingSeverity } from './agentHealing';
import type { RedeliverySeverity } from './relayRedeliveryHealth';

/** Escada da Onda 115 mais a decisão não invasiva introduzida aqui. */
export type ArbitratedAction = AgentHealingAction | 'observe';

const INVASIVENESS: Record<ArbitratedAction, number> = {
  none: 0,
  observe: 1,
  nudge: 2,
  restart: 3,
  escalate: 4,
};

const SEVERITY_RANK: Record<AgentHealingSeverity, number> = {
  ok: 0,
  warning: 1,
  critical: 2,
};

const REDELIVERY_RANK: Record<RedeliverySeverity, number> = {
  none: 0,
  warning: 1,
  critical: 2,
};

export interface ArbiterFacts {
  readonly agentId: string;
  /** Veredito da escada de auto-cura (Onda 115 + admissão da Onda 118). */
  readonly healingAction: AgentHealingAction;
  readonly healingSeverity: AgentHealingSeverity;
  /** Veredito estatístico de reentrega (Onda 122). */
  readonly redeliverySeverity: RedeliverySeverity;
  /** Entregas imputáveis na janela da Onda 122 — prova de vida quantitativa. */
  readonly deliveries: number;
  /**
   * `true` quando a Onda 116 atribuiu a degradação deste agente a uma causa
   * externa (relógio de câmera, saturação de partição, incidente de site).
   */
  readonly externalRootCause: boolean;
}

export interface ArbiterVerdict {
  readonly agentId: string;
  readonly action: ArbitratedAction;
  readonly severity: AgentHealingSeverity;
  /** `true` quando o árbitro alterou o que a escada havia decidido. */
  readonly overridden: boolean;
  readonly reason: string;
}

/**
 * Combina os três sinais em uma decisão única. Função pura: nenhuma leitura de
 * relógio, nenhum acesso a banco — o SQL espelha esta régua e o gate de CI
 * compara as duas pontas.
 */
export function arbitrate(facts: ArbiterFacts): ArbiterVerdict {
  const deliveries = Math.max(0, Math.floor(facts.deliveries));
  const redeliveryRank = REDELIVERY_RANK[facts.redeliverySeverity];

  // A severidade só sobe: a reentrega é um sinal independente da escada, e o
  // agente meia-boca (G1) só existe porque a escada o classifica como saudável.
  const severity: AgentHealingSeverity =
    SEVERITY_RANK[facts.healingSeverity] >= redeliveryRank
      ? facts.healingSeverity
      : redeliveryRank === 2
        ? 'critical'
        : 'warning';

  const keep = (action: ArbitratedAction, reason: string, overridden: boolean): ArbiterVerdict => ({
    agentId: facts.agentId,
    action,
    severity,
    overridden,
    reason,
  });

  // R0 — escalar é fato consumado da escada (tentativas esgotadas). Devolver
  // autonomia aqui reabriria o ciclo de reinício que a escada já encerrou.
  if (facts.healingAction === 'escalate') {
    return keep('escalate', 'tentativas de cura esgotadas pela escada; caso é humano', false);
  }

  // R1 — causa externa atribuída (Onda 116) veta qualquer ação invasiva.
  if (facts.externalRootCause) {
    if (INVASIVENESS[facts.healingAction] >= INVASIVENESS.restart) {
      return keep(
        'observe',
        'causa raiz externa atribuída a este episódio: reinício derrubaria streams sem tocar no defeito real',
        true,
      );
    }
    if (facts.healingAction === 'none' && redeliveryRank > 0) {
      return keep(
        'observe',
        'reentrega acima do esperado, porém já explicada por causa raiz externa',
        true,
      );
    }
    return keep(facts.healingAction, 'ação não invasiva mantida sob causa raiz externa', false);
  }

  // R2 — G2 na forma branda: o agente entregou nesta janela. Prova de vida com
  // severidade apenas de aviso não sustenta derrubar o processo.
  if (facts.healingAction === 'restart' && deliveries > 0 && severity !== 'critical') {
    return keep(
      'nudge',
      `agente concluiu ${deliveries} entrega(s) na janela: prova de vida rebaixa o reinício a sondagem`,
      true,
    );
  }

  // R3 — G1: invisível para a escada, denunciado pela estatística de reentrega.
  if (facts.healingAction === 'none' && redeliveryRank > 0) {
    return keep(
      'observe',
      facts.redeliverySeverity === 'critical'
        ? 'heartbeat saudável, mas a fila só fecha por reentrega: degradação real fora do alcance da escada'
        : 'heartbeat saudável com reentrega acima do esperado: episódio registrado para acompanhamento',
      true,
    );
  }

  return keep(facts.healingAction, 'decisão da escada de cura mantida', false);
}

/** Ações que o orçamento de reinício da Onda 118 precisa contabilizar. */
export function consumesRestartBudget(action: ArbitratedAction): boolean {
  return action === 'restart';
}
