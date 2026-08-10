/**
 * VISÃO — Mapeamento de códigos de falha da prévia ao vivo (rtsp-preview).
 *
 * Cada código traz uma mensagem curta + sugestão acionável em PT-BR.
 * Códigos vêm de três fontes:
 *   1. Edge Function `rtsp-preview` (server-side).
 *   2. MediaMTX (pull/publish) — retornados no payload `error`.
 *   3. Cliente (`hls_timeout`, `connection_dropped`) — heurísticas do player.
 */

export type LivePreviewErrorCode =
  | 'invalid_rtsp_url'
  | 'unauthorized'
  | 'rate_limited'
  | 'session_create_failed'
  | 'session_not_found'
  | 'max_duration_exceeded'
  | 'extend_failed'
  | 'mediamtx_pull_failed'
  | 'mediamtx_unreachable'
  | 'hls_timeout'
  | 'connection_dropped'
  | 'unknown_action'
  | 'invalid_json'
  | 'start_failed'
  | 'extend_failed_client'
  | 'unknown';

export interface LivePreviewErrorInfo {
  title: string;
  suggestion: string;
  severity: 'warning' | 'error';
  retryable: boolean;
}

const MAP: Record<LivePreviewErrorCode, LivePreviewErrorInfo> = {
  invalid_rtsp_url: {
    title: 'URL RTSP inválida',
    suggestion: 'Verifique se a URL começa com rtsp:// e se host/porta/canal estão corretos.',
    severity: 'error',
    retryable: false,
  },
  unauthorized: {
    title: 'Sessão expirada',
    suggestion: 'Faça login novamente e reabra o diálogo de cadastro.',
    severity: 'error',
    retryable: false,
  },
  rate_limited: {
    title: 'Muitas prévias em pouco tempo',
    suggestion: 'Aguarde ~60 segundos antes de tentar novamente para não sobrecarregar o servidor.',
    severity: 'warning',
    retryable: true,
  },
  session_create_failed: {
    title: 'Falha ao criar sessão de prévia',
    suggestion:
      'Tente novamente. Se persistir, verifique o status do serviço em Configurações → Stream.',
    severity: 'error',
    retryable: true,
  },
  session_not_found: {
    title: 'Sessão de prévia não encontrada',
    suggestion: 'A sessão pode ter expirado. Reinicie a prévia para gerar uma nova.',
    severity: 'warning',
    retryable: true,
  },
  max_duration_exceeded: {
    title: 'Limite de duração atingido',
    suggestion:
      'Cada prévia dura no máximo 240s (60s + 3 extensões). Reinicie se precisar de mais tempo.',
    severity: 'warning',
    retryable: false,
  },
  extend_failed: {
    title: 'Não foi possível estender a prévia',
    suggestion: 'Verifique sua conexão e tente estender novamente. A prévia atual continua ativa.',
    severity: 'warning',
    retryable: true,
  },
  extend_failed_client: {
    title: 'Falha ao solicitar extensão',
    suggestion:
      'Erro de rede antes de alcançar o servidor. A prévia atual continua ativa — tente novamente.',
    severity: 'warning',
    retryable: true,
  },
  mediamtx_pull_failed: {
    title: 'MediaMTX não conseguiu conectar à câmera',
    suggestion:
      'Confirme se a câmera está online, se as credenciais RTSP estão corretas e se a porta 554 está liberada no firewall.',
    severity: 'error',
    retryable: true,
  },
  mediamtx_unreachable: {
    title: 'Servidor MediaMTX indisponível',
    suggestion:
      'O servidor de streaming não respondeu. Verifique o container MediaMTX e tente novamente em instantes.',
    severity: 'error',
    retryable: true,
  },
  hls_timeout: {
    title: 'Prévia HLS não iniciou a tempo',
    suggestion:
      'A câmera aceitou a conexão, mas o segmento HLS não chegou em 10s. Reduza a resolução do substream ou verifique a latência da rede.',
    severity: 'error',
    retryable: true,
  },
  connection_dropped: {
    title: 'Conexão com a câmera caiu durante a prévia',
    suggestion:
      'O stream foi interrompido. Verifique estabilidade Wi-Fi/PoE da câmera e reinicie a prévia.',
    severity: 'error',
    retryable: true,
  },
  unknown_action: {
    title: 'Ação desconhecida',
    suggestion:
      'Atualize o app para a última versão — o comando enviado não é suportado pelo servidor.',
    severity: 'error',
    retryable: false,
  },
  invalid_json: {
    title: 'Requisição inválida',
    suggestion: 'Recarregue a página e tente novamente. Se persistir, reporte para o suporte.',
    severity: 'error',
    retryable: false,
  },
  start_failed: {
    title: 'Não foi possível iniciar a prévia',
    suggestion: 'Confirme URL, credenciais e conectividade com a câmera antes de tentar novamente.',
    severity: 'error',
    retryable: true,
  },
  unknown: {
    title: 'Erro inesperado',
    suggestion: 'Tente novamente. Se persistir, envie o código do erro para o suporte.',
    severity: 'error',
    retryable: true,
  },
};

export function resolveLivePreviewError(code: string | null | undefined): {
  code: LivePreviewErrorCode;
  info: LivePreviewErrorInfo;
} {
  const raw = String(code ?? '')
    .trim()
    .toLowerCase() as LivePreviewErrorCode;
  const info = MAP[raw] ?? MAP.unknown;
  return { code: (raw in MAP ? raw : 'unknown') as LivePreviewErrorCode, info };
}

export const LIVE_PREVIEW_ERROR_CODES = Object.keys(MAP) as LivePreviewErrorCode[];
