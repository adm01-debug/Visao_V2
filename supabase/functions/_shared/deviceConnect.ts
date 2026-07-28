/**
 * Onda 191 — Camada pública da Conexão por Registro (`device-connect`).
 *
 * A Onda 190 definiu **quem pode entrar**. Esta onda define **o que o mundo
 * externo vê** quando bate na porta. É a superfície mais exposta do sistema:
 * não exige JWT (o gravador em campo não tem sessão de usuário), aceita
 * qualquer origem e é discável por qualquer um que descubra a URL.
 *
 * Por isso a regra aqui é sobre **silêncio**, não sobre lógica:
 *
 *  1. **Recusa é sempre idêntica.** Código inexistente, revogado, vencido,
 *     segredo errado ou graça encerrada produzem byte a byte a mesma resposta
 *     e o mesmo status HTTP. Quem sonda não aprende nada.
 *  2. **O segredo nunca volta.** Nem em sucesso, nem em erro, nem em log, nem
 *     na trilha — só o digest, que fica no banco.
 *  3. **O corpo do pedido não governa nada.** Prazo de sessão, versão e
 *     validade vêm do servidor; campos extras enviados pelo dispositivo são
 *     descartados sem eco (evita reflexão de conteúdo hostil).
 *  4. **Toda tentativa é registrada**, inclusive de dispositivo desconhecido —
 *     é assim que uma varredura fica visível para o operador.
 *  5. **O relógio é do servidor.** `now` jamais vem do dispositivo, senão
 *     bastaria mentir a hora para reviver uma graça de rotação encerrada.
 */

import type { AuthVerdict } from './deviceEnrollment.ts';
import { DEVICE_CODE_LENGTH } from './deviceEnrollment.ts';

/** Validade da credencial de sessão devolvida a um dispositivo aceito. */
export const CONNECT_SESSION_TTL_S = 300;

/** Tamanho mínimo/máximo aceito para o segredo apresentado (defesa de borda). */
export const SECRET_MIN_LENGTH = 16;
export const SECRET_MAX_LENGTH = 256;

export interface ParsedConnect {
  deviceCode: string;
  secret: string;
}

export type ParseResult =
  | { ok: true; value: ParsedConnect }
  | { ok: false; kind: 'not_json' | 'unusable' };

/**
 * Lê o pedido de conexão.
 *
 * `not_json` é a única falha que merece resposta distinta (400): ela não fala
 * de nenhum dispositivo, então não vaza existência. Qualquer outro problema —
 * campo faltando, tipo errado, código fora de forma, segredo de tamanho
 * implausível — vira `unusable` e desce pelo mesmo cano das recusas.
 */
export function parseConnectRequest(raw: unknown): ParseResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, kind: 'not_json' };
  }
  const body = raw as Record<string, unknown>;
  const deviceCode = body.deviceCode;
  const secret = body.secret;

  if (typeof deviceCode !== 'string' || typeof secret !== 'string') {
    return { ok: false, kind: 'unusable' };
  }
  if (!new RegExp(`^[A-Z0-9]{${DEVICE_CODE_LENGTH}}$`).test(deviceCode)) {
    return { ok: false, kind: 'unusable' };
  }
  if (secret.length < SECRET_MIN_LENGTH || secret.length > SECRET_MAX_LENGTH) {
    return { ok: false, kind: 'unusable' };
  }
  return { ok: true, value: { deviceCode, secret } };
}

export interface PublicResponse {
  status: number;
  body: Record<string, unknown>;
}

/** A recusa canônica. Uma constante, para que nenhum caminho possa enriquecê-la. */
export function deniedResponse(): PublicResponse {
  return { status: 401, body: { connected: false } };
}

/** Pedido ilegível (nem chega a nomear um dispositivo). */
export function malformedResponse(): PublicResponse {
  return { status: 400, body: { connected: false, error: 'bad_request' } };
}

/**
 * Traduz o veredito interno em resposta pública.
 *
 * `usedGrace` vira `secretStale`: é a única informação extra que um dispositivo
 * **já autenticado** recebe, e ela é útil (avisa que o segredo em uso está
 * aposentado) sem ser sensível — quem a lê já provou identidade.
 */
export function toPublicResponse(verdict: AuthVerdict): PublicResponse {
  if (verdict.outcome !== 'accepted') return deniedResponse();
  return {
    status: 200,
    body: {
      connected: true,
      secretVersion: verdict.usedVersion,
      secretStale: verdict.usedGrace,
      sessionTtlSeconds: CONNECT_SESSION_TTL_S,
    },
  };
}

export interface AuditEntry {
  registration_id: string | null;
  device_code: string;
  user_id: string | null;
  event: 'auth_accepted' | 'auth_denied';
  reason: string;
  secret_version: number | null;
  used_grace: boolean;
  source_ip: string | null;
}

export interface AuditContext {
  registrationId: string | null;
  userId: string | null;
  deviceCode: string;
  sourceIp: string | null;
}

/** Monta a linha de trilha. O motivo detalhado vive aqui — e só aqui. */
export function toAuditEntry(verdict: AuthVerdict, ctx: AuditContext): AuditEntry {
  return {
    registration_id: ctx.registrationId,
    device_code: ctx.deviceCode,
    user_id: ctx.userId,
    event: verdict.outcome === 'accepted' ? 'auth_accepted' : 'auth_denied',
    reason: verdict.reason,
    secret_version: verdict.usedVersion,
    used_grace: verdict.usedGrace,
    source_ip: normalizeIp(ctx.sourceIp),
  };
}

/**
 * Extrai o primeiro IP de `x-forwarded-for`.
 *
 * A coluna é `inet`: um valor sujo derruba a escrita da trilha — e perder a
 * trilha é pior do que perder o IP. Na dúvida, devolvemos `null`.
 */
export function normalizeIp(value: string | null): string | null {
  if (typeof value !== 'string') return null;
  const first = value.split(',')[0]?.trim() ?? '';
  if (first.length === 0 || first.length > 45) return null;
  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(first);
  const isIpv6 = /^[0-9a-fA-F:]+$/.test(first) && first.includes(':');
  if (isIpv4) {
    return first.split('.').every((part) => Number(part) <= 255) ? first : null;
  }
  return isIpv6 ? first : null;
}
