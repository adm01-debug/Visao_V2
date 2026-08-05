/**
 * Onda 118 — Controle de admissão de reinícios (anti "thundering herd").
 *
 * Contexto do problema:
 * a Onda 115 deu autonomia ao backend para reiniciar agentes locais travados.
 * Isso é seguro quando UM agente trava. É perigoso quando a causa é comum:
 * queda de energia no site, troca de link do provedor, DNS interno fora do ar,
 * ou uma janela de manutenção do próprio backend. Nesses casos os 60 agentes
 * ficam mudos ao mesmo tempo e a rotina de cura enfileira 60 reinícios no
 * mesmo minuto. As consequências são todas ruins:
 *
 *   1. Reiniciar não resolve — o agente não está travado, a rede é que caiu.
 *      Derruba-se todo stream que ainda funcionava por engano.
 *   2. Quando a rede volta, 60 containers sobem juntos, reabrem 60 túneis e
 *      re-registram no mesmo instante: o pico sincronizado derruba de novo o
 *      que acabou de subir, e o ciclo se repete (retry storm ressonante).
 *   3. O alerta correto ("o site caiu") fica soterrado por 60 alertas errados
 *      ("agente X não responde").
 *
 * Este módulo é a ÚNICA fonte de verdade da política de admissão. A rotina SQL
 * `heal_local_agents()` consulta esta régua (espelhada em PL/pgSQL) antes de
 * enfileirar qualquer ação invasiva; o gate de CI compara o que o banco
 * realmente fez com o que esta biblioteca teria autorizado.
 *
 * Três mecanismos, em ordem de precedência:
 *
 *   BREAKER   — se uma fração grande da frota adoece na mesma varredura, o
 *               diagnóstico deixa de ser "agentes travados" e passa a ser
 *               "falha correlacionada". Todo reinício é suprimido e o caso vai
 *               para humano. É o mecanismo mais importante: ele impede a ação
 *               errada, não apenas a ação em excesso.
 *   ORÇAMENTO — teto de reinícios por varredura e por janela deslizante,
 *               proporcional ao tamanho da frota. Mesmo sem falha
 *               correlacionada, curar aos poucos preserva a capacidade de
 *               observar o efeito de cada reinício.
 *   JITTER    — deslocamento determinístico por agente, para que os reinícios
 *               admitidos não caiam todos no mesmo segundo e para que a ordem
 *               entre agentes não seja sempre a mesma varredura após varredura.
 *
 * `nudge` (ping barato) e `escalate` (nenhuma ação remota) NÃO consomem
 * orçamento: o objetivo é limitar o que derruba serviço, não limitar o que
 * diagnostica. Suprimir o diagnóstico junto com a ação cegaria o operador
 * exatamente no incidente em que ele mais precisa enxergar.
 *
 * Invariantes garantidas (varridas por `scripts/simulate-wave118-scenarios.mjs`):
 *   I1  `nudge` e `escalate` nunca são bloqueados pelo orçamento
 *   I2  breaker armado ⇒ zero reinícios admitidos
 *   I3  admitidos ⊆ candidatos (nunca inventa alvo)
 *   I4  admitidos de reinício ≤ orçamento efetivo da varredura
 *   I5  orçamento efetivo respeita o teto da janela deslizante
 *   6.  toda supressão carrega motivo legível (nada some em silêncio)
 *   I7  determinismo: mesma entrada ⇒ mesma saída, independente da ordem
 *   I8  monotonicidade: aumentar o orçamento nunca desadmite quem já entrou
 *   I9  prioridade: entre candidatos, os mais graves entram primeiro
 *   I10 jitter ∈ [0, jitterSpreadSeconds) e é estável por agente
 *   I11 breaker armado ⇒ existe alerta crítico para o barramento (Onda 110)
 */

/** Ações vindas da escada de auto-cura (Onda 115) relevantes para admissão. */
export type AdmissionAction = 'nudge' | 'restart' | 'escalate';

export type AdmissionSeverity = 'warning' | 'critical';

export interface RestartBudgetPolicy {
  /** Fração da frota ativa que pode ser reiniciada em UMA varredura. */
  readonly maxRestartFractionPerRun: number;
  /** Piso: mesmo em frota minúscula, um reinício por varredura é permitido. */
  readonly minRestartsPerRun: number;
  /** Teto absoluto por varredura, independente do tamanho da frota. */
  readonly maxRestartsPerRun: number;
  /** Janela deslizante usada para contabilizar reinícios recentes. */
  readonly windowMinutes: number;
  /** Fração da frota que pode ser reiniciada dentro da janela deslizante. */
  readonly maxRestartFractionPerWindow: number;
  /** Teto absoluto por janela. */
  readonly maxRestartsPerWindow: number;
  /** Fração da frota adoecida que caracteriza falha correlacionada. */
  readonly breakerFraction: number;
  /** Frota mínima para o breaker ter significado estatístico. */
  readonly breakerMinFleet: number;
  /** Mínimo absoluto de agentes doentes para armar o breaker. */
  readonly breakerMinAffected: number;
  /** Amplitude do atraso determinístico aplicado a cada ação admitida. */
  readonly jitterSpreadSeconds: number;
}

export const DEFAULT_RESTART_BUDGET_POLICY: RestartBudgetPolicy = {
  // 15% por varredura: numa frota de 60, no máximo 9 reinícios a cada 10 min.
  maxRestartFractionPerRun: 0.15,
  minRestartsPerRun: 1,
  maxRestartsPerRun: 5,
  // A janela cobre ~6 varreduras (cron de 10 em 10 min).
  windowMinutes: 60,
  maxRestartFractionPerWindow: 0.34,
  maxRestartsPerWindow: 12,
  // 40% da frota muda ⇒ a causa é do ambiente, não dos agentes.
  breakerFraction: 0.4,
  breakerMinFleet: 4,
  breakerMinAffected: 3,
  // 9 min de espalhamento cabe dentro do intervalo de 10 min do cron.
  jitterSpreadSeconds: 540,
};

/** Candidato produzido pela escada de cura, já diagnosticado. */
export interface AdmissionCandidate {
  readonly agentId: string;
  readonly agentName: string;
  readonly action: AdmissionAction;
  readonly severity: AdmissionSeverity;
  /** Minutos de silêncio; `null` quando o agente nunca bateu heartbeat. */
  readonly silentMinutes: number | null;
  /** Tentativas de cura já feitas no episódio atual. */
  readonly attempts: number;
}

export interface AdmissionInput {
  /** Agentes ativos na frota (denominador das frações). */
  readonly fleetSize: number;
  readonly candidates: readonly AdmissionCandidate[];
  /** Reinícios já enfileirados dentro de `windowMinutes`. */
  readonly restartsInWindow: number;
  readonly policy?: RestartBudgetPolicy;
}

export type AdmissionOutcome = 'admitted' | 'deferred' | 'suppressed';

export interface AdmissionDecision {
  readonly agentId: string;
  readonly agentName: string;
  readonly action: AdmissionAction;
  readonly severity: AdmissionSeverity;
  readonly outcome: AdmissionOutcome;
  /** Sempre preenchido: nenhuma supressão é silenciosa. */
  readonly reason: string;
  /** Atraso determinístico, em segundos, aplicado à ação admitida. */
  readonly jitterSeconds: number;
  /** Posição na fila de prioridade (0 = mais grave). Útil para auditoria. */
  readonly rank: number;
}

export interface AdmissionBreaker {
  readonly tripped: boolean;
  readonly affected: number;
  readonly fleetSize: number;
  readonly fraction: number;
  readonly reason: string;
}

export interface AdmissionPlan {
  readonly breaker: AdmissionBreaker;
  /** Reinícios permitidos nesta varredura, já descontada a janela. */
  readonly effectiveBudget: number;
  readonly perRunBudget: number;
  readonly windowRemaining: number;
  readonly decisions: readonly AdmissionDecision[];
  readonly admittedRestarts: number;
  readonly deferredRestarts: number;
  readonly suppressedRestarts: number;
  /** Alerta para `maintenance_alert_events` quando há algo a contar. */
  readonly alert: { readonly severity: 'warning' | 'critical'; readonly reason: string } | null;
  readonly detail: Readonly<Record<string, unknown>>;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * Hash determinístico (FNV-1a 32 bits) do id do agente.
 * Precisa ser reproduzível em JS e em SQL, por isso nada de `Math.random()`
 * nem de dependência da ordem de iteração: o gate de CI recalcula o mesmo
 * valor a partir do id gravado e compara com o que o banco usou.
 */
export function stableHash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i) & 0xff;
    // Multiplicação FNV via somas evita estouro de precisão em float64.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

/** I10 — jitter estável por agente, dentro de [0, spread). */
export function jitterSecondsFor(agentId: string, policy: RestartBudgetPolicy): number {
  const spread = Math.max(0, Math.trunc(policy.jitterSpreadSeconds));
  if (spread === 0) return 0;
  return stableHash32(agentId) % spread;
}

/**
 * Ordem de prioridade entre candidatos a reinício.
 * Critérios, do mais forte ao mais fraco:
 *   1. severidade (critical antes de warning)
 *   2. tentativas já feitas (quem já foi cutucado e não voltou é mais urgente)
 *   3. tempo de silêncio (null = nunca apareceu = infinito)
 *   4. id (desempate determinístico — sem ele a saída dependeria da ordem
 *      de leitura do banco, e o gate de CI ficaria intermitente)
 */
function compareCandidates(a: AdmissionCandidate, b: AdmissionCandidate): number {
  const sev = (c: AdmissionCandidate) => (c.severity === 'critical' ? 0 : 1);
  if (sev(a) !== sev(b)) return sev(a) - sev(b);
  if (a.attempts !== b.attempts) return b.attempts - a.attempts;
  const sa = a.silentMinutes === null ? Number.POSITIVE_INFINITY : a.silentMinutes;
  const sb = b.silentMinutes === null ? Number.POSITIVE_INFINITY : b.silentMinutes;
  if (sa !== sb) return sb - sa;
  return a.agentId < b.agentId ? -1 : a.agentId > b.agentId ? 1 : 0;
}

/** Orçamento de reinícios de UMA varredura, proporcional à frota. */
export function perRunBudget(fleetSize: number, policy: RestartBudgetPolicy): number {
  if (fleetSize <= 0) return 0;
  const proportional = Math.ceil(fleetSize * policy.maxRestartFractionPerRun);
  return clampInt(proportional, policy.minRestartsPerRun, policy.maxRestartsPerRun);
}

/** Saldo restante na janela deslizante (nunca negativo). */
export function windowRemaining(
  fleetSize: number,
  restartsInWindow: number,
  policy: RestartBudgetPolicy
): number {
  if (fleetSize <= 0) return 0;
  const cap = clampInt(
    Math.ceil(fleetSize * policy.maxRestartFractionPerWindow),
    policy.minRestartsPerRun,
    policy.maxRestartsPerWindow
  );
  return Math.max(0, cap - Math.max(0, Math.trunc(restartsInWindow)));
}

/**
 * Avalia a falha correlacionada.
 *
 * Conta agentes DOENTES (qualquer candidato, inclusive os que já escalaram),
 * não apenas os candidatos a reinício: se 40 dos 60 agentes já esgotaram as
 * tentativas, a frota está claramente sofrendo de causa comum, ainda que
 * nenhum reinício esteja sendo pedido nesta varredura específica.
 */
export function evaluateBreaker(
  fleetSize: number,
  candidates: readonly AdmissionCandidate[],
  policy: RestartBudgetPolicy
): AdmissionBreaker {
  const affected = candidates.length;
  const fraction = fleetSize > 0 ? affected / fleetSize : 0;

  if (fleetSize < policy.breakerMinFleet) {
    return {
      tripped: false,
      affected,
      fleetSize,
      fraction,
      reason: `frota pequena demais (${fleetSize} < ${policy.breakerMinFleet}) para inferir falha correlacionada`,
    };
  }
  if (affected < policy.breakerMinAffected) {
    return {
      tripped: false,
      affected,
      fleetSize,
      fraction,
      reason: `${affected} agente(s) afetado(s): abaixo do mínimo de ${policy.breakerMinAffected} para falha correlacionada`,
    };
  }
  if (fraction < policy.breakerFraction) {
    return {
      tripped: false,
      affected,
      fleetSize,
      fraction,
      reason: `${Math.round(fraction * 100)}% da frota afetada (limite ${Math.round(policy.breakerFraction * 100)}%)`,
    };
  }
  return {
    tripped: true,
    affected,
    fleetSize,
    fraction,
    reason: `${affected} de ${fleetSize} agentes (${Math.round(fraction * 100)}%) adoeceram juntos: causa provável é de ambiente (energia, link, DNS ou backend), não dos agentes`,
  };
}

/**
 * Plano de admissão da varredura. Puro, total e determinístico.
 */
export function planAgentAdmission(input: AdmissionInput): AdmissionPlan {
  const policy = input.policy ?? DEFAULT_RESTART_BUDGET_POLICY;
  const fleetSize = Math.max(0, Math.trunc(input.fleetSize));
  const candidates = [...input.candidates];

  const breaker = evaluateBreaker(fleetSize, candidates, policy);
  const runBudget = perRunBudget(fleetSize, policy);
  const remaining = windowRemaining(fleetSize, input.restartsInWindow, policy);
  const effectiveBudget = breaker.tripped ? 0 : Math.min(runBudget, remaining);

  // I1 — nudge e escalate passam sempre; só ganham jitter.
  const nonInvasive = candidates.filter((c) => c.action !== 'restart');
  const restarts = candidates.filter((c) => c.action === 'restart').sort(compareCandidates);

  const decisions: AdmissionDecision[] = [];

  for (const c of nonInvasive) {
    decisions.push({
      agentId: c.agentId,
      agentName: c.agentName,
      action: c.action,
      severity: c.severity,
      outcome: 'admitted',
      reason:
        c.action === 'escalate'
          ? 'escalonamento não consome orçamento: nenhuma ação remota é executada'
          : 'ping de diagnóstico não consome orçamento de reinício',
      jitterSeconds: jitterSecondsFor(c.agentId, policy),
      rank: 0,
    });
  }

  let admitted = 0;
  restarts.forEach((c, index) => {
    const jitterSeconds = jitterSecondsFor(c.agentId, policy);

    if (breaker.tripped) {
      decisions.push({
        agentId: c.agentId,
        agentName: c.agentName,
        action: c.action,
        severity: c.severity,
        outcome: 'suppressed',
        reason: `reinício suprimido pelo disjuntor de falha correlacionada: ${breaker.reason}`,
        jitterSeconds,
        rank: index,
      });
      return;
    }

    if (admitted < effectiveBudget) {
      admitted += 1;
      decisions.push({
        agentId: c.agentId,
        agentName: c.agentName,
        action: c.action,
        severity: c.severity,
        outcome: 'admitted',
        reason: `reinício admitido (${admitted}/${effectiveBudget} do orçamento da varredura)`,
        jitterSeconds,
        rank: index,
      });
      return;
    }

    const cause =
      remaining < runBudget
        ? `teto da janela de ${policy.windowMinutes}min atingido (${input.restartsInWindow} reinício(s) recentes)`
        : `orçamento da varredura esgotado (${effectiveBudget} de ${fleetSize} agentes)`;
    decisions.push({
      agentId: c.agentId,
      agentName: c.agentName,
      action: c.action,
      severity: c.severity,
      outcome: 'deferred',
      reason: `reinício adiado para a próxima varredura: ${cause}`,
      jitterSeconds,
      rank: index,
    });
  });

  const deferredRestarts = decisions.filter((d) => d.outcome === 'deferred').length;
  const suppressedRestarts = decisions.filter((d) => d.outcome === 'suppressed').length;

  // I11 — breaker armado sempre produz alerta crítico; adiamento persistente
  // vira aviso, porque significa que a cura não acompanha a taxa de falha.
  let alert: AdmissionPlan['alert'] = null;
  if (breaker.tripped) {
    alert = {
      severity: 'critical',
      reason: `auto-cura suspensa: ${breaker.reason}`,
    };
  } else if (deferredRestarts > 0) {
    alert = {
      severity: 'warning',
      reason: `${deferredRestarts} reinício(s) de agente adiado(s) por limite de orçamento (${effectiveBudget} por varredura)`,
    };
  }

  return {
    breaker,
    effectiveBudget,
    perRunBudget: runBudget,
    windowRemaining: remaining,
    decisions,
    admittedRestarts: admitted,
    deferredRestarts,
    suppressedRestarts,
    alert,
    detail: {
      fleet_size: fleetSize,
      candidates: candidates.length,
      restarts_requested: restarts.length,
      restarts_admitted: admitted,
      restarts_deferred: deferredRestarts,
      restarts_suppressed: suppressedRestarts,
      restarts_in_window: Math.max(0, Math.trunc(input.restartsInWindow)),
      per_run_budget: runBudget,
      window_remaining: remaining,
      effective_budget: effectiveBudget,
      breaker_tripped: breaker.tripped,
      breaker_fraction: Math.round(breaker.fraction * 1000) / 1000,
    },
  };
}
