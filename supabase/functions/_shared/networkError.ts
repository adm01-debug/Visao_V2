/**
 * Regra única de classificação de falha de rede para todas as Edge Functions.
 *
 * Motivação (Onda 144 → 145): a simulação de caos mostrou que tratar RST,
 * conexão recusada e DNS como "timeout" leva a duas consequências caras:
 *  1. backoff errado — recuar 10s de uma conexão recusada só atrasa o laço,
 *     enquanto reenviar imediatamente após um RST pode martelar o upstream;
 *  2. diagnóstico injusto — o agente local (ou a câmera) é acusado de silêncio
 *     quando o culpado é o transporte.
 *
 * Este módulo NÃO faz I/O. É a definição canônica do vocabulário de falha; quem
 * faz rede (`timeout.ts`, `retry.ts`, `relayTransport.ts`) apenas o consulta.
 */

/**
 * Vocabulário fechado de falhas de transporte. Só cresce por decisão explícita:
 * consumidores fazem `switch` exaustivo sobre ele.
 */
export type NetworkErrorKind =
  /** O nosso deadline estourou (AbortController próprio, headers/body timeout). */
  | 'timeout'
  /** Quem chamou cancelou (signal do caller). NUNCA é culpa do upstream. */
  | 'aborted'
  /** TCP recusado: nada escutando na porta. Geralmente config/serviço parado. */
  | 'refused'
  /** Conexão derrubada no meio (RST, socket fechado, corpo truncado). */
  | 'reset'
  /** Falha de resolução de nome. */
  | 'dns'
  /** Handshake TLS/certificado. */
  | 'tls'
  /** Resposta ilegível: HTTP malformado, framing inválido. */
  | 'protocol'
  /** Redirecionamento circular / limite de saltos. */
  | 'redirect_loop'
  /** Não classificável — mantido explícito para virar alerta, não silêncio. */
  | 'unknown';

/**
 * Falhas em que repetir a mesma requisição tem chance real de sucesso.
 *
 * Fora da lista de propósito:
 * - `aborted`: o caller desistiu; repetir é trabalho órfão;
 * - `protocol` / `redirect_loop` / `tls`: determinísticos, repetir só queima
 *   orçamento e mascara um defeito de configuração.
 */
const RETRYABLE_KINDS: ReadonlySet<NetworkErrorKind> = new Set<NetworkErrorKind>([
  'timeout',
  'reset',
  'dns',
  'refused',
  'unknown',
]);

/**
 * Recuo mínimo sugerido por classe, em ms. Um RST costuma ser instantâneo e
 * transitório; uma conexão recusada quase sempre exige que alguém suba o
 * serviço, então esperar mais é mais barato que martelar.
 */
const KIND_BACKOFF_FLOOR_MS: Readonly<Record<NetworkErrorKind, number>> = {
  timeout: 0,
  aborted: 0,
  refused: 1_000,
  reset: 100,
  dns: 500,
  tls: 0,
  protocol: 0,
  redirect_loop: 0,
  unknown: 0,
};

/** Erro de rede já classificado. Preserva a causa original para telemetria. */
export class NetworkError extends Error {
  readonly kind: NetworkErrorKind;
  readonly retryable: boolean;

  constructor(kind: NetworkErrorKind, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'NetworkError';
    this.kind = kind;
    this.retryable = RETRYABLE_KINDS.has(kind);
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/** Extrai `code`/`name` de um erro e da sua causa (undici aninha em `cause`). */
function drill(err: unknown): { code?: string; name?: string; message: string } {
  const e = err as { code?: unknown; name?: unknown; message?: unknown; cause?: unknown } | null;
  const cause = (e?.cause ?? null) as { code?: unknown; name?: unknown } | null;
  const code = cause?.code ?? e?.code;
  const name = cause?.name ?? e?.name;
  return {
    code: typeof code === 'string' ? code : undefined,
    name: typeof name === 'string' ? name : undefined,
    message: typeof e?.message === 'string' ? e.message : String(err),
  };
}

export interface ClassifyOptions {
  /**
   * `true` quando o abort veio do deadline interno desta chamada. Sem isso não
   * há como distinguir `timeout` (nosso relógio) de `aborted` (o caller
   * desistiu) — ambos chegam como `AbortError`.
   */
  deadlineExpired?: boolean;
}

/**
 * Classifica qualquer erro lançado por `fetch` (ou pela leitura do corpo).
 * Sempre retorna um valor do vocabulário — nunca lança.
 */
export function classifyNetworkError(
  err: unknown,
  options: ClassifyOptions = {}
): NetworkErrorKind {
  if (err instanceof NetworkError) return err.kind;

  const { code, name, message } = drill(err);

  // Abort é ambíguo por natureza: quem sabe a origem é o chamador.
  if (name === 'AbortError' || name === 'TimeoutError' || code === 'ABORT_ERR') {
    return options.deadlineExpired ? 'timeout' : 'aborted';
  }

  switch (code) {
    case 'ECONNREFUSED':
      return 'refused';
    case 'ECONNRESET':
    case 'EPIPE':
    case 'UND_ERR_SOCKET':
      return 'reset';
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return 'dns';
    case 'UND_ERR_HEADERS_TIMEOUT':
    case 'UND_ERR_BODY_TIMEOUT':
    case 'ETIMEDOUT':
      return 'timeout';
    case 'UND_ERR_RESPONSE_STATUS_CODE':
    case 'HPE_INVALID_CONSTANT':
    case 'UND_ERR_INVALID_ARG':
      return 'protocol';
    default:
      break;
  }

  if (code?.startsWith('HPE_')) return 'protocol';
  if (code?.startsWith('ERR_TLS') || code?.startsWith('ERR_SSL') || code === 'CERT_HAS_EXPIRED') {
    return 'tls';
  }

  const lower = message.toLowerCase();
  if (lower.includes('redirect count exceeded') || lower.includes('too many redirects')) {
    return 'redirect_loop';
  }
  if (lower.includes('certificate') || lower.includes('tls handshake')) return 'tls';
  if (lower.includes('terminated')) return 'reset';

  return 'unknown';
}

/** Envolve um erro cru no tipo classificado, preservando a causa. */
export function toNetworkError(err: unknown, options: ClassifyOptions = {}): NetworkError {
  if (err instanceof NetworkError) return err;
  const kind = classifyNetworkError(err, options);
  const { message } = drill(err);
  return new NetworkError(kind, `${kind}: ${message}`, { cause: err });
}

/** Repetir esta classe de falha tem chance real de sucesso? */
export function isRetryableKind(kind: NetworkErrorKind): boolean {
  return RETRYABLE_KINDS.has(kind);
}

/** Piso de recuo recomendado para a classe (ms). */
export function backoffFloorMs(kind: NetworkErrorKind): number {
  return KIND_BACKOFF_FLOOR_MS[kind] ?? 0;
}
