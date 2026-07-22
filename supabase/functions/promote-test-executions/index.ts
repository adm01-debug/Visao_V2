/**
 * VISÃO - Promover execuções do Modo Teste para Produção
 *
 * Fluxo:
 *  1. Autentica o usuário via JWT (getClaims).
 *  2. Aceita `{ executionIds?: string[], sessionId?: string, promoteAll?: boolean }`.
 *     - `sessionId`: promove todas as execuções `is_test=true` capturadas dentro
 *       da janela [started_at, coalesce(ended_at, now())] da sessão, respeitando
 *       o escopo (all/camera/rule).
 *     - `executionIds`: promove exatamente esses IDs.
 *  3. Para cada execução:
 *     a. Remove flag `is_test` da execução e do `alerts` vinculado.
 *     b. Reenvia a notificação real via `send-alert-notification`,
 *        reconstituindo canais/recipients a partir de `notification_configs`
 *        e ações da regra original.
 *  4. Retorna resumo `{ promoted, notified, failed[], skipped[] }`.
 *
 * Segurança:
 *  - Só promove execuções cujo `user_id` == JWT.sub.
 *  - Rate limit sensível.
 *  - Idempotência por (execution_id) para não reenviar duas vezes.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateInput } from "../_shared/validation.ts";

const log = createLogger("promote-test-executions");

const bodySchema = z
  .object({
    executionIds: z.array(z.string().uuid()).max(500).optional(),
    sessionId: z.string().uuid().optional(),
  })
  .refine((v) => (v.executionIds && v.executionIds.length > 0) || v.sessionId, {
    message: "Informe executionIds ou sessionId",
  });

type PromoteRow = {
  id: string;
  rule_id: string | null;
  user_id: string;
  alert_id: string | null;
  triggered_at: string;
  actions_executed: string[] | null;
  is_test: boolean;
  alert: {
    id: string;
    camera_id: string | null;
    camera_name: string;
    type: string;
    severity: string;
    message: string;
    timestamp: string;
    thumbnail: string | null;
    is_test: boolean;
  } | null;
  rule: {
    id: string;
    name: string;
    actions: string[] | null;
    category: string;
    severity: string;
  } | null;
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rl = checkRateLimit(req, RATE_LIMITS.sensitive, "promote-test", corsHeaders);
  if (!rl.allowed) return rl.response;

  // Auth
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claims.claims.sub as string;

  const raw = await req.json().catch(() => ({}));
  const validation = validateInput(bodySchema, raw, corsHeaders);
  if (!validation.success) return validation.response;
  const { executionIds, sessionId } = validation.data;

  const admin = createClient(SUPABASE_URL, SUPABASE_SRV, { auth: { persistSession: false } });

  // 1) Resolver escopo -> lista de execution IDs
  let targetIds: string[] = executionIds ?? [];
  if (sessionId) {
    const { data: session, error: sErr } = await admin
      .from("test_mode_sessions")
      .select("id,user_id,scope,scope_ids,started_at,ended_at,expires_at")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (sErr || !session) {
      return new Response(JSON.stringify({ error: "Sessão não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const from = session.started_at as string;
    const to = (session.ended_at as string) ?? new Date().toISOString();
    let q = admin
      .from("rule_executions")
      .select("id, rule_id, alert:alerts!rule_executions_alert_id_fkey(camera_id)")
      .eq("user_id", userId)
      .eq("is_test", true)
      .gte("triggered_at", from)
      .lte("triggered_at", to);
    const { data: rows, error: rErr } = await q;
    if (rErr) {
      return new Response(JSON.stringify({ error: rErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const scopeIds = (session.scope_ids as string[]) ?? [];
    const filtered = (rows ?? []).filter((r: { rule_id: string | null; alert: { camera_id: string | null } | null }) => {
      if (session.scope === "all") return true;
      if (session.scope === "rule") return r.rule_id ? scopeIds.includes(r.rule_id) : false;
      if (session.scope === "camera") {
        const cid = r.alert?.camera_id ?? null;
        return cid ? scopeIds.includes(cid) : false;
      }
      return false;
    });
    targetIds = [...new Set([...targetIds, ...filtered.map((r: { id: string }) => r.id)])];
  }

  if (targetIds.length === 0) {
    return new Response(
      JSON.stringify({ promoted: 0, notified: 0, failed: [], skipped: [], message: "Nada para promover" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 2) Carregar execuções + alerts + rule (limite defensivo)
  const { data: execs, error: eErr } = await admin
    .from("rule_executions")
    .select(
      "id, rule_id, user_id, alert_id, triggered_at, actions_executed, is_test, " +
        "alert:alerts!rule_executions_alert_id_fkey(id, camera_id, camera_name, type, severity, message, timestamp, thumbnail, is_test), " +
        "rule:rules!rule_executions_rule_id_fkey(id, name, actions, category, severity)",
    )
    .in("id", targetIds)
    .eq("user_id", userId)
    .limit(500);
  if (eErr) {
    return new Response(JSON.stringify({ error: eErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = (execs ?? []) as unknown as PromoteRow[];

  // 3) Carregar configuração de notificações do usuário (destinatários)
  const { data: notifCfg } = await admin
    .from("notification_configs")
    .select("channels, email_recipients, phone_recipients, webhook_urls, severity_filter, enabled")
    .eq("user_id", userId)
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const promoted: string[] = [];
  const notified: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const row of rows) {
    if (!row.is_test) {
      skipped.push({ id: row.id, reason: "already_promoted" });
      continue;
    }
    // 3a) Remover flag na execução
    const { error: uErr } = await admin
      .from("rule_executions")
      .update({ is_test: false })
      .eq("id", row.id)
      .eq("user_id", userId);
    if (uErr) {
      failed.push({ id: row.id, reason: `execution_update: ${uErr.message}` });
      continue;
    }
    promoted.push(row.id);

    // 3b) Remover flag no alert vinculado
    if (row.alert?.id) {
      await admin.from("alerts").update({ is_test: false }).eq("id", row.alert.id).eq("user_id", userId);
    }

    // 3c) Reenviar notificação — apenas se há um alert e canais configurados
    if (!row.alert) {
      skipped.push({ id: row.id, reason: "no_linked_alert" });
      continue;
    }
    const ruleActions = new Set((row.rule?.actions ?? []) as string[]);
    const cfgChannels = (notifCfg?.channels ?? []) as string[];
    // Canais efetivos: intersecção entre canais da configuração e ações da regra
    // que representam notificação (email/telegram/webhook/sms/push/whatsapp).
    const notifyActions = ["email", "telegram", "webhook", "push", "whatsapp"];
    const channels = cfgChannels.filter(
      (c) => notifyActions.includes(c) && (ruleActions.size === 0 || ruleActions.has(c) || ruleActions.has("notify")),
    ) as Array<"email" | "telegram" | "whatsapp" | "webhook" | "push">;
    if (channels.length === 0) {
      skipped.push({ id: row.id, reason: "no_channels" });
      continue;
    }

    try {
      const invokeRes = await fetch(`${SUPABASE_URL}/functions/v1/send-alert-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SRV}`,
          "x-idempotency-key": `promote:${row.id}`,
        },
        body: JSON.stringify({
          alertId: row.alert.id,
          cameraId: row.alert.camera_id,
          cameraName: row.alert.camera_name,
          type: row.alert.type,
          severity: row.alert.severity,
          message: row.alert.message,
          timestamp: row.alert.timestamp,
          snapshotUrl: row.alert.thumbnail ?? undefined,
          channels,
          recipients: {
            emails: notifCfg?.email_recipients ?? [],
            phones: notifCfg?.phone_recipients ?? [],
            webhookUrls: notifCfg?.webhook_urls ?? [],
          },
          // Sem `testContext` -> a Edge Function NÃO fará short-circuit.
        }),
      });
      if (!invokeRes.ok) {
        const body = await invokeRes.text();
        failed.push({ id: row.id, reason: `notify_${invokeRes.status}: ${body.slice(0, 200)}` });
      } else {
        notified.push(row.id);
      }
    } catch (err) {
      failed.push({
        id: row.id,
        reason: `notify_throw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  log.info("Promotion completed", {
    userId,
    promoted: promoted.length,
    notified: notified.length,
    failed: failed.length,
    skipped: skipped.length,
    sessionId: sessionId ?? null,
  });

  return new Response(
    JSON.stringify({
      promoted: promoted.length,
      notified: notified.length,
      failed,
      skipped,
      ids: { promoted, notified },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
