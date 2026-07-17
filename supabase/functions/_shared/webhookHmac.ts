/**
 * Utilitário HMAC para webhooks v2 (Onda 49).
 * Assinatura: HMAC-SHA256(secret, `${timestamp}.${body}`)
 * Header enviado: X-VISAO-Signature: t=<unix>,v1=<hex>
 * Rejeita se |now - t| > 300s (replay attack prevention).
 */

const encoder = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signWebhook(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): Promise<string> {
  const v1 = await hmacSha256Hex(secret, `${timestamp}.${body}`);
  return `t=${timestamp},v1=${v1}`;
}

export async function verifyWebhook(
  secret: string,
  body: string,
  signatureHeader: string,
  toleranceSec = 300,
): Promise<{ valid: boolean; reason?: string }> {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string]),
  );
  const t = parseInt(parts.t ?? "", 10);
  const v1 = parts.v1;
  if (!t || !v1) return { valid: false, reason: "malformed_signature" };
  if (Math.abs(Math.floor(Date.now() / 1000) - t) > toleranceSec) {
    return { valid: false, reason: "timestamp_out_of_tolerance" };
  }
  const expected = await hmacSha256Hex(secret, `${t}.${body}`);
  // Timing-safe compare
  if (expected.length !== v1.length) return { valid: false, reason: "signature_mismatch" };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0 ? { valid: true } : { valid: false, reason: "signature_mismatch" };
}
