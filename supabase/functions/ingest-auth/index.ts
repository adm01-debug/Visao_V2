// ingest-auth — Onda 124.
// Webhook chamado pelo servidor de mídia (MediaMTX) nos hooks de publish/unpublish.
// Autoriza o envio de vídeo empurrado pela câmera a partir da chave de publicação,
// sem exigir abertura de portas na rede do cliente.
//
// Contrato:
//   POST { action: "publish" | "unpublish", stream_key, protocol?, client_ip? }
//   200 { allowed: true, camera_id }  -> MediaMTX libera o publisher
//   403 { allowed: false, reason }    -> MediaMTX derruba a conexão
//
// Segurança: a rota é pública para o servidor de mídia, mas exige o segredo
// compartilhado `INGEST_WEBHOOK_SECRET` no header `x-ingest-secret`. Toda a
// decisão fica na rotina `public.authorize_ingest_publish`, service_role only.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ingest-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const STREAM_KEY_RE = /^[a-f0-9]{32,64}$/;
const PROTOCOLS = new Set(["rtmp_push", "srt_push"]);

/** Comparação em tempo constante para não vazar o segredo por timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "method_not_allowed" }, 405);

  const expectedSecret = Deno.env.get("INGEST_WEBHOOK_SECRET");
  if (!expectedSecret) {
    console.error(JSON.stringify({ level: "error", msg: "INGEST_WEBHOOK_SECRET ausente" }));
    return j({ allowed: false, reason: "misconfigured" }, 500);
  }
  const provided = req.headers.get("x-ingest-secret") ?? "";
  if (!safeEqual(provided, expectedSecret)) {
    return j({ allowed: false, reason: "unauthorized" }, 401);
  }

  let payload: {
    action?: string;
    stream_key?: string;
    protocol?: string;
    client_ip?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return j({ allowed: false, reason: "invalid_json" }, 400);
  }

  const action = (payload.action ?? "publish").trim();
  const streamKey = (payload.stream_key ?? "").trim().toLowerCase();
  const protocol = (payload.protocol ?? "rtmp_push").trim();
  const clientIp = (payload.client_ip ?? "").trim().slice(0, 64) || null;

  if (!STREAM_KEY_RE.test(streamKey)) {
    return j({ allowed: false, reason: "malformed_key" }, 403);
  }
  if (action === "publish" && !PROTOCOLS.has(protocol)) {
    return j({ allowed: false, reason: "unsupported_protocol" }, 403);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    if (action === "unpublish") {
      const { data, error } = await admin.rpc("mark_ingest_unpublish", {
        _stream_key: streamKey,
      });
      if (error) throw new Error(error.message);
      return j({ ok: Boolean((data as { ok?: boolean } | null)?.ok) });
    }

    const { data, error } = await admin.rpc("authorize_ingest_publish", {
      _stream_key: streamKey,
      _client_ip: clientIp,
      _protocol: protocol,
    });
    if (error) throw new Error(error.message);

    const verdict = (data ?? { allowed: false, reason: "no_verdict" }) as {
      allowed: boolean;
      reason?: string;
      camera_id?: string;
    };

    // Log estruturado sem a chave: auditoria sem vazar credencial.
    console.log(JSON.stringify({
      level: verdict.allowed ? "info" : "warn",
      msg: "ingest_publish_decision",
      allowed: verdict.allowed,
      reason: verdict.reason ?? null,
      camera_id: verdict.camera_id ?? null,
      key_prefix: streamKey.slice(0, 6),
      ts: new Date().toISOString(),
    }));

    return j(verdict, verdict.allowed ? 200 : 403);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ level: "error", msg: "ingest_auth_failed", detail }));
    return j({ allowed: false, reason: "internal_error", details: detail }, 500);
  }
});
