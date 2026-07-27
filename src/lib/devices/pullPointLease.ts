/**
 * Onda 155 — REGRA ÚNICA DO CICLO DE VIDA DA ASSINATURA ONVIF PULLPOINT.
 *
 * ## O problema real
 *
 * PullPoint é o único jeito padronizado de a câmera *nos contar* que algo
 * aconteceu (contato seco fechou, detecção de movimento, tamper, perda de
 * vídeo) sem que precisemos abrir porta na rede do cliente. Em troca, ele
 * carrega três armadilhas que derrubam integrações inteiras:
 *
 *  1. A assinatura é um **empréstimo com prazo** (`TerminationTime`). Se o
 *     prazo vencer, a referência morre. `Renew` sobre referência morta não
 *     ressuscita nada: a maioria dos equipamentos devolve fault para sempre, e
 *     o integrador ingênuo fica em laço de renovação eterna sem receber um
 *     único evento. Vencida, só recriando.
 *  2. O prazo vem do **relógio da câmera**, que a Onda 112 já provou estar
 *     errado em campo. Renovar "no último segundo" segundo o nosso relógio é
 *     renovar depois do vencimento segundo o dela.
 *  3. `PullMessages` é uma chamada de **espera longa**. Sessenta câmeras
 *     falhando ao mesmo tempo (queda de link do cliente) e voltando ao mesmo
 *     tempo produzem um rebanho sincronizado que derruba o próprio puller.
 *
 * Este módulo é a autoridade única sobre *o que fazer a seguir* com uma
 * assinatura. Puro: sem rede, sem React, sem relógio próprio — o instante é
 * sempre injetado, para que cada veredito seja reproduzível no CI.
 *
 * ## Decisões e o porquê
 *
 *  P1 — **Renovação antecipada, com piso absoluto.** Renovamos quando resta
 *  menos que `max(RENEW_FLOOR_MS, 30% do empréstimo)`. O percentual cobre
 *  empréstimos longos; o piso de 45 s cobre empréstimos curtos, em que 30% de
 *  60 s seriam 18 s — menos que o tempo de uma chamada SOAP em link ruim.
 *
 *  P2 — **Vencida nunca renova, sempre recria.** Ver armadilha 1. Esta é a
 *  invariante mais importante do módulo.
 *
 *  P3 — **Nem toda falha merece nova tentativa.** Falha de transporte é
 *  passageira e merece recuo. Falha de credencial ou recurso ausente
 *  (`unsupported`) é permanente até intervenção humana: insistir queima a fila
 *  de trabalho das câmeras que *poderiam* responder. Recolhemos a assinatura e
 *  deixamos o motivo explícito para o painel de manutenção.
 *
 *  P4 — **Recuo exponencial com tremor determinístico.** 5 s dobrando até 5
 *  min, com tremor de ±20% derivado por FNV-1a do identificador da assinatura
 *  — mesma técnica da Onda 118. Determinístico para ser testável; espalhado
 *  para não sincronizar a frota.
 *
 *  P5 — **Câmera desabilitada ou removida recolhe a assinatura na hora.** Não
 *  existe "esperar para ver" em recurso que o usuário já desligou.
 *
 *  P6 — **`pull` exige empréstimo vivo.** Puxar mensagens de referência
 *  vencida devolve fault e conta como falha, poluindo a estatística de saúde
 *  da câmera com culpa que é nossa. A Onda 146 chamaria isso de culpa mal
 *  endereçada.
 *
 *  P7 — **Função total.** Toda combinação de entradas produz um veredito do
 *  vocabulário fechado. Não existe `throw` aqui.
 *
 * Invariantes varridas pela simulação da etapa 15:
 *   J1 empréstimo vencido jamais produz `renew`
 *   J2 assinatura de câmera desabilitada sempre produz `retire`
 *   J3 falha permanente (auth/unsupported) jamais produz `wait`, `pull` ou `renew`
 *   J4 o atraso do recuo nunca excede BACKOFF_CAP_MS nem é negativo
 *   J5 `pull` só ocorre com empréstimo vivo e folga acima do limiar de renovação
 *   J6 pureza: o veredito não depende de ordem de chamada nem de estado global
 */

/** Estado registrado da assinatura no banco. */
export type PullPointStatus = 'pending' | 'active' | 'backoff' | 'retired';

/**
 * Classe da última falha. Deliberadamente distinta da taxonomia de rede da
 * Onda 145: aqui o que importa é *se insistir tem chance de funcionar*.
 */
export type PullPointFailureKind =
  | 'none'
  /** Timeout, DNS, recusa de conexão: passageiro, merece recuo. */
  | 'transport'
  /** Fault SOAP genérico do equipamento: passageiro, merece recuo. */
  | 'device_fault'
  /** 401/403 ou digest recusado: permanente até alguém corrigir a senha. */
  | 'auth'
  /** Equipamento sem serviço de eventos ou sem PullPoint: permanente. */
  | 'unsupported';

/** Vereditos possíveis. Lista fechada, espelhada no CHECK do banco. */
export type PullPointAction = 'create' | 'pull' | 'renew' | 'recreate' | 'wait' | 'retire';

/** Motivos canônicos, usados na coluna `last_decision_reason` e na UI. */
export type PullPointReason =
  | 'no_subscription'
  | 'lease_expired'
  | 'lease_near_expiry'
  | 'lease_healthy'
  | 'backoff_pending'
  | 'camera_disabled'
  | 'permanent_failure'
  | 'retired';

export interface PullPointSubscription {
  /** Identificador estável — semeia o tremor do recuo. */
  readonly id: string;
  readonly status: PullPointStatus;
  /** Instante de vencimento do empréstimo, em ms. `null` = nunca criada. */
  readonly terminationAtMs: number | null;
  /**
   * Instante em que o empréstimo corrente começou (resposta do `Subscribe` ou
   * do `Renew`), em ms pelo NOSSO relógio. Junto com `terminationAtMs` dá o
   * empréstimo **observado**, que é o único confiável — ver P8.
   */
  readonly leaseStartedAtMs: number | null;
  /** Duração nominal do empréstimo pedido ao equipamento, em ms. */
  readonly leaseDurationMs: number;

  readonly consecutiveFailures: number;
  readonly lastFailureKind: PullPointFailureKind;
  /** Instante da última tentativa (sucesso ou falha), em ms. */
  readonly lastAttemptAtMs: number | null;
  readonly cameraEnabled: boolean;
}

export interface PullPointDecision {
  readonly action: PullPointAction;
  readonly reason: PullPointReason;
  /** Espera recomendada antes da próxima tentativa, em ms. Nunca negativa. */
  readonly delayMs: number;
  /** `true` quando a decisão é definitiva e exige intervenção humana. */
  readonly terminal: boolean;
}

/* ------------------------------ constantes -------------------------------- */

/** Piso da antecipação de renovação. Cobre SOAP lento em link ruim. */
export const RENEW_FLOOR_MS = 45_000;
/** Fração do empréstimo usada como antecipação em empréstimos longos. */
export const RENEW_FRACTION = 0.3;
/** Primeiro degrau do recuo. */
export const BACKOFF_BASE_MS = 5_000;
/** Teto do recuo: cinco minutos. Além disso a câmera vira caso de manutenção. */
export const BACKOFF_CAP_MS = 300_000;
/** Amplitude do tremor determinístico, em fração do atraso. */
export const BACKOFF_JITTER = 0.2;
/** Empréstimo mínimo aceitável; abaixo disso renovaríamos mais que puxaríamos. */
export const MIN_LEASE_MS = 60_000;
/** Empréstimo máximo pedido ao equipamento: 10 min. */
export const MAX_LEASE_MS = 600_000;

/* -------------------------------- auxiliares ------------------------------ */

/** FNV-1a de 32 bits — mesma função de espalhamento da Onda 118. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Normaliza o empréstimo pedido para a faixa que sabemos operar. */
export function clampLeaseMs(requestedMs: number): number {
  if (!isFiniteNumber(requestedMs)) return MIN_LEASE_MS;
  return Math.min(MAX_LEASE_MS, Math.max(MIN_LEASE_MS, Math.round(requestedMs)));
}

/**
 * Antecipação de renovação para um dado empréstimo (P1).
 * Nunca ultrapassa metade do empréstimo: renovar antes da metade seria
 * transformar renovação em recriação disfarçada.
 */
export function renewThresholdMs(leaseDurationMs: number): number {
  const lease = clampLeaseMs(leaseDurationMs);
  const fractional = Math.round(lease * RENEW_FRACTION);
  return Math.min(Math.round(lease / 2), Math.max(RENEW_FLOOR_MS, fractional));
}

/**
 * Recuo exponencial com tremor determinístico (P4).
 * `failures` é saturado antes da potência para não estourar o expoente.
 */
export function backoffDelayMs(failures: number, seed: string): number {
  const n = isFiniteNumber(failures) ? Math.max(0, Math.floor(failures)) : 0;
  if (n === 0) return 0;
  const exponent = Math.min(n - 1, 20);
  const raw = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** exponent);
  // tremor em [-JITTER, +JITTER], determinístico por assinatura
  const unit = (fnv1a(`${seed}:${n}`) % 2001) / 1000 - 1; // [-1, 1]
  const jittered = Math.round(raw * (1 + unit * BACKOFF_JITTER));
  return Math.min(BACKOFF_CAP_MS, Math.max(0, jittered));
}

/** Falhas que não melhoram com insistência (P3). */
export function isPermanentFailure(kind: PullPointFailureKind): boolean {
  return kind === 'auth' || kind === 'unsupported';
}

/* ------------------------------ regra central ----------------------------- */

/**
 * Decide o próximo passo para uma assinatura. Ordem das checagens é
 * significativa e não deve ser invertida: o que o usuário desligou vence o que
 * o equipamento respondeu, e o que é permanente vence o que é temporário.
 */
export function decidePullPoint(
  sub: PullPointSubscription,
  nowMs: number,
): PullPointDecision {
  const now = isFiniteNumber(nowMs) ? nowMs : 0;
  const failures = isFiniteNumber(sub.consecutiveFailures)
    ? Math.max(0, Math.floor(sub.consecutiveFailures))
    : 0;

  // P5 — vontade do usuário vence qualquer estado do equipamento.
  if (!sub.cameraEnabled) {
    return { action: 'retire', reason: 'camera_disabled', delayMs: 0, terminal: true };
  }

  if (sub.status === 'retired') {
    return { action: 'retire', reason: 'retired', delayMs: 0, terminal: true };
  }

  // P3 — permanente vence temporário; nunca cai no recuo.
  if (isPermanentFailure(sub.lastFailureKind)) {
    return { action: 'retire', reason: 'permanent_failure', delayMs: 0, terminal: true };
  }

  // Recuo pendente: só volta a agir quando o relógio alcança o degrau.
  if (failures > 0) {
    const delay = backoffDelayMs(failures, sub.id);
    const since = isFiniteNumber(sub.lastAttemptAtMs) ? sub.lastAttemptAtMs : null;
    const readyAt = since === null ? now : since + delay;
    if (now < readyAt) {
      return {
        action: 'wait',
        reason: 'backoff_pending',
        delayMs: Math.max(0, readyAt - now),
        terminal: false,
      };
    }
  }

  // Nunca criada.
  if (sub.terminationAtMs === null || !isFiniteNumber(sub.terminationAtMs)) {
    return { action: 'create', reason: 'no_subscription', delayMs: 0, terminal: false };
  }

  const remaining = sub.terminationAtMs - now;

  // P2 — a invariante que mais derruba integração alheia.
  if (remaining <= 0) {
    return { action: 'recreate', reason: 'lease_expired', delayMs: 0, terminal: false };
  }

  if (remaining <= renewThresholdMs(observedLeaseMs(sub))) {
    return { action: 'renew', reason: 'lease_near_expiry', delayMs: 0, terminal: false };
  }

  // P6 — empréstimo vivo e folgado: puxar mensagens.
  return { action: 'pull', reason: 'lease_healthy', delayMs: 0, terminal: false };
}

/* ------------------------------ deduplicação ------------------------------ */

/**
 * Chave de deduplicação de evento PullPoint.
 *
 * Por que existe: o equipamento reentrega mensagens quando o `PullMessages`
 * anterior não foi confirmado a tempo, e recriar a assinatura (P2) faz o
 * equipamento reenviar o estado corrente de cada tópico. Sem chave estável, um
 * único contato seco fechado vira uma enxurrada de eventos idênticos no motor
 * de regras — e, com a Onda 154 no laço, uma enxurrada de acionamentos de relé.
 *
 * A chave usa o instante declarado pelo **equipamento** (`utcTime`), não o
 * nosso de recepção: dois recebimentos do mesmo fato têm o mesmo `utcTime`.
 */
export function pullPointEventKey(input: {
  cameraId: string;
  topic: string;
  sourceToken: string | null;
  utcTime: string;
}): string {
  const topic = input.topic.trim().toLowerCase();
  const source = (input.sourceToken ?? '').trim().toLowerCase();
  return `${input.cameraId}|${topic}|${source}|${input.utcTime.trim()}`;
}
