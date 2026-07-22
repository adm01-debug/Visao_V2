// Camera Credentials Vault — Onda Fortress 2
// Ações: store | reveal | audit | migrate_batch | rotate_key
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";

const VAULT_KEY = Deno.env.get("CAMERA_VAULT_KEY") ?? "";
const KEK_V1 = Deno.env.get("CAMERA_VAULT_KEK_V1") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("store"), camera_id: z.string().uuid(), stream_url: z.string().min(4).max(2048) }),
  z.object({ action: z.literal("reveal"), camera_id: z.string().uuid() }),
  z.object({ action: z.literal("audit") }),
  z.object({ action: z.literal("migrate_batch"), limit: z.number().int().min(1).max(200).default(50) }),
  z.object({ action: z.literal("rotate_key"), new_key: z.string().min(16).max(512) }),
  z.object({ action: z.literal("rotate_dek"), camera_id: z.string().uuid() }),
  z.object({ action: z.literal("rewrap_kek"), new_kek: z.string().min(16).max(512), from_version: z.number().int().min(0).max(255).default(1), to_version: z.number().int().min(1).max(255), limit: z.number().int().min(1).max(1000).default(200) }),
  z.object({ action: z.literal("backfill_envelope"), limit: z.number().int().min(1).max(500).default(100) }),
  z.object({ action: z.literal("stats") }),
]);

const j = (payload: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json" } });

const log = (level: "info" | "warn" | "error", msg: string, meta: Record<string, unknown> = {}) => {
  // never log keys/passwords
  console.log(JSON.stringify({ level, fn: "camera-credentials-vault", msg, ...meta, ts: new Date().toISOString() }));
};

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const pre = handleCors(req);
  if (pre) return pre;

  if (!VAULT_KEY || VAULT_KEY.length < 16) {
    log("error", "CAMERA_VAULT_KEY missing or too short");
    return j({ error: "vault_key_not_configured" }, 500, cors);
  }

  const rl = checkRateLimit(req, RATE_LIMITS.sensitive, "camera-vault", cors);
  if (!rl.allowed) return rl.response;

  let payload: unknown;
  try { payload = await req.json(); } catch { return j({ error: "invalid_json" }, 400, cors); }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return j({ error: "validation_failed", details: parsed.error.flatten() }, 400, cors);
  const body = parsed.data;

  const authHeader = req.headers.get("Authorization") ?? "";
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Identifica usuário chamador (exceto reveal que é service_role only)
  let userId: string | null = null;
  let userRole: string | null = null;
  if (body.action !== "reveal") {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: uerr } = await anon.auth.getUser();
    if (uerr || !u.user) return j({ error: "unauthorized" }, 401, cors);
    userId = u.user.id;
    const { data: r } = await admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    userRole = r?.role ?? null;
  }

  try {
    switch (body.action) {
      case "audit": {
        const { data, error } = await admin.rpc("audit_cameras_embedded_credentials");
        if (error) throw error;
        const rows = (data ?? []) as Array<{ user_id: string }>;
        const filtered = userRole === "admin" ? rows : rows.filter((r) => r.user_id === userId);
        log("info", "audit", { count: filtered.length, actor: userId, role: userRole });
        return j({ ok: true, cameras: filtered }, 200, cors);
      }

      case "store": {
        const { data, error } = await admin.rpc("set_camera_credentials", {
          p_camera_id: body.camera_id,
          p_stream_url: body.stream_url,
          p_key: VAULT_KEY,
        });
        if (error) throw error;
        log("info", "store", { camera_id: body.camera_id, actor: userId });
        return j({ ok: true, credential_id: data }, 200, cors);
      }

      case "migrate_batch": {
        if (userRole !== "admin") return j({ error: "forbidden_admin_only" }, 403, cors);
        const { data: audit, error: aerr } = await admin.rpc("audit_cameras_embedded_credentials");
        if (aerr) throw aerr;
        const list = ((audit ?? []) as Array<{ camera_id: string; stream_url: string }>).slice(0, body.limit);
        let migrated = 0, failed = 0;
        for (const row of list) {
          const { error } = await admin.rpc("set_camera_credentials", {
            p_camera_id: row.camera_id,
            p_stream_url: row.stream_url,
            p_key: VAULT_KEY,
          });
          if (error) { failed++; log("warn", "migrate_row_failed", { camera_id: row.camera_id, err: error.message }); }
          else migrated++;
        }
        log("info", "migrate_batch", { migrated, failed, actor: userId });
        return j({ ok: true, migrated, failed, total: list.length }, 200, cors);
      }

      case "rotate_key": {
        if (userRole !== "admin") return j({ error: "forbidden_admin_only" }, 403, cors);
        const { data, error } = await admin.rpc("rotate_camera_vault_key", {
          old_key: VAULT_KEY,
          new_key: body.new_key,
        });
        if (error) throw error;
        log("info", "rotate_key", { actor: userId, rotated: (data as Array<{ rotated_count: number }>)[0]?.rotated_count });
        // devolve apenas contagem e fingerprint — nunca a nova chave
        return j({ ok: true, result: data }, 200, cors);
      }

      case "reveal": {
        // service_role only: verifica cabeçalho explícito
        if (authHeader !== `Bearer ${SERVICE_KEY}`) return j({ error: "service_role_required" }, 403, cors);
        const { data, error } = await admin.rpc("get_camera_stream_url", {
          p_camera_id: body.camera_id,
          p_key: VAULT_KEY,
        });
        if (error) throw error;
        return j({ ok: true, stream_url: data }, 200, cors);
      }

      case "stats": {
        const { data, error } = await admin.rpc("envelope_encryption_stats");
        if (error) throw error;
        return j({ ok: true, stats: (data as unknown[])[0] ?? data }, 200, cors);
      }

      case "rotate_dek": {
        if (userRole !== "admin") return j({ error: "forbidden_admin_only" }, 403, cors);
        if (!KEK_V1 || KEK_V1.length < 16) return j({ error: "kek_not_configured" }, 500, cors);
        const { data, error } = await admin.rpc("rotate_camera_dek", {
          p_camera_id: body.camera_id, p_kek: KEK_V1, p_kek_version: 1,
        });
        if (error) throw error;
        log("info", "rotate_dek", { actor: userId, camera_id: body.camera_id, rotated: data });
        return j({ ok: true, rotated: data }, 200, cors);
      }

      case "rewrap_kek": {
        if (userRole !== "admin") return j({ error: "forbidden_admin_only" }, 403, cors);
        if (!KEK_V1 || KEK_V1.length < 16) return j({ error: "kek_not_configured" }, 500, cors);
        const { data, error } = await admin.rpc("rewrap_camera_vault_kek", {
          p_old_kek: KEK_V1, p_new_kek: body.new_kek,
          p_from_version: body.from_version, p_to_version: body.to_version, p_limit: body.limit,
        });
        if (error) throw error;
        log("info", "rewrap_kek", { actor: userId, from: body.from_version, to: body.to_version, result: data });
        return j({ ok: true, result: data }, 200, cors);
      }

      case "backfill_envelope": {
        if (userRole !== "admin") return j({ error: "forbidden_admin_only" }, 403, cors);
        if (!KEK_V1 || KEK_V1.length < 16) return j({ error: "kek_not_configured" }, 500, cors);
        const { data, error } = await admin.rpc("backfill_envelope_encryption", {
          p_kek: KEK_V1, p_kek_version: 1, p_limit: body.limit,
        });
        if (error) throw error;
        log("info", "backfill_envelope", { actor: userId, result: data });
        return j({ ok: true, result: data }, 200, cors);
      }
    }
  } catch (err) {
    log("error", "handler_error", { err: (err as Error).message, action: body.action });
    return j({ error: "internal_error", detail: (err as Error).message }, 500, cors);
  }
});
