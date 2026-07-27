// Onda 155 — puller de eventos nativos ONVIF (PullPoint).
//
// Esta função NÃO decide nada. A decisão vive em `_shared/pullPointLease.ts`,
// espelhada byte a byte de `src/lib/devices/pullPointLease.ts` e exercitada por
// milhares de cenários no CI. Aqui só existe transporte: falar SOAP com o
// equipamento, traduzir a resposta na taxonomia de falha e persistir o
// resultado. Se algum dia aparecer um `if` de política neste arquivo, ele está
// no lugar errado.
//
// Chamada exclusivamente pelo agendador interno (chave de serviço). Não há
// caminho de usuário: nenhum operador precisa "puxar eventos manualmente", e
// abrir esse caminho só criaria uma superfície para martelar câmeras alheias.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import { soapCall, wsseHeader, escapeXml } from "../_shared/onvifSoap.ts";
import {
  decidePullPoint,
  clampLeaseMs,
  pullPointEventKey,
  MAX_LEASE_MS,
  type PullPointSubscription,
  type PullPointFailureKind,
} from "../_shared/pullPointLease.ts";
import {
  parseSubscribeResponse,
  parsePullMessages,
  leaseFromDeviceClocks,
  classifySoapFailure,
  isDeadSubscriptionFault,
} from "../_shared/onvifPullPointParse.ts";

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Empréstimo pedido ao equipamento. 5 min é o que a frota XM aceita sem reclamar. */
const REQUESTED_LEASE_MS = 300_000;
/** Teto de mensagens por pull: evita uma câmera em tempestade monopolizar a rodada. */
const PULL_MESSAGE_LIMIT = 40;
/** `PullMessages` é chamada de espera longa — timeout maior que o das demais. */
const PULL_TIMEOUT_MS = 15_000;
/** Câmeras processadas por rodada. O agendador roda a cada minuto. */
const DEFAULT_BATCH = 25;

function isoDuration(ms: number): string {
  return `PT${Math.round(ms / 1000)}S`;
}

interface CameraRow {
  id: string;
  user_id: string;
  is_active: boolean | null;
}

interface SubRow {
  id: string;
  camera_id: string;
  user_id: string;
  subscription_ref: string | null;
  status: "pending" | "active" | "backoff" | "retired";
  lease_started_at: string | null;
  termination_at: string | null;
  lease_duration_ms: number;
  consecutive_failures: number;
  last_failure_kind: PullPointFailureKind;
  last_attempt_at: string | null;
}

function toMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, service);
  const started = Date.now();

  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  // Dois portadores legítimos e nenhum outro: a chave de serviço (invocação
  // administrativa) e o segredo do agendador, guardado em
  // `internal_cron_secrets` porque o cron do banco não tem como portar a chave
  // de serviço. Usuário final não entra aqui por desenho — "puxar eventos
  // manualmente" não é operação de ninguém, e abrir esse caminho só daria um
  // martelo para bater em câmera alheia.
  let authorized = bearer !== "" && bearer === service;
  if (!authorized) {
    const presented = (req.headers.get("x-internal-secret") ?? "").trim();
    if (presented !== "") {
      const { data: secretRow } = await admin
        .from("internal_cron_secrets")
        .select("secret")
        .eq("name", "onvif_event_puller")
        .maybeSingle();
      const expected = String(secretRow?.secret ?? "");
      authorized = expected !== "" && presented === expected;
    }
  }
  if (!authorized) return j({ error: "forbidden" }, 403);


  let body: { camera_id?: string; limit?: number } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const batch = Math.min(100, Math.max(1, Number(body.limit ?? DEFAULT_BATCH) || DEFAULT_BATCH));

  // ---- 1. garantir uma assinatura por câmera ONVIF ativa -------------------
  // Criar a linha aqui (e não no cadastro da câmera) mantém o subsistema
  // autossuficiente: câmeras cadastradas antes da Onda 155 entram sozinhas.
  const { data: configured } = await admin
    .from("camera_ptz_config")
    .select("camera_id, endpoint, port, username, password_encrypted")
    .not("endpoint", "is", null);

  const configById = new Map<string, Record<string, unknown>>();
  for (const row of configured ?? []) configById.set(String(row.camera_id), row);

  if (configById.size === 0) return j({ ok: true, processed: 0, reason: "no_onvif_cameras" });

  const { data: cameras } = await admin
    .from("cameras")
    .select("id, user_id, is_active")
    .in("id", [...configById.keys()]);

  const cameraById = new Map<string, CameraRow>();
  for (const cam of (cameras ?? []) as CameraRow[]) cameraById.set(cam.id, cam);

  const missing = [...cameraById.values()]
    .filter((c) => c.is_active !== false)
    .map((c) => ({ user_id: c.user_id, camera_id: c.id, lease_duration_ms: REQUESTED_LEASE_MS }));
  if (missing.length > 0) {
    await admin
      .from("onvif_event_subscriptions")
      .upsert(missing, { onConflict: "camera_id", ignoreDuplicates: true });
  }

  // ---- 2. selecionar o lote --------------------------------------------------
  let query = admin
    .from("onvif_event_subscriptions")
    .select("*")
    .neq("status", "retired")
    .order("termination_at", { ascending: true, nullsFirst: true })
    .limit(batch);
  if (body.camera_id) query = query.eq("camera_id", body.camera_id);

  const { data: subs, error: subsError } = await query;
  if (subsError) return j({ error: "query_failed", detail: subsError.message }, 500);

  const summary = { processed: 0, events: 0, deduped: 0, retired: 0, failures: 0 };
  const actions: Record<string, number> = {};

  for (const raw of (subs ?? []) as SubRow[]) {
    const camera = cameraById.get(raw.camera_id);
    const cfg = configById.get(raw.camera_id);
    const now = Date.now();

    const sub: PullPointSubscription = {
      id: raw.id,
      status: raw.status,
      terminationAtMs: toMs(raw.termination_at),
      leaseStartedAtMs: toMs(raw.lease_started_at),
      leaseDurationMs: clampLeaseMs(raw.lease_duration_ms),
      consecutiveFailures: raw.consecutive_failures,
      lastFailureKind: raw.last_failure_kind,
      lastAttemptAtMs: toMs(raw.last_attempt_at),
      // Câmera sumida ou desativada tem o mesmo efeito: recolher (P5).
      cameraEnabled: Boolean(camera) && camera?.is_active !== false && Boolean(cfg),
    };

    const decision = decidePullPoint(sub, now);
    actions[decision.action] = (actions[decision.action] ?? 0) + 1;
    summary.processed += 1;

    if (decision.action === "wait") continue;

    if (decision.action === "retire") {
      await admin
        .from("onvif_event_subscriptions")
        .update({
          status: "retired",
          last_decision: "retire",
          last_decision_reason: decision.reason,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", raw.id);
      summary.retired += 1;
      continue;
    }

    // A partir daqui há transporte, logo há credencial.
    const endpoint = String(cfg?.endpoint ?? "");
    const port = Number(cfg?.port ?? 80) || 80;
    if (!/^[a-zA-Z0-9.\-_]+$/.test(endpoint)) {
      await admin
        .from("onvif_event_subscriptions")
        .update({
          status: "retired",
          last_failure_kind: "unsupported",
          last_decision: "retire",
          last_decision_reason: "permanent_failure",
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", raw.id);
      summary.retired += 1;
      continue;
    }

    const header = await wsseHeader(
      String(cfg?.username ?? ""),
      String(cfg?.password_encrypted ?? ""),
    );
    const eventsUrl = `http://${endpoint}:${port}/onvif/event_service`;

    /* ------------------------- criar / recriar ---------------------------- */
    if (decision.action === "create" || decision.action === "recreate") {
      const requested = clampLeaseMs(Math.min(REQUESTED_LEASE_MS, MAX_LEASE_MS));
      const attemptAt = Date.now();
      const res = await soapCall(
        eventsUrl,
        header,
        `<tev:CreatePullPointSubscription>
           <tev:InitialTerminationTime>${isoDuration(requested)}</tev:InitialTerminationTime>
         </tev:CreatePullPointSubscription>`,
      );
      const parsed = res.ok ? parseSubscribeResponse(res.text) : null;

      if (!parsed?.address) {
        const kind = classifySoapFailure(res.status, res.text);
        summary.failures += 1;
        await admin
          .from("onvif_event_subscriptions")
          .update({
            status: "backoff",
            consecutive_failures: raw.consecutive_failures + 1,
            last_failure_kind: kind === "none" ? "device_fault" : kind,
            last_decision: decision.action,
            last_decision_reason: decision.reason,
            last_attempt_at: new Date(attemptAt).toISOString(),
          })
          .eq("id", raw.id);
        continue;
      }

      // P8 na prática: o empréstimo que vale é o intervalo declarado pelo
      // próprio equipamento entre seus dois carimbos, e o início é o NOSSO
      // relógio. Assim, câmera adiantada não distorce o prazo.
      const observed = leaseFromDeviceClocks(parsed.currentTime, parsed.terminationTime)
        ?? requested;
      await admin
        .from("onvif_event_subscriptions")
        .update({
          subscription_ref: parsed.address,
          status: "active",
          lease_started_at: new Date(attemptAt).toISOString(),
          termination_at: new Date(attemptAt + clampLeaseMs(observed)).toISOString(),
          lease_duration_ms: clampLeaseMs(observed),
          consecutive_failures: 0,
          last_failure_kind: "none",
          last_decision: decision.action,
          last_decision_reason: decision.reason,
          last_attempt_at: new Date(attemptAt).toISOString(),
        })
        .eq("id", raw.id);
      continue;
    }

    const ref = raw.subscription_ref;
    if (!ref) {
      // Estado impossível pelo caminho normal; tratamos como "nunca criada".
      await admin
        .from("onvif_event_subscriptions")
        .update({ termination_at: null, status: "pending" })
        .eq("id", raw.id);
      continue;
    }

    /* ----------------------------- renovar -------------------------------- */
    if (decision.action === "renew") {
      const attemptAt = Date.now();
      const requested = clampLeaseMs(REQUESTED_LEASE_MS);
      const res = await soapCall(
        ref,
        header,
        `<wsnt:Renew><wsnt:TerminationTime>${escapeXml(isoDuration(requested))}</wsnt:TerminationTime></wsnt:Renew>`,
      );
      const parsed = res.ok ? parseSubscribeResponse(res.text) : null;
      const gotLease = parsed ? leaseFromDeviceClocks(parsed.currentTime, parsed.terminationTime) : null;

      if (!res.ok || gotLease === null) {
        // Referência morta não é falha de rede: insistir em Renew nunca
        // convergiria. Zeramos o prazo para que a próxima decisão seja recriar.
        if (isDeadSubscriptionFault(res.text)) {
          await admin
            .from("onvif_event_subscriptions")
            .update({
              termination_at: null,
              subscription_ref: null,
              status: "pending",
              last_decision: "renew",
              last_decision_reason: "lease_expired",
              last_attempt_at: new Date(attemptAt).toISOString(),
            })
            .eq("id", raw.id);
          continue;
        }
        const kind = classifySoapFailure(res.status, res.text);
        summary.failures += 1;
        await admin
          .from("onvif_event_subscriptions")
          .update({
            status: "backoff",
            consecutive_failures: raw.consecutive_failures + 1,
            last_failure_kind: kind === "none" ? "device_fault" : kind,
            last_decision: "renew",
            last_decision_reason: decision.reason,
            last_attempt_at: new Date(attemptAt).toISOString(),
          })
          .eq("id", raw.id);
        continue;
      }

      await admin
        .from("onvif_event_subscriptions")
        .update({
          status: "active",
          lease_started_at: new Date(attemptAt).toISOString(),
          termination_at: new Date(attemptAt + clampLeaseMs(gotLease)).toISOString(),
          lease_duration_ms: clampLeaseMs(gotLease),
          consecutive_failures: 0,
          last_failure_kind: "none",
          last_decision: "renew",
          last_decision_reason: decision.reason,
          last_attempt_at: new Date(attemptAt).toISOString(),
        })
        .eq("id", raw.id);
      continue;
    }

    /* ------------------------------ puxar --------------------------------- */
    const attemptAt = Date.now();
    const res = await soapCall(
      ref,
      header,
      `<tev:PullMessages>
         <tev:Timeout>PT10S</tev:Timeout>
         <tev:MessageLimit>${PULL_MESSAGE_LIMIT}</tev:MessageLimit>
       </tev:PullMessages>`,
      PULL_TIMEOUT_MS,
    );

    if (!res.ok) {
      if (isDeadSubscriptionFault(res.text)) {
        await admin
          .from("onvif_event_subscriptions")
          .update({
            termination_at: null,
            subscription_ref: null,
            status: "pending",
            last_decision: "pull",
            last_decision_reason: "lease_expired",
            last_attempt_at: new Date(attemptAt).toISOString(),
          })
          .eq("id", raw.id);
        continue;
      }
      const kind = classifySoapFailure(res.status, res.text);
      summary.failures += 1;
      await admin
        .from("onvif_event_subscriptions")
        .update({
          status: "backoff",
          consecutive_failures: raw.consecutive_failures + 1,
          last_failure_kind: kind === "none" ? "device_fault" : kind,
          last_decision: "pull",
          last_decision_reason: decision.reason,
          last_attempt_at: new Date(attemptAt).toISOString(),
        })
        .eq("id", raw.id);
      continue;
    }

    const events = parsePullMessages(res.text);
    for (const ev of events) {
      const dedupKey = pullPointEventKey({
        cameraId: raw.camera_id,
        topic: ev.topic,
        sourceToken: ev.sourceToken,
        utcTime: ev.utcTime,
      });
      const { data: inserted } = await admin.rpc("record_onvif_event", {
        p_user_id: raw.user_id,
        p_camera_id: raw.camera_id,
        p_subscription_id: raw.id,
        p_topic: ev.topic,
        p_source_token: ev.sourceToken,
        p_device_utc_time: ev.utcTime,
        p_dedup_key: dedupKey,
        p_property_operation: ev.propertyOperation,
        p_data: { source: ev.source, data: ev.data },
      });
      if (inserted === true) summary.events += 1;
      else summary.deduped += 1;
    }

    // O prazo NÃO é estendido por um pull bem-sucedido: PullMessages não
    // renova o empréstimo no padrão ONVIF, e fingir que renova é exatamente
    // como assinaturas morrem em silêncio.
    await admin
      .from("onvif_event_subscriptions")
      .update({
        status: "active",
        consecutive_failures: 0,
        last_failure_kind: "none",
        last_decision: "pull",
        last_decision_reason: decision.reason,
        last_attempt_at: new Date(attemptAt).toISOString(),
      })
      .eq("id", raw.id);
  }

  return j({ ok: true, ...summary, actions, duration_ms: Date.now() - started });
});
