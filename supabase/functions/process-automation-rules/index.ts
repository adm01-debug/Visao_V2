import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { processAutomationRulesSchema, validateInput } from "../_shared/validation.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { createLogger } from "../_shared/logger.ts";
import { fetchZonesById, matchesRuleZone, type Detection, type ZoneRow } from "../_shared/zoneMatcher.ts";

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

function ruleMatchesAlert(rule: Rule, alert: Alert): boolean {
  if (!rule.is_active) return false;
  if (!isWithinSchedule(rule.schedule)) return false;
  if (rule.cameras.length > 0 && alert.camera_id) {
    if (!rule.cameras.includes(alert.camera_id)) return false;
  }
  const severityLevels = ["low", "medium", "high", "critical"];
  const ruleSeverityIndex = severityLevels.indexOf(rule.severity);
  const alertSeverityIndex = severityLevels.indexOf(alert.severity);
  if (alertSeverityIndex < ruleSeverityIndex) return false;
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
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  for (const action of rule.actions) {
    try {
      switch (action) {
        case "alert":
          log.info("Alert action triggered", { ruleName: rule.name, alertId: alert.id });
          results.push({ action: "alert", success: true, message: `Alert notification created for rule "${rule.name}"` });
          break;
        case "notify": {
          const notifConfig = await getNotificationConfigCached(supabase, alert.user_id, notifCache);
          if (notifConfig) {
            results.push({ action: "notify", success: true, message: `Notification queued via ${((notifConfig.channels as string[]) || []).length} channels` });
          } else {
            results.push({ action: "notify", success: false, message: "No notification config found" });
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
        default:
          results.push({ action, success: false, message: `Unknown action: ${action}` });
      }
    } catch (error) {
      results.push({ action, success: false, message: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return results;
}


async function logRuleExecution(supabase: SupabaseClient, rule: Rule, alert: Alert, results: ActionResult[], startTime: number): Promise<void> {
  try {
    const hasErrors = results.some(r => !r.success);
    const allFailed = results.every(r => !r.success);
    const status = allFailed ? 'error' : (hasErrors ? 'partial' : 'success');
    const errorMessage = hasErrors ? results.filter(r => !r.success).map(r => r.message).join('; ') : null;

    const { error } = await supabase.from("rule_executions").insert({
      rule_id: rule.id, user_id: alert.user_id, alert_id: alert.id,
      triggered_at: new Date().toISOString(), actions_executed: results.map(r => r.action),
      status, error_message: errorMessage, execution_time_ms: Date.now() - startTime,
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
    const { alert } = validation.data;
    const traceId = req.headers.get("x-request-id") || undefined;

    log.info("Processing automation rules", { alertId: alert.id, userId: alert.user_id, traceId });

    const { data: rules, error: rulesError } = await supabase.from("rules").select("*").eq("user_id", alert.user_id).eq("is_active", true);

    if (rulesError) {
      log.error("Failed to fetch rules", { error: rulesError.message });
      return new Response(JSON.stringify({ error: rulesError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Executa regras que casam em paralelo — cada regra é independente,
    // logRuleExecution já é isolado. Reduz drasticamente a latência quando
    // um usuário tem muitas regras ativas.
    const matched = (rules || []).filter((r) => ruleMatchesAlert(r as Rule, alert));
    const matchedRules = await Promise.all(
      matched.map(async (rule) => {
        const r = rule as Rule;
        const startTime = Date.now();
        const results = await executeActions(supabase, r, alert);
        // fire-and-forget para não bloquear a resposta; erros já são logados internamente
        void logRuleExecution(supabase, r, alert, results, startTime);
        return { rule: r, results };
      }),
    );

    done();
    log.info("Rules processed", { evaluated: rules?.length || 0, matched: matchedRules.length, traceId });

    return new Response(JSON.stringify({
      success: true, alert_id: alert.id, rules_evaluated: rules?.length || 0, rules_matched: matchedRules.length,
      executions: matchedRules.map(({ rule, results }) => ({ rule_id: rule.id, rule_name: rule.name, actions: results })),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log.error("Unhandled error", { error: error instanceof Error ? error.message : "Unknown" });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
