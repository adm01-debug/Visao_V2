/**
 * Security Headers — Onda 53 (Hardening).
 *
 * Aplica headers de segurança padrão OWASP em respostas de Edge Functions.
 * Complementa (não substitui) CORS.
 *
 * Referências:
 *  - OWASP Secure Headers Project
 *  - MDN: Content-Security-Policy, Strict-Transport-Security, Permissions-Policy
 */

export interface SecurityHeaderOptions {
  /** Permitir apenas HTTPS por 1 ano com preload. Default true. */
  hsts?: boolean;
  /** CSP estrita para respostas JSON de API. Default true. */
  csp?: boolean;
  /** Referrer-Policy. Default "no-referrer". */
  referrerPolicy?: string;
  /** Cross-Origin-Resource-Policy. Default "same-site". */
  corp?: 'same-origin' | 'same-site' | 'cross-origin';
}

/**
 * Retorna um objeto com headers de segurança prontos para merge.
 * Uso: new Response(body, { headers: { ...cors, ...securityHeaders() } })
 */
export function securityHeaders(opts: SecurityHeaderOptions = {}): Record<string, string> {
  const { hsts = true, csp = true, referrerPolicy = 'no-referrer', corp = 'same-site' } = opts;

  const h: Record<string, string> = {
    // Impede sniffing de MIME types
    'X-Content-Type-Options': 'nosniff',
    // Bloqueia embed em iframes de terceiros (defense-in-depth vs clickjacking)
    'X-Frame-Options': 'DENY',
    // Referrer minimizado
    'Referrer-Policy': referrerPolicy,
    // Desabilita APIs sensíveis por padrão para respostas de API
    'Permissions-Policy':
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
    // Isolamento cross-origin
    'Cross-Origin-Resource-Policy': corp,
    'Cross-Origin-Opener-Policy': 'same-origin',
    // Cache seguro por padrão em endpoints autenticados
    'Cache-Control': 'no-store',
  };

  if (hsts) {
    // 1 ano, incluindo subdomínios, elegível para preload
    h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  if (csp) {
    // CSP restrita para respostas de API JSON (sem scripts/inline).
    // Para páginas HTML, a CSP correta é aplicada no host (Vite build/CDN).
    h['Content-Security-Policy'] =
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
  }

  return h;
}

/**
 * Wrapper conveniente que combina headers arbitrários (ex.: CORS) com os de segurança.
 */
export function withSecurityHeaders(
  base: Record<string, string> = {},
  opts?: SecurityHeaderOptions
): Record<string, string> {
  return { ...securityHeaders(opts), ...base };
}
