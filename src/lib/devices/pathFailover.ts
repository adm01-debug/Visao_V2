/**
 * Onda 152 — Escolha e failover do caminho de conectividade da câmera.
 *
 * Uma câmera de 60 unidades raramente é alcançável por um único caminho. Há
 * quatro: `direct` (IP de LAN), `port_forward` (IP público + porta), `vpn` e
 * `relay` (agente local fazendo túnel). Até aqui a escolha vivia espalhada em
 * `camera_connectivity_preferences` (o que o humano pediu) e em
 * `connectivity_resolution_telemetry` (o que de fato funcionou), sem ninguém
 * conciliando as duas. O resultado prático é o pior dos mundos: insistimos no
 * caminho preferido enquanto ele está morto, e depois de trocar nunca voltamos.
 *
 * Esta onda estabelece a **regra única de ordenação de tentativas**. Ela é
 * pura, recebe o relógio por parâmetro e não faz E/S — a mesma decisão pode ser
 * reproduzida no navegador, na função de borda e no simulador.
 *
 * Quatro armadilhas guiaram o desenho:
 *
 *  D1 — **Culpar o caminho pelo erro errado.** Senha trocada na câmera falha
 *  em `direct`, em `vpn` e no `relay` igualmente. Se erro de credencial
 *  colocasse caminho em quarentena, uma senha errada colocaria a frota inteira
 *  em quarentena e o operador veria "sem rota" quando o problema é uma letra.
 *  Só falha de **transporte** (`transport`) culpa o caminho; `auth`, `config` e
 *  `device` são neutros — contam como amostra, nunca como prova contra a rota.
 *  Alinhado com a taxonomia de culpa da Onda 146.
 *
 *  D2 — **Quarentena que vira exílio.** Remover o caminho ruim da lista faz a
 *  frota perder rota permanentemente quando a falha era transitória (queda de
 *  link de 40s). Aqui quarentena **rebaixa, nunca exclui**: o caminho vai para
 *  o fim da fila e volta a ser reavaliado quando o recuo exponencial vence.
 *  A lista devolvida nunca é vazia se existir ao menos um caminho configurado.
 *
 *  D3 — **Trocar de campeão por ruído.** Duas tentativas bem-sucedidas em um
 *  caminho novo não provam que ele é melhor que o preferido com 300 amostras.
 *  A promoção exige piso de Wilson 95% superior ao do preferido por uma margem
 *  (`promotionMargin`) e amostra mínima. Sem isso, a preferência humana vence.
 *
 *  D4 — **Empate não determinístico.** Ordenação instável faz a mesma câmera
 *  tentar caminhos em ordem diferente a cada render, o que torna qualquer
 *  investigação impossível. Todo empate cai na ordem canônica fixa.
 *
 * Invariantes verificadas pelo simulador (`simulate:wave152`):
 *
 *  F1  A ordem é uma permutação exata dos caminhos configurados — sem
 *      repetição, sem caminho não configurado, sem perda.
 *  F2  Havendo ao menos um caminho configurado, a ordem nunca é vazia.
 *  F3  Nenhum caminho em quarentena ativa aparece antes de um caminho fora de
 *      quarentena.
 *  F4  Erro não-transporte jamais cria ou prolonga quarentena.
 *  F5  O preferido só perde a primeira posição se estiver em quarentena ativa
 *      ou se houver promoção com evidência suficiente.
 *  F6  Determinismo: mesma entrada, mesma ordem (idempotência).
 *  F7  O recuo é monotônico não decrescente nas falhas consecutivas e
 *      respeitado o teto.
 */

import { wilsonLowerBound } from '@/lib/relayRedeliveryHealth';

/** Caminhos possíveis, na ordem canônica de desempate (mais barato primeiro). */
export const CONNECTIVITY_PATHS = ['direct', 'port_forward', 'vpn', 'relay'] as const;

export type ConnectivityPath = (typeof CONNECTIVITY_PATHS)[number];

/**
 * Classe da última falha. Espelha a taxonomia de culpa da Onda 146: apenas
 * `transport` é evidência contra a rota.
 */
export type FailureKind = 'transport' | 'auth' | 'config' | 'device' | 'none';

/** Só esta classe de falha culpa o caminho. */
export function blamesPath(kind: FailureKind): boolean {
  return kind === 'transport';
}

export interface PathEvidence {
  /** Tentativas na janela observada (sucessos + falhas de qualquer classe). */
  readonly attempts: number;
  /** Tentativas bem-sucedidas na janela. */
  readonly successes: number;
  /** Falhas de transporte consecutivas — o contador que arma a quarentena. */
  readonly consecutiveTransportFailures: number;
  /** Instante da última falha de transporte, para calcular o recuo. */
  readonly lastTransportFailureAtMs: number | null;
  /** Classe da última falha observada (diagnóstico e checagem de D1). */
  readonly lastFailureKind: FailureKind;
}

export const EMPTY_EVIDENCE: PathEvidence = {
  attempts: 0,
  successes: 0,
  consecutiveTransportFailures: 0,
  lastTransportFailureAtMs: null,
  lastFailureKind: 'none',
};

export interface FailoverPolicy {
  /** Falhas de transporte consecutivas que armam a quarentena. */
  readonly quarantineThreshold: number;
  /** Recuo inicial da quarentena, em ms. */
  readonly backoffBaseMs: number;
  /** Teto do recuo, em ms. */
  readonly backoffCeilingMs: number;
  /** Amostra mínima do candidato para disputar a primeira posição. */
  readonly promotionMinSamples: number;
  /** Vantagem mínima no piso de Wilson para destronar o preferido. */
  readonly promotionMargin: number;
}

export const DEFAULT_FAILOVER_POLICY: FailoverPolicy = {
  quarantineThreshold: 3,
  backoffBaseMs: 30_000,
  backoffCeilingMs: 480_000,
  promotionMinSamples: 10,
  promotionMargin: 0.1,
};

export interface FailoverInput {
  /** Caminho pedido pelo humano em `camera_connectivity_preferences`. */
  readonly preferredPath: ConnectivityPath;
  /** Caminhos efetivamente configurados para esta câmera. */
  readonly configuredPaths: readonly ConnectivityPath[];
  /** Evidência por caminho; ausência equivale a `EMPTY_EVIDENCE`. */
  readonly evidence: Partial<Record<ConnectivityPath, PathEvidence>>;
  readonly policy?: FailoverPolicy;
}

export interface PathDecision {
  readonly path: ConnectivityPath;
  /** Piso de Wilson 95% da taxa de sucesso observada. */
  readonly score: number;
  readonly quarantined: boolean;
  /** Quando a quarentena vence; `null` quando não há quarentena. */
  readonly quarantineUntilMs: number | null;
  /** Recuo aplicado, em ms; 0 fora de quarentena. */
  readonly backoffMs: number;
}

export interface FailoverPlan {
  /** Ordem de tentativa. Permutação dos caminhos configurados. */
  readonly order: readonly ConnectivityPath[];
  /** Detalhe por caminho, na mesma ordem. */
  readonly decisions: readonly PathDecision[];
  /** Motivo legível do primeiro colocado — vai para a UI e para o log. */
  readonly reason: FailoverReason;
}

export type FailoverReason =
  | 'preferred_healthy'
  | 'preferred_quarantined'
  | 'promoted_by_evidence'
  | 'preferred_not_configured'
  | 'no_path_configured';

/**
 * Recuo exponencial da quarentena. Determinístico, monotônico e com teto —
 * um link que cai por horas não deve gerar reavaliação a cada 30s (custa
 * sessão RTSP na câmera), mas também não pode dobrar até o infinito e nunca
 * mais tentar.
 */
export function quarantineBackoffMs(
  consecutiveFailures: number,
  policy: FailoverPolicy = DEFAULT_FAILOVER_POLICY,
): number {
  if (consecutiveFailures < policy.quarantineThreshold) return 0;
  const steps = consecutiveFailures - policy.quarantineThreshold;
  // Math.min antes da multiplicação evita overflow para Infinity com
  // contadores absurdos vindos de dado corrompido.
  const factor = Math.min(2 ** Math.min(steps, 30), policy.backoffCeilingMs);
  return Math.min(policy.backoffBaseMs * factor, policy.backoffCeilingMs);
}

function evidenceFor(input: FailoverInput, path: ConnectivityPath): PathEvidence {
  return input.evidence[path] ?? EMPTY_EVIDENCE;
}

function decide(
  path: ConnectivityPath,
  evidence: PathEvidence,
  nowMs: number,
  policy: FailoverPolicy,
): PathDecision {
  const attempts = Math.max(0, evidence.attempts);
  const successes = Math.min(Math.max(0, evidence.successes), attempts);
  const score = attempts === 0 ? 0 : wilsonLowerBound(successes, attempts);

  const backoffMs = quarantineBackoffMs(evidence.consecutiveTransportFailures, policy);
  // Sem instante de falha registrado não há como saber se o recuo venceu.
  // Tratamos como vencido: preferimos uma tentativa a mais a uma rota
  // eternamente exilada por telemetria incompleta (D2).
  const quarantineUntilMs =
    backoffMs > 0 && evidence.lastTransportFailureAtMs !== null
      ? evidence.lastTransportFailureAtMs + backoffMs
      : null;
  const quarantined = quarantineUntilMs !== null && nowMs < quarantineUntilMs;

  return { path, score, quarantined, quarantineUntilMs, backoffMs };
}

/** Índice canônico de desempate (D4). */
function canonicalIndex(path: ConnectivityPath): number {
  return CONNECTIVITY_PATHS.indexOf(path);
}

/**
 * Produz o plano de tentativa. Função pura: relógio injetado, sem acesso a
 * rede ou banco.
 */
export function planFailover(input: FailoverInput, nowMs: number): FailoverPlan {
  const policy = input.policy ?? DEFAULT_FAILOVER_POLICY;

  // Deduplica e mantém apenas caminhos conhecidos: entrada suja não deve
  // produzir ordem com repetição (F1).
  const configured = CONNECTIVITY_PATHS.filter((p) => input.configuredPaths.includes(p));

  if (configured.length === 0) {
    return { order: [], decisions: [], reason: 'no_path_configured' };
  }

  const decisions = new Map<ConnectivityPath, PathDecision>(
    configured.map((p) => [p, decide(p, evidenceFor(input, p), nowMs, policy)]),
  );

  const preferred = configured.includes(input.preferredPath) ? input.preferredPath : null;
  const preferredDecision = preferred ? decisions.get(preferred)! : null;

  // Candidato a campeão: melhor caminho saudável que não é o preferido.
  const challenger = configured
    .filter((p) => p !== preferred && !decisions.get(p)!.quarantined)
    .sort((a, b) => {
      const d = decisions.get(b)!.score - decisions.get(a)!.score;
      return d !== 0 ? d : canonicalIndex(a) - canonicalIndex(b);
    })[0];

  let head: ConnectivityPath;
  let reason: FailoverReason;

  if (!preferred || !preferredDecision) {
    head = challenger ?? configured[0];
    reason = 'preferred_not_configured';
  } else if (preferredDecision.quarantined) {
    // O preferido está provadamente morto agora: qualquer alternativa saudável
    // assume, mesmo sem histórico. Se não houver alternativa, o preferido
    // continua na frente — melhor tentar o conhecido do que não tentar nada.
    head = challenger ?? preferred;
    reason = challenger ? 'preferred_quarantined' : 'preferred_healthy';
  } else if (
    challenger &&
    (evidenceFor(input, challenger).attempts >= policy.promotionMinSamples) &&
    decisions.get(challenger)!.score >= preferredDecision.score + policy.promotionMargin
  ) {
    head = challenger;
    reason = 'promoted_by_evidence';
  } else {
    head = preferred;
    reason = 'preferred_healthy';
  }

  const rest = configured
    .filter((p) => p !== head)
    .sort((a, b) => {
      const da = decisions.get(a)!;
      const db = decisions.get(b)!;
      // Quarentena rebaixa, nunca exclui (F3/D2).
      if (da.quarantined !== db.quarantined) return da.quarantined ? 1 : -1;
      if (db.score !== da.score) return db.score - da.score;
      return canonicalIndex(a) - canonicalIndex(b);
    });

  const order = [head, ...rest];
  return { order, decisions: order.map((p) => decisions.get(p)!), reason };
}

/**
 * Aplica o resultado de uma tentativa à evidência de um caminho.
 *
 * Sucesso zera o contador de quarentena — uma rota que respondeu está viva,
 * independentemente do que fez antes. Falha só incrementa o contador quando a
 * classe culpa a rota (D1); as demais entram como amostra e preservam o
 * contador, sem prolongar exílio por culpa alheia.
 */
export function applyAttempt(
  evidence: PathEvidence,
  outcome: { succeeded: boolean; failureKind?: FailureKind },
  nowMs: number,
): PathEvidence {
  const attempts = evidence.attempts + 1;

  if (outcome.succeeded) {
    return {
      attempts,
      successes: evidence.successes + 1,
      consecutiveTransportFailures: 0,
      lastTransportFailureAtMs: evidence.lastTransportFailureAtMs,
      lastFailureKind: 'none',
    };
  }

  const kind: FailureKind = outcome.failureKind ?? 'transport';
  const blames = blamesPath(kind);

  return {
    attempts,
    successes: evidence.successes,
    consecutiveTransportFailures: blames
      ? evidence.consecutiveTransportFailures + 1
      : evidence.consecutiveTransportFailures,
    lastTransportFailureAtMs: blames ? nowMs : evidence.lastTransportFailureAtMs,
    lastFailureKind: kind,
  };
}

/** Rótulos em português para a UI de diagnóstico. */
export const FAILOVER_REASON_LABEL: Record<FailoverReason, string> = {
  preferred_healthy: 'Caminho preferido saudável',
  preferred_quarantined: 'Preferido em quarentena — usando alternativa',
  promoted_by_evidence: 'Alternativa promovida por evidência',
  preferred_not_configured: 'Preferido não configurado nesta câmera',
  no_path_configured: 'Nenhum caminho configurado',
};

export const PATH_LABEL: Record<ConnectivityPath, string> = {
  direct: 'Direto (LAN)',
  port_forward: 'Redirecionamento de porta',
  vpn: 'VPN',
  relay: 'Agente local (túnel)',
};
