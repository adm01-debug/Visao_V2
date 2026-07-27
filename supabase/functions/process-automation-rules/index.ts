import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { processAutomationRulesSchema, validateInput } from "../_shared/validation.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { createLogger } from "../_shared/logger.ts";
import { fetchZonesById, matchesRuleZone, type Detection, type ZoneRow } from "../_shared/zoneMatcher.ts";
import { isTestModeActive } from "../_shared/testMode.ts";

interface TestContext {
  userId?: string;
  cameraId?: string;
  ruleId?: string;
}

const log = createLogger("process-automation-rules");

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  camera_id: string | null;
  camera_name: string;
  timestamp: string;
  user_id: string;
}

interface RuleCondition {
  type: string;
  operator: string;
  value: string | number;
}

interface Rule {
  id: string;
  name: string;
  category: string;
  severity: string;
  conditions: RuleCondition[];
  actions: string[];
  cameras: string[];
  schedule: { days?: number[]; start_time?: string; end_time?: string } | null;
  is_active: boolean;
  user_id: string;
  zone_id?: string | null;
}

interface ActionResult {
  action: string;
  success: boolean;
  message: string;
}

function isWithinSchedule(schedule: Rule["schedule"]): boolean {
  if (!schedule) return true;
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);

  if (schedule.days && schedule.days.length > 0) {
    if (!schedule.days.includes(currentDay)) return false;
  }
  if (schedule.start_time && schedule.end_time) {
    if (currentTime < schedule.start_time || currentTime > schedule.end_time) return false;
  }
  return true;
}

function evaluateCondition(condition: RuleCondition, alert: Alert): boolean {
  const { type } = condition;
  switch (type) {
    case "people_count":
    case "crowd_density":
      return true;
    case "face_recognition":
      return alert.type === "access" || alert.message.toLowerCase().includes("reconhec");
    case "vehicle_detection":
      return alert.type === "access" || alert.message.toLowerCase().includes("veículo") || alert.message.toLowerCase().includes("placa");
    case "motion_detection":
      return alert.type === "security" || alert.message.toLowerCase().includes("movimento");
    case "restricted_area":
    case "perimeter_breach":
      return alert.message.toLowerCase().includes("zona") || alert.message.toLowerCase().includes("perímetro") || alert.message.toLowerCase().includes("área");
    case "no_ppe":
      return alert.type === "safety" || alert.message.toLowerCase().includes("epi") || alert.message.toLowerCase().includes("capacete");
    case "loitering":
      return alert.message.toLowerCase().includes("permanência") || alert.message.toLowerCase().includes("loitering");
    case "object_left":
      return alert.message.toLowerCase().includes("objeto") || alert.message.toLowerCase().includes("abandonado");
    default:
      return false;
  }
}

function ruleMatchesAlert(
  rule: Rule,
  alert: Alert,
  detection: Detection | null | undefined,
  zonesById: Map<string, ZoneRow>,
): boolean {
  if (!rule.is_active) return false;
  if (!isWithinSchedule(rule.schedule)) return false;
  if (rule.cameras.length > 0 && alert.camera_id) {
    if (!rule.cameras.includes(alert.camera_id)) return false;
  }
  const severityLevels = ["low", "medium", "high", "critical"];
  const ruleSeverityIndex = severityLevels.indexOf(rule.severity);
  const alertSeverityIndex = severityLevels.indexOf(alert.severity);
  if (alertSeverityIndex < ruleSeverityIndex) return false;
  if (!matchesRuleZone(rule, detection ?? null, zonesById)) return false;
  const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
  if (conditions.length === 0) return true;
  return conditions.every(condition => evaluateCondition(condition, alert));
}

type NotifConfig = Record<string, unknown> | null;

async function getNotificationConfigCached(
  supabase: SupabaseClient,
  userId: string,
  cache: Map<string, Promise<NotifConfig>>,
): Promise<NotifConfig> {
  const existing = cache.get(userId);
  if (existing) return existing;
  const promise = (async (): Promise<NotifConfig> => {
    const { data } = await supabase
      .from("notification_configs")
      .select("*")
      .eq("user_id", userId)
      .eq("enabled", true)
      .maybeSingle();
    return (data as NotifConfig) ?? null;
  })();
  cache.set(userId, promise);
  return promise;
}

async function executeActions(
  supabase: SupabaseClient,
  rule: Rule,
  alert: Alert,
  notifCache: Map<string, Promise<NotifConfig>>,
  testContext: TestContext | undefined,
  isTest: boolean,
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  for (const action of rule.actions) {
    try {
      switch (action) {
        case "alert":
          log.info("Alert action triggered", { ruleName: rule.name, alertId: alert.id, isTest });
          results.push({ action: "alert", success: true, message: `Alert notification created for rule "${rule.name}"${isTest ? " [test]" : ""}` });
          break;
        case "notify": {
          const notifConfig = await getNotificationConfigCached(supabase, alert.user_id, notifCache);
          if (!notifConfig) {
            results.push({ action: "notify", success: false, message: "No notification config found" });
            break;
          }
          const channels = Array.isArray(notifConfig.channels) ? (notifConfig.channels as string[]) : [];
          if (channels.length === 0) {
            results.push({ action: "notify", success: false, message: "No channels configured" });
            break;
          }
          // Propaga testContext ponta a ponta para exercitar o short-circuit
          // em send-alert-notification / send-telegram durante o modo teste.
          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/send-alert-notification`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
                "x-idempotency-key": `rule-${rule.id}-alert-${alert.id}`,
              },
              body: JSON.stringify({
                alertId: alert.id,
                type: alert.type,
                severity: alert.severity,
                message: alert.message,
                cameraName: alert.camera_name,
                timestamp: alert.timestamp,
                channels,
                recipients: {
                  emails: (notifConfig.email_recipients as string[]) ?? [],
                  phones: (notifConfig.phone_recipients as string[]) ?? [],
                  webhookUrls: (notifConfig.webhook_urls as string[]) ?? [],
                },
                testContext,
              }),
            });
            const payload = await res.json().catch(() => ({}));
            const suppressed = payload?.testMode === true;
            results.push({
              action: "notify",
              success: res.ok,
              message: res.ok
                ? (suppressed
                  ? `Notification suppressed by test mode (${channels.length} channels)`
                  : `Notification dispatched via ${channels.length} channels`)
                : `Notify failed: HTTP ${res.status}`,
            });
          } catch (err) {
            results.push({ action: "notify", success: false, message: err instanceof Error ? err.message : "notify_error" });
          }
          break;
        }
        case "record": {
          const { error: clipError } = await supabase.from("video_clips").insert({
            camera_id: alert.camera_id, user_id: alert.user_id, start_time: new Date().toISOString(), status: "recording",
          });
          results.push({ action: "record", success: !clipError, message: clipError ? clipError.message : `Recording started on ${alert.camera_name}` });
          break;
        }
        case "lockdown": {
          const { error: lockdownError } = await supabase.from("cameras").update({ status: "alert" }).eq("user_id", alert.user_id);
          results.push({ action: "lockdown", success: !lockdownError, message: lockdownError ? lockdownError.message : "Lockdown mode activated" });
          break;
        }
        case "dispatch":
          results.push({ action: "dispatch", success: true, message: `Dispatch request sent for ${alert.camera_name}` });
          break;
        case "trigger_output": {
          // Onda 154 — a regra NÃO fala com o equipamento. Ela apenas registra
          // a intenção na trilha e delega ao mesmo caminho de acionamento usado
          // pela mesa de operação. Se a regra tocasse o relé por conta própria,
          // teríamos dois lugares aplicando (ou esquecendo) o intervalo mínimo.
          if (isTest) {
            results.push({ action: "trigger_output", success: true, message: "Acionamento simulado [teste] — hardware não tocado" });
            break;
          }
          const { data: eligible } = await supabase.rpc("rule_eligible_io_port", {
            p_camera_id: alert.camera_id,
            p_user_id: alert.user_id,
          });
          const port = Array.isArray(eligible) ? eligible[0] : null;
          if (!port) {
            results.push({ action: "trigger_output", success: false, message: "Nenhuma saída de alarme habilitada nesta câmera" });
            break;
          }
          if ((port.cooldown_remaining_ms ?? 0) > 0) {
            // Recusa por cooldown é resultado legítimo, não erro: evita sirene
            // pipocando a cada frame durante um evento contínuo.
            results.push({ action: "trigger_output", success: false, message: `Em intervalo mínimo (${port.cooldown_remaining_ms} ms restantes)` });
            break;
          }
          const { error: ioError } = await supabase.functions.invoke("camera-io-control", {
            body: {
              action: "actuate",
              camera_id: alert.camera_id,
              port_id: port.port_id,
              command: "pulse",
              origin: "rule",
              origin_ref: rule.id,
            },
          });
          results.push({
            action: "trigger_output",
            success: !ioError,
            message: ioError ? ioError.message : `Saída ${port.port_token} pulsada por ${port.pulse_ms} ms`,
          });
          break;
        }
        default:
          results.push({ action, success: false, message: `Unknown action: ${action}` });
      }
    } catch (error) {
      results.push({ action, success: false, message: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return results;
}


async function logRuleExecution(supabase: SupabaseClient, rule: Rule, alert: Alert, results: ActionResult[], startTime: number, isTest: boolean): Promise<void> {
  try {
    const hasErrors = results.some(r => !r.success);
    const allFailed = results.every(r => !r.success);
    const status = allFailed ? 'error' : (hasErrors ? 'partial' : 'success');
    const errorMessage = hasErrors ? results.filter(r => !r.success).map(r => r.message).join('; ') : null;

    const { error } = await supabase.from("rule_executions").insert({
      rule_id: rule.id, user_id: alert.user_id, alert_id: alert.id,
      triggered_at: new Date().toISOString(), actions_executed: results.map(r => r.action),
      status, error_message: errorMessage, execution_time_ms: Date.now() - startTime,
      is_test: isTest,
    });

    if (error) log.error("Failed to log rule execution", { error: error.message });
  } catch (error) {
    log.error("Failed to log rule execution", { error: error instanceof Error ? error.message : "Unknown" });
  }
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = checkRateLimit(req, RATE_LIMITS.standard, "process-rules", corsHeaders);
  if (!rl.allowed) return rl.response;

  const done = log.time("process-rules");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.json();
    const validation = validateInput(processAutomationRulesSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;
    const { alert, detection, testContext: incomingTestContext } = validation.data;
    const traceId = req.headers.get("x-request-id") || undefined;

    log.info("Processing automation rules", { alertId: alert.id, userId: alert.user_id, traceId, hasDetection: !!detection, hasTestContext: !!incomingTestContext });

    const { data: rules, error: rulesError } = await supabase.from("rules").select("*").eq("user_id", alert.user_id).eq("is_active", true);

    if (rulesError) {
      log.error("Failed to fetch rules", { error: rulesError.message });
      return new Response(JSON.stringify({ error: rulesError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pré-carrega zonas referenciadas pelas regras para filtro espacial.
    const zoneIds = (rules || [])
      .map((r) => (r as Rule).zone_id)
      .filter((z): z is string => !!z);
    const zonesById = zoneIds.length > 0
      ? await fetchZonesById(supabase, alert.user_id, zoneIds)
      : new Map<string, ZoneRow>();

    const evaluated = (rules || []).map((r) => r as Rule);
    const matched = evaluated.filter((r) => ruleMatchesAlert(r, alert, detection ?? null, zonesById));
    const filteredByZone = evaluated.filter((r) => r.zone_id && !matched.includes(r)).length;

    const notifCache = new Map<string, Promise<NotifConfig>>();
    const matchedRules = await Promise.all(
      matched.map(async (r) => {
        const startTime = Date.now();
        // Resolve testContext efetivo para (usuário, câmera, regra) — herda campos do payload.
        const effectiveTestContext: TestContext = {
          userId: incomingTestContext?.userId ?? alert.user_id,
          cameraId: incomingTestContext?.cameraId ?? alert.camera_id ?? undefined,
          ruleId: incomingTestContext?.ruleId ?? r.id,
        };
        const isTest = await isTestModeActive(effectiveTestContext);
        const results = await executeActions(supabase, r, alert, notifCache, effectiveTestContext, isTest);
        // fire-and-forget para não bloquear a resposta; erros já são logados internamente
        void logRuleExecution(supabase, r, alert, results, startTime, isTest);
        return { rule: r, results, isTest };
      }),
    );

    done();
    log.info("Rules processed", { evaluated: rules?.length || 0, matched: matchedRules.length, filteredByZone, traceId });

    return new Response(JSON.stringify({
      success: true, alert_id: alert.id, rules_evaluated: rules?.length || 0, rules_matched: matchedRules.length,
      rules_filtered_by_zone: filteredByZone,
      executions: matchedRules.map(({ rule, results, isTest }) => ({ rule_id: rule.id, rule_name: rule.name, is_test: isTest, actions: results })),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log.error("Unhandled error", { error: error instanceof Error ? error.message : "Unknown" });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
