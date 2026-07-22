/**
 * VISÃO — Wizard Apply Camera Setup (idempotente)
 *
 * Envolve o RPC public.apply_camera_setup com cache de idempotência
 * (idempotency_keys), evitando duplicação em reenvio/refresh no meio
 * do onboarding. A chave é sempre namespaced ao usuário para impedir
 * colisão entre tenants.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withIdempotency } from "../_shared/idempotency.ts";

interface Payload {
  camera_id: string;
  zones: unknown[];
  rules: unknown[];
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rawKey = req.headers.get("x-idempotency-key");
    const body = (await req.json()) as Payload;

    if (!body?.camera_id) {
      return new Response(JSON.stringify({ error: "camera_id_required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Namespace por usuário + câmera para evitar colisão cross-tenant.
    const key = rawKey ? `wizard:${userRes.user.id}:${body.camera_id}:${rawKey}` : null;

    const { data, fromCache } = await withIdempotency(key, async () => {
      const { data: rpcData, error: rpcError } = await userClient.rpc("apply_camera_setup", {
        _camera_id: body.camera_id,
        _zones: (body.zones ?? []) as never,
        _rules: (body.rules ?? []) as never,
      });
      if (rpcError) {
        throw new Error(rpcError.message);
      }
      return rpcData;
    });

    return new Response(JSON.stringify({ ...data, from_cache: fromCache }), {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "x-idempotent-replay": fromCache ? "true" : "false",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal_error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
