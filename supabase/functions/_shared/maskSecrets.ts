// Wave Fortress 3 — mascarador global de segredos em logs de edge functions.
// Escopo: URLs no formato `scheme://user:pass@host` (RTSP/HTTP/etc.).

const URL_CRED_RE = /:\/\/([^:/@\s]+):([^@\s]+)@/g;

export function maskSecrets(input: unknown): unknown {
  if (input == null) return input;
  if (typeof input === "string") return input.replace(URL_CRED_RE, "://***:***@");
  if (Array.isArray(input)) return input.map(maskSecrets);
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) out[k] = maskSecrets(v);
    return out;
  }
  return input;
}

export function maskString(s: string): string {
  return s.replace(URL_CRED_RE, "://***:***@");
}
