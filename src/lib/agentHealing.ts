/**
 * Onda 115 — Auto-healing dos agentes locais.
 *
 * Contexto do problema:
 * o agente local (Docker na rede das câmeras) é o único caminho para NVRs e
 * domes que não estão expostos à internet. Quando ele trava — container zumbi,
 * túnel reverso meio-aberto, processo vivo mas sem consumir a fila de relay —
 * o backend continua "verde": a linha em `local_agents` existe, o status é
 * `active`, e só as tarefas de relay é que silenciosamente expiram. O sintoma
 * chega ao operador como "câmera offline", que é o diagnóstico errado.
 *
 * Este módulo é a ÚNICA fonte de verdade da política de auto-cura. O SQL só
 * coleta fatos (heartbeat e contadores da fila) e aplica a decisão; o gate de
 * CI e a UI importam daqui. Duplicar a regra em PL/pgSQL abriria a porta
 * clássica para o painel dizer "curando" enquanto nada é enfileirado.
 *
 * Escada de ações, deliberadamente conservadora (um agente é um processo na
 * rede do cliente; reiniciá-lo à toa derruba streams em andamento):
 *
 *   none     → nada a fazer, ou ainda dentro do período de carência/cooldown
 *   nudge    → ping barato via fila de relay: confirma se o agente ainda lê
 *   restart  → pede auto-reinício do processo/container ao agente
 *   escalate → tentativas esgotadas; problema é humano (energia, rede, DNS)
 *
 * Invariantes garantidas (varridas pelo simulador `scripts/simulate-agent-healing.mjs`):
 *   I1  agente revogado nunca recebe ação
 *   I2  nenhuma ação antes de `graceMinutes` desde o cadastro
 *   I3  nenhuma ação dentro do cooldown desde a última tentativa
 *   I4  `restart` nunca precede um `nudge` já tentado sem sucesso
 *   I5  attempts >= maxAttempts ⇒ escalate, e escalate nunca enfileira tarefa
 *   I6  monotonicidade: envelhecer o heartbeat nunca reduz a gravidade
 *   I7  severidade `critical` ⇒ existe alerta para o barramento de manutenção
 */

/** Severidade compatível com `maintenance_alert_events` (não existe 'ok' lá). */
export type AgentHealingSeverity = 'ok' | 'warning' | 'critical';

/** Ações da escada de auto-cura, em ordem crescente de invasividade. */
export type AgentHealingAction = 'none' | 'nudge' | 'restart' | 'escalate';

export interface AgentHealingThresholds {
  /** Silêncio acima disso = suspeita (heartbeat atrasado). */
  readonly heartbeatWarnMinutes: number;
  /** Silêncio acima disso = agente considerado travado. */
  readonly heartbeatCriticalMinutes: number;
  /** Carência após o cadastro: agente recém-criado ainda não bateu heartbeat. */
  readonly graceMinutes: number;
  /** Intervalo mínimo entre duas tentativas de cura no mesmo agente. */
  readonly cooldownMinutes: number;
  /** Tentativas antes de desistir e escalar para humano. */
  readonly maxAttempts: number;
  /** Amostra mínima da fila antes de julgar a taxa de expiração. */
  readonly minTasksForRatio: number;
  /** Fração de tarefas expiradas/falhas que caracteriza agente surdo. */
  readonly deafRatio: number;
}

export const DEFAULT_AGENT_HEALING_THRESHOLDS: AgentHealingThresholds = {
  // O agente bate heartbeat a cada 60s; 10 min tolera janela de rede ruim.
  heartbeatWarnMinutes: 10,
  heartbeatCriticalMinutes: 30,
  graceMinutes: 15,
  cooldownMinutes: 15,
  maxAttempts: 3,
  minTasksForRatio: 5,
  deafRatio: 0.5,
};

/** Contadores da fila de relay na janela recente (tipicamente 1h). */
export interface AgentRelayStats {
  readonly done: number;
  readonly failed: number;
  readonly expired: number;
  readonly pending: number;
}

export const EMPTY_RELAY_STATS: AgentRelayStats = { done: 0, failed: 0, expired: 0, pending: 0 };

export interface AgentSnapshot {
  readonly id: string;
  readonly name: string;
  readonly status: 'active' | 'revoked';
  /** `null` quando o agente nunca bateu heartbeat. */
  readonly lastSeenAtMs: number | null;
  readonly createdAtMs: number;
  readonly relay: AgentRelayStats;
  /** Tentativas de cura já feitas no episódio atual. */
  readonly attempts: number;
  /** Instante da última tentativa; `null` quando não houve. */
  readonly lastAttemptAtMs: number | null;
}

export interface AgentHealingInput {
  /** Referência temporal injetada — mantém a simulação determinística. */
  readonly nowMs: number;
  readonly agents: readonly AgentSnapshot[];
  readonly thresholds?: AgentHealingThresholds;
}

export interface AgentHealingDecision {
  readonly agentId: string;
  readonly agentName: string;
  readonly severity: AgentHealingSeverity;
  readonly action: AgentHealingAction;
  readonly reason: string;
  /** Minutos desde o último heartbeat; `null` se nunca houve. */
  readonly silentMinutes: number | null;
  /** Fração expirada/falha da janela; `null` quando amostra insuficiente. */
  readonly deafRatio: number | null;
  readonly attempts: number;
  /** `true` quando o SQL deve enfileirar uma tarefa de relay. */
  readonly enqueue: boolean;
}

export interface AgentHealingVerdict {
  readonly severity: AgentHealingSeverity;
  readonly decisions: readonly AgentHealingDecision[];
  /** Resumo pronto para virar `reason` em `maintenance_alert_events`. */
  readonly reason: string;
  readonly detail: Readonly<Record<string, unknown>>;
}

const MINUTE_MS = 60_000;

const SEVERITY_RANK: Record<AgentHealingSeverity, number> = { ok: 0, warning: 1, critical: 2 };

function minutesSince(nowMs: number, thenMs: number): number {
  // Relógio do servidor pode recuar (NTP step). Idade negativa não é "futuro
  // suspeito" para efeito de cura: tratamos como acabou de acontecer.
  return Math.max(0, (nowMs - thenMs) / MINUTE_MS);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Fração de tarefas que o agente deixou morrer na janela.
 * Retorna `null` quando a amostra é pequena demais para ser conclusiva —
 * julgar 1 tarefa expirada como 100% de surdez geraria reinícios espúrios.
 */
export function computeDeafRatio(
  relay: AgentRelayStats,
  thresholds: AgentHealingThresholds = DEFAULT_AGENT_HEALING_THRESHOLDS
): number | null {
  const total = relay.done + relay.failed + relay.expired;
  if (total < thresholds.minTasksForRatio) return null;
  return (relay.failed + relay.expired) / total;
}

/**
 * Decide a ação para um agente. Puro e total: para qualquer entrada existe
 * exatamente uma decisão.
 */
export function decideAgentHealing(
  agent: AgentSnapshot,
  nowMs: number,
  thresholds: AgentHealingThresholds = DEFAULT_AGENT_HEALING_THRESHOLDS
): AgentHealingDecision {
  const base = {
    agentId: agent.id,
    agentName: agent.name,
    attempts: agent.attempts,
  };

  const silentMinutes =
    agent.lastSeenAtMs === null ? null : minutesSince(nowMs, agent.lastSeenAtMs);
  const ratio = computeDeafRatio(agent.relay, thresholds);

  // I1 — agente revogado é decisão de negócio, não falha: não se cura.
  if (agent.status === 'revoked') {
    return {
      ...base,
      severity: 'ok',
      action: 'none',
      reason: 'agente revogado: fora do escopo de auto-cura',
      silentMinutes,
      deafRatio: ratio,
      enqueue: false,
    };
  }

  const ageMinutes = minutesSince(nowMs, agent.createdAtMs);

  // I2 — carência: agente recém-cadastrado ainda pode estar subindo o container.
  if (ageMinutes < thresholds.graceMinutes && agent.lastSeenAtMs === null) {
    return {
      ...base,
      severity: 'ok',
      action: 'none',
      reason: `em carência de instalação (${round1(ageMinutes)}min de ${thresholds.graceMinutes}min)`,
      silentMinutes,
      deafRatio: ratio,
      enqueue: false,
    };
  }

  // Diagnóstico: qual é o sintoma e quão grave ele é.
  let severity: AgentHealingSeverity = 'ok';
  let reason = 'heartbeat em dia';

  if (silentMinutes === null) {
    severity = 'critical';
    reason = 'agente cadastrado nunca bateu heartbeat';
  } else if (silentMinutes >= thresholds.heartbeatCriticalMinutes) {
    severity = 'critical';
    reason = `sem heartbeat há ${round1(silentMinutes)}min (limite ${thresholds.heartbeatCriticalMinutes}min)`;
  } else if (ratio !== null && ratio >= thresholds.deafRatio) {
    // Agente "vivo porém surdo": responde ao heartbeat mas não consome a fila.
    // É pior que atraso de heartbeat porque nada no painel fica vermelho.
    severity = 'critical';
    reason = `${Math.round(ratio * 100)}% das tarefas de relay expiraram/falharam com heartbeat ativo`;
  } else if (silentMinutes >= thresholds.heartbeatWarnMinutes) {
    severity = 'warning';
    reason = `heartbeat atrasado há ${round1(silentMinutes)}min (limite ${thresholds.heartbeatWarnMinutes}min)`;
  } else if (ratio !== null && ratio > 0) {
    severity = 'warning';
    reason = `${Math.round(ratio * 100)}% das tarefas de relay não completaram`;
  }

  if (severity === 'ok') {
    return {
      ...base,
      severity,
      action: 'none',
      reason,
      silentMinutes,
      deafRatio: ratio,
      enqueue: false,
    };
  }

  // I5 — tentativas esgotadas: parar de mexer e chamar humano. Insistir só
  // gera ruído de fila e mascara a causa real (energia/rede/DNS no local).
  if (agent.attempts >= thresholds.maxAttempts) {
    return {
      ...base,
      severity: 'critical',
      action: 'escalate',
      reason: `${reason}; ${agent.attempts} tentativa(s) de cura sem sucesso`,
      silentMinutes,
      deafRatio: ratio,
      enqueue: false,
    };
  }

  // I3 — cooldown: dá tempo do agente reagir antes da próxima tentativa.
  if (agent.lastAttemptAtMs !== null) {
    const sinceAttempt = minutesSince(nowMs, agent.lastAttemptAtMs);
    if (sinceAttempt < thresholds.cooldownMinutes) {
      return {
        ...base,
        severity,
        action: 'none',
        reason: `${reason}; aguardando cooldown (${round1(sinceAttempt)}min de ${thresholds.cooldownMinutes}min)`,
        silentMinutes,
        deafRatio: ratio,
        enqueue: false,
      };
    }
  }

  // Warning ainda não justifica reinício: primeiro pergunta-se educadamente.
  // I4 — a primeira tentativa é sempre o nudge, mesmo em cenário crítico.
  const action: AgentHealingAction =
    agent.attempts === 0 || severity === 'warning' ? 'nudge' : 'restart';

  return {
    ...base,
    severity,
    action,
    reason: `${reason}; ação: ${action}`,
    silentMinutes,
    deafRatio: ratio,
    enqueue: true,
  };
}

/** Avalia a frota inteira e resume para o barramento de alertas (Onda 110). */
export function evaluateAgentHealing(input: AgentHealingInput): AgentHealingVerdict {
  const thresholds = input.thresholds ?? DEFAULT_AGENT_HEALING_THRESHOLDS;
  const decisions = input.agents.map((agent) => decideAgentHealing(agent, input.nowMs, thresholds));

  const severity = decisions.reduce<AgentHealingSeverity>(
    (worst, d) => (SEVERITY_RANK[d.severity] > SEVERITY_RANK[worst] ? d.severity : worst),
    'ok'
  );

  const escalated = decisions.filter((d) => d.action === 'escalate');
  const critical = decisions.filter((d) => d.severity === 'critical');
  const warning = decisions.filter((d) => d.severity === 'warning');
  const enqueued = decisions.filter((d) => d.enqueue);

  let reason: string;
  if (escalated.length > 0) {
    reason = `${escalated.length} agente(s) local(is) sem resposta após tentativas de auto-cura`;
  } else if (critical.length > 0) {
    reason = `${critical.length} agente(s) local(is) em falha crítica`;
  } else if (warning.length > 0) {
    reason = `${warning.length} agente(s) local(is) com degradação`;
  } else {
    reason = 'frota de agentes locais saudável';
  }

  return {
    severity,
    decisions,
    reason,
    detail: {
      agents_total: decisions.length,
      agents_critical: critical.length,
      agents_warning: warning.length,
      agents_escalated: escalated.length,
      actions_enqueued: enqueued.length,
    },
  };
}
