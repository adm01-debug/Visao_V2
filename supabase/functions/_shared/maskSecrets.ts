// Wave Fortress 4 — mascarador global de segredos em logs de edge functions.
// Escopo: URLs `scheme://user:pass@host` (RTSP/HTTP/etc.), robusto a `@`/`:` na senha,
// tokens `Authorization: Bearer ...` e query strings `?password=`/`?token=`/`?apikey=`.

// Encontra `scheme://` (esquema RFC 3986: letra + [a-z0-9+-.]).
const SCHEME_RE = /([a-zA-Z][a-zA-Z0-9+.\-]*):\/\//g;

/**
 * Mascara userinfo em URLs mesmo quando a senha contém `@` ou `:`.
 * Estratégia: localiza o ÚLTIMO `@` antes do primeiro delimitador de authority
 * (`/`, `?`, `#`, espaço, aspas) — RFC 3986 §3.2.
 */
export function maskString(input: string): string {
  if (!input) return input;
  let out = "";
  let cursor = 0;
  SCHEME_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SCHEME_RE.exec(input)) !== null) {
    const authStart = m.index + m[0].length;
    // Fim da authority: primeiro delimitador após scheme://
    let end = authStart;
    while (end < input.length && !/[\/\?\#\s"'`<>]/.test(input[end])) end++;
    const authority = input.slice(authStart, end);
    const at = authority.lastIndexOf("@");
    if (at > 0) {
      // Há userinfo → substitui
      out += input.slice(cursor, authStart) + "***:***@" + authority.slice(at + 1);
      cursor = end;
    }
  }
  out += input.slice(cursor);

  // Query params sensíveis: ?password=..., &token=..., ?apikey=...
  out = out.replace(
    /([?&](?:password|passwd|pwd|token|apikey|api_key|secret|access_token)=)([^&\s"'`<>]+)/gi,
    "$1***",
  );

  // Authorization: Bearer <token>
  out = out.replace(/(Authorization:\s*Bearer\s+)([A-Za-z0-9._\-]+)/gi, "$1***");

  return out;
}

export function maskSecrets(input: unknown): unknown {
  if (input == null) return input;
  if (typeof input === "string") return maskString(input);
  if (Array.isArray(input)) return input.map(maskSecrets);
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      // Redige valores de chaves obviamente sensíveis independentemente do tipo
      if (/password|passwd|pwd|secret|token|apikey|api_key|authorization/i.test(k) && typeof v === "string" && v) {
        out[k] = "***";
      } else {
        out[k] = maskSecrets(v);
      }
    }
    return out;
  }
  return input;
}
