// VISÃO — Onda 111: despacho externo dos alertas de manutenção do banco.
//
// A Onda 110 passou a detectar rotinas noturnas paradas ou falhando. Detectar
// sem avisar ninguém é só telemetria bonita: esta função lê os alertas abertos,
// aplica a política pura de despacho (dedup, backoff, teto de tentativas) e
// entrega pelos canais externos configurados, registrando tudo para auditoria.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  conditionKeyFor,
  planDispatch,
  renderMessage,
  resolveConfig,
  type ConditionNotice,
  type DispatchChannel,
  type DispatchConfig,
  type DispatchPlanItem,
  type MaintenanceAlert,
} from "../_shared/maintenanceDispatchPolicy.ts";

/** Lookback do histórico usado pelo silêncio por condição (Onda 240). */
const CONDITION_HISTORY_HOURS = 72;


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (level: "info" | "warn" | "error", msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ level, fn: "maintenance-alerts-dispatch", msg, ...extra }));

/** Envia pelo Telegram. Retorna `null` em sucesso ou o motivo da falha. */
async function sendTelegram(item: DispatchPlanItem): Promise<string | null> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return "telegram_not_configured";

  const { html } = renderMessage(item.alert);
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return resp.ok ? null : `telegram_http_${resp.status}`;
  } catch (err) {
    return `telegram_exception_${err instanceof Error ? err.name : "unknown"}`;
  }
}

/** Envia por e-mail (Resend). Retorna `null` em sucesso ou o motivo da falha. */
async function sendEmail(item: DispatchPlanItem): Promise<string | null> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("MAINTENANCE_ALERT_EMAIL");
  if (!apiKey || !to) return "email_not_configured";

  const from = Deno.env.get("MAINTENANCE_ALERT_FROM") ?? "VISÃO <onboarding@resend.dev>";
  const { subject, text, html } = renderMessage(item.alert);
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: `<pre style="font-family:ui-monospace,monospace">${html}</pre>`,
      }),
    });
    return resp.ok ? null : `email_http_${resp.status}`;
  } catch (err) {
    return `email_exception_${err instanceof Error ? err.name : "unknown"}`;
  }
}

const SENDERS: Record<DispatchChannel, (item: DispatchPlanItem) => Promise<string | null>> = {
  telegram: sendTelegram,
  email: sendEmail,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    log("error", "missing_service_credentials");
    return json({ ok: false, error: "service_unavailable" }, 500);
  }

  // Overrides opcionais (uso manual/QA): { dry_run, min_severity, channels, batch_limit }
  let overrides: Partial<DispatchConfig> & { dryRun?: boolean } = {};
  if (req.method === "POST") {
    try {
      const body = await req.json();
      overrides = {
        dryRun: Boolean(body?.dry_run),
        ...(body?.min_severity === "warning" || body?.min_severity === "critical"
          ? { minSeverity: body.min_severity }
          : {}),
        ...(Array.isArray(body?.channels) ? { channels: body.channels as DispatchChannel[] } : {}),
        ...(typeof body?.batch_limit === "number"
          ? { batchLimit: Math.max(1, Math.min(100, Math.trunc(body.batch_limit))) }
          : {}),
      };
    } catch {
      /* corpo vazio é o caso normal do cron */
    }
  }
  const { dryRun = false, ...configOverrides } = overrides;
  const config = resolveConfig(Deno.env.toObject(), configOverrides);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const nowMs = Date.now();

  /**
   * Onda 246 — toda execução real entra no livro, inclusive (e sobretudo) a
   * que não enviou nada. Sem esta linha, "não havia o que avisar" e "o
   * despachante está mudo há oito meses" são indistinguíveis de fora, que foi
   * exatamente o defeito encontrado na auditoria de 29/07.
   *
   * V9 — ensaio nunca entra no livro. Falha ao registrar nunca derruba o
   * despacho: a prova é preciosa, o aviso é mais.
   */
  const recordRun = async (
    outcome: "delivered" | "degraded" | "failing" | "muted" | "idle" | "error",
    counts: {
      candidates: number;
      planned: number;
      sent: number;
      failed: number;
      skipped: number;
      throttled: number;
      openCritical: number;
    },
    detail: Record<string, unknown> = {},
  ): Promise<void> => {
    if (dryRun) return;
    const { error } = await supabase.from("maintenance_dispatch_runs").insert({
      ran_at: new Date(nowMs).toISOString(),
      channels: config.channels,
      candidates: counts.candidates,
      planned: counts.planned,
      sent: counts.sent,
      failed: counts.failed,
      skipped: counts.skipped,
      throttled: counts.throttled,
      open_critical: counts.openCritical,
      outcome,
      detail,
    });
    if (error) log("error", "run_ledger_failed", { err: error.message, outcome });
  };

  const ZERO = {
    candidates: 0,
    planned: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    throttled: 0,
    openCritical: 0,
  };

  /** Críticos abertos agora — traduz a mudez para a linguagem do plantão. */
  const countOpenCritical = async (): Promise<number> => {
    const { count, error } = await supabase
      .from("maintenance_alert_events")
      .select("id", { count: "exact", head: true })
      .eq("severity", "critical")
      .is("acknowledged_at", null);
    if (error) {
      log("warn", "open_critical_unreadable", { err: error.message });
      return 0;
    }
    return count ?? 0;
  };

  if (config.channels.length === 0) {
    const openCritical = await countOpenCritical();
    log("warn", "no_channels_configured", { open_critical: openCritical });
    await recordRun("muted", { ...ZERO, openCritical }, { reason: "no_channels_configured" });
    return json({
      ok: true,
      dispatched: 0,
      reason: "no_channels_configured",
      open_critical: openCritical,
    });
  }

  const since = new Date(nowMs - config.maxAgeHours * 3_600_000).toISOString();
  // Onda 240 — a janela de silêncio por condição (até 1 dia) exige olhar mais
  // para trás do que a janela de candidatura. Só o histórico é lido aqui; a
  // elegibilidade de envio continua limitada por `maxAgeHours`.
  const historySince = new Date(
    nowMs - Math.max(config.maxAgeHours, CONDITION_HISTORY_HOURS) * 3_600_000,
  ).toISOString();


  try {
    const { data: historyRows, error: alertsError } = await supabase
      .from("maintenance_alert_events")
      .select("id, routine, severity, reason, created_at, detail")
      .gte("created_at", historySince)
      .order("created_at", { ascending: false })
      .limit(600);
    if (alertsError) throw alertsError;

    const history = (historyRows ?? []) as MaintenanceAlert[];
    const alerts = history.filter((a) => a.created_at >= since);
    if (history.length === 0) {
      await recordRun("idle", ZERO, { reason: "no_history" });
      return json({ ok: true, dispatched: 0, candidates: 0 });
    }


    const { data: dispatchRows, error: dispatchError } = await supabase
      .from("maintenance_alert_dispatches")
      .select("alert_id, channel, status, attempts, last_attempt_at")
      .in("alert_id", history.map((a) => a.id));
    if (dispatchError) throw dispatchError;

    // Notificações já entregues, indexadas pela condição (routine) do alerta.
    const alertById = new Map(history.map((a) => [a.id, a]));
    const notices: ConditionNotice[] = [];
    for (const row of dispatchRows ?? []) {
      if (row.status !== "sent") continue; // Q4 — falha nunca silencia
      const source = alertById.get(row.alert_id);
      if (!source) continue;
      notices.push({
        conditionKey: conditionKeyFor(source),
        channel: row.channel as DispatchChannel,
        severity: source.severity,
        sentAt: row.last_attempt_at,
      });
    }

    if (alerts.length === 0) {
      await recordRun("idle", ZERO, { reason: "no_candidates_in_window" });
      return json({ ok: true, dispatched: 0, candidates: 0 });
    }


    const plan = planDispatch(
      alerts,
      (dispatchRows ?? []).filter((d) => alerts.some((a) => a.id === d.alert_id)),
      config,
      nowMs,
      notices,
    );

    // Onda 242 — a supressão vira fato persistido. Sem trilha, "calamos 40
    // mensagens" e "o despachante está quebrado" são indistinguíveis de fora.
    const suppressionRows = plan.skipped
      .filter((s) => s.reason === "condition_throttled")
      .map((s) => {
        const detail = (s.detail ?? {}) as Record<string, unknown>;
        const alert = alertById.get(s.alertId);
        const windowMinutes = Number(detail.windowMinutes);
        const remaining = Number(detail.remainingMinutes);
        if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) return null;
        return {
          alert_id: s.alertId,
          condition_key: String(detail.conditionKey ?? alert?.routine ?? "").trim(),
          channel: s.channel,
          severity: alert?.severity ?? "warning",
          last_severity: typeof detail.lastSeverity === "string" ? detail.lastSeverity : null,
          window_minutes: Math.trunc(windowMinutes),
          // O CHECK exige `remaining <= window`; grampeamos aqui em vez de
          // deixar a linha inteira ser recusada por um arredondamento.
          remaining_minutes: Math.min(
            Math.trunc(windowMinutes),
            Math.max(0, Number.isFinite(remaining) ? Math.trunc(remaining) : 0),
          ),
          suppressed_at: new Date(nowMs).toISOString(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null && row.condition_key.length > 0);

    if (dryRun) {
      return json({
        ok: true,
        dry_run: true,
        planned: plan.items.map((i) => ({ alert_id: i.alert.id, channel: i.channel, attempt: i.attempt })),
        skipped: plan.skipped,
        throttled: suppressionRows.length,
      });
    }

    if (suppressionRows.length > 0) {
      // Falha ao auditar nunca derruba o despacho: o envio é o efeito
      // principal, a trilha é a prova. Perder a prova é ruim; perder o aviso
      // por causa da prova seria pior.
      const { error: suppressionError } = await supabase
        .from("maintenance_dispatch_suppressions")
        .insert(suppressionRows);
      if (suppressionError) {
        log("error", "suppression_trail_failed", { err: suppressionError.message });
      }
    }

    let sent = 0;
    let failed = 0;

    for (const item of plan.items) {
      const error = await SENDERS[item.channel](item);
      if (error === null) sent += 1;
      else failed += 1;

      const { error: upsertError } = await supabase
        .from("maintenance_alert_dispatches")
        .upsert(
          {
            alert_id: item.alert.id,
            channel: item.channel,
            status: error === null ? "sent" : "failed",
            attempts: item.attempt,
            last_attempt_at: new Date().toISOString(),
            last_error: error,
            detail: {
              routine: item.alert.routine,
              severity: item.alert.severity,
              condition_key: item.conditionKey,
            },
          },
          { onConflict: "alert_id,channel" },
        );
      if (upsertError) {
        log("error", "dispatch_audit_failed", { alert_id: item.alert.id, err: upsertError.message });
      }
    }

    log(failed > 0 ? "warn" : "info", "dispatch_done", {
      candidates: alerts.length,
      planned: plan.items.length,
      sent,
      failed,
      skipped: plan.skipped.length,
      throttled: plan.skipped.filter((s) => s.reason === "condition_throttled").length,
    });

    return json({
      ok: true,
      candidates: alerts.length,
      dispatched: sent,
      failed,
      skipped: plan.skipped.length,
      throttled: plan.skipped.filter((s) => s.reason === "condition_throttled").length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    log("error", "dispatch_failed", { err: message });
    return json({ ok: false, error: message }, 500);
  }
});
