/**
 * VISÃO — Onda 124: ingestão de vídeo empurrado pela câmera (RTMP/SRT push).
 *
 * Biblioteca pura (sem I/O) que espelha, no TypeScript, as mesmas regras da
 * migração de banco:
 *   - forma da chave de publicação (`camera_ingest_endpoints_stream_key_shape`);
 *   - classificação de silêncio usada por `public.detect_stale_ingest_publishers()`.
 *
 * O gate `npm run db:check:ingest-endpoints` compara SQL ↔ TS. Qualquer
 * divergência quebra o CI de propósito: um detector que discorda da UI é pior
 * do que nenhum detector, porque produz confiança falsa.
 */

/** Protocolos aceitos pela coluna `protocol`. */
export const INGEST_PROTOCOLS = ['rtsp_pull', 'rtmp_push', 'srt_push'] as const;
export type IngestProtocol = (typeof INGEST_PROTOCOLS)[number];

/** Estados aceitos pela coluna `status`. */
export const INGEST_STATUSES = ['pending', 'publishing', 'idle', 'revoked'] as const;
export type IngestStatus = (typeof INGEST_STATUSES)[number];

/** Política de ingestão — paridade literal com o SQL. */
export const ingestPolicy = {
  /** Comprimento mínimo/máximo da chave em hex (CHECK do banco). */
  streamKeyMinLength: 32,
  streamKeyMaxLength: 64,
  /** Tolerância padrão de silêncio, em segundos (DEFAULT da coluna). */
  defaultStaleAfterSeconds: 300,
  /** Limites aceitos para `stale_after_seconds` (CHECK do banco). */
  minStaleAfterSeconds: 60,
  maxStaleAfterSeconds: 86_400,
  /** Janela de anti-repetição do alerta de manutenção, em horas. */
  cooldownHours: 6,
} as const;

const STREAM_KEY_REGEX = new RegExp(
  `^[a-f0-9]{${ingestPolicy.streamKeyMinLength},${ingestPolicy.streamKeyMaxLength}}$`
);

/** Protocolos em que a câmera é quem inicia a conexão (push). */
export function isPushProtocol(protocol: IngestProtocol): boolean {
  return protocol === 'rtmp_push' || protocol === 'srt_push';
}

/** Valida a forma da chave sem depender do banco. */
export function isValidStreamKey(key: string | null | undefined): boolean {
  return typeof key === 'string' && STREAM_KEY_REGEX.test(key);
}

/**
 * Mascara a chave para exibição em listas e logs.
 * Nunca mostramos a chave inteira fora do campo dedicado com botão de copiar.
 */
export function maskStreamKey(key: string): string {
  if (!isValidStreamKey(key)) return '••••';
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

/** Normaliza a base do servidor de mídia removendo barra final e protocolo duplicado. */
function normalizeHost(base: string): string {
  return base.trim().replace(/\/+$/, '');
}

/**
 * Monta a URL que o instalador digita na câmera.
 * RTMP separa aplicação e chave; SRT usa `streamid`.
 */
export function buildPublishUrl(
  protocol: IngestProtocol,
  mediaHost: string,
  streamKey: string
): { url: string; streamKeyField: string | null } {
  const host = normalizeHost(mediaHost);
  if (protocol === 'rtmp_push') {
    return { url: `rtmp://${host}/ingest`, streamKeyField: streamKey };
  }
  if (protocol === 'srt_push') {
    return { url: `srt://${host}:8890?streamid=publish:ingest/${streamKey}`, streamKeyField: null };
  }
  return { url: '', streamKeyField: null };
}

export interface IngestEndpointSnapshot {
  protocol: IngestProtocol;
  status: IngestStatus;
  /** ISO-8601 ou null quando nunca publicou. */
  lastPublishAt: string | null;
  /** ISO-8601 da criação do endpoint. */
  createdAt: string;
  staleAfterSeconds: number;
}

export type IngestHealth = 'healthy' | 'silent' | 'never_published' | 'revoked' | 'not_push';

export interface IngestHealthVerdict {
  health: IngestHealth;
  /** Severidade equivalente à emitida no barramento de manutenção. */
  severity: 'none' | 'warning' | 'critical';
  reason: string;
  /** Segundos desde a última publicação (ou desde a criação, se nunca publicou). */
  silentForSeconds: number;
}

/**
 * Classifica a saúde de um endpoint de ingestão.
 *
 * Ordem das regras = ordem de gravidade, igual ao SQL:
 *   revogado  → fora do jogo (não é falha operacional);
 *   silêncio  → crítico (já publicou e parou: perdemos vídeo que existia);
 *   nunca     → aviso (pode ser instalação em andamento, não perda de sinal).
 *
 * `GREATEST(0, ...)` no cálculo protege contra recuo de relógio do servidor.
 */
export function classifyIngestHealth(
  endpoint: IngestEndpointSnapshot,
  now: Date = new Date()
): IngestHealthVerdict {
  if (!isPushProtocol(endpoint.protocol)) {
    return {
      health: 'not_push',
      severity: 'none',
      reason: 'câmera em modo puxar (RTSP)',
      silentForSeconds: 0,
    };
  }
  if (endpoint.status === 'revoked') {
    return { health: 'revoked', severity: 'none', reason: 'chave revogada', silentForSeconds: 0 };
  }

  const tolerance = Math.min(
    Math.max(endpoint.staleAfterSeconds, ingestPolicy.minStaleAfterSeconds),
    ingestPolicy.maxStaleAfterSeconds
  );
  const reference = endpoint.lastPublishAt ?? endpoint.createdAt;
  const elapsedMs = now.getTime() - new Date(reference).getTime();
  const silentForSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

  if (silentForSeconds <= tolerance) {
    return {
      health: 'healthy',
      severity: 'none',
      reason: endpoint.lastPublishAt ? 'publicando normalmente' : 'aguardando primeira publicação',
      silentForSeconds,
    };
  }

  if (endpoint.lastPublishAt) {
    return {
      health: 'silent',
      severity: 'critical',
      reason: `sem publicar há ${silentForSeconds}s (tolerância ${tolerance}s)`,
      silentForSeconds,
    };
  }

  return {
    health: 'never_published',
    severity: 'warning',
    reason: `nunca publicou desde o cadastro (${silentForSeconds}s)`,
    silentForSeconds,
  };
}

/** Rótulos em PT-BR para a UI. */
export const INGEST_HEALTH_LABEL: Record<IngestHealth, string> = {
  healthy: 'Recebendo vídeo',
  silent: 'Parou de enviar',
  never_published: 'Nunca enviou',
  revoked: 'Chave revogada',
  not_push: 'Modo puxar (RTSP)',
};

export const INGEST_PROTOCOL_LABEL: Record<IngestProtocol, string> = {
  rtsp_pull: 'Puxar da câmera (RTSP)',
  rtmp_push: 'Enviar da câmera (RTMP)',
  srt_push: 'Enviar da câmera (SRT)',
};
