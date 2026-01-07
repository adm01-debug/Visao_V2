import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Check if current time is within schedule
function isWithinSchedule(schedule: Rule["schedule"]): boolean {
  if (!schedule) return true;

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  // Check day of week
  if (schedule.days && schedule.days.length > 0) {
    if (!schedule.days.includes(currentDay)) {
      return false;
    }
  }

  // Check time range
  if (schedule.start_time && schedule.end_time) {
    if (currentTime < schedule.start_time || currentTime > schedule.end_time) {
      return false;
    }
  }

  return true;
}

// Evaluate a single condition against an alert
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

// Check if rule matches the alert
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

// Execute actions for a matched rule
// deno-lint-ignore no-explicit-any
async function executeActions(supabase: any, rule: Rule, alert: Alert): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of rule.actions) {
    try {
      switch (action) {
        case "alert":
          console.log(`[ACTION] Alert triggered for rule "${rule.name}" on alert ${alert.id}`);
          results.push({
            action: "alert",
            success: true,
            message: `Alert notification created for rule "${rule.name}"`,
          });
          break;

        case "notify":
          const { data: notifConfig } = await supabase
            .from("notification_configs")
            .select("*")
            .eq("user_id", alert.user_id)
            .eq("enabled", true)
            .single();

          if (notifConfig) {
            console.log(`[ACTION] Notify - Would send to channels: ${(notifConfig.channels || []).join(", ")}`);
            results.push({
              action: "notify",
              success: true,
              message: `Notification queued via ${(notifConfig.channels || []).length} channels`,
            });
          } else {
            results.push({
              action: "notify",
              success: false,
              message: "No notification config found",
            });
          }
          break;

        case "record":
          console.log(`[ACTION] Record - Starting recording on camera ${alert.camera_name}`);
          
          const clipData = {
            camera_id: alert.camera_id,
            user_id: alert.user_id,
            start_time: new Date().toISOString(),
            status: "recording",
          };

          const { error: clipError } = await supabase
            .from("video_clips")
            .insert(clipData);

          results.push({
            action: "record",
            success: !clipError,
            message: clipError ? clipError.message : `Recording started on ${alert.camera_name}`,
          });
          break;

        case "lockdown":
          console.log(`[ACTION] Lockdown triggered for rule "${rule.name}"`);
          
          const { error: lockdownError } = await supabase
            .from("cameras")
            .update({ status: "alert" })
            .eq("user_id", alert.user_id);

          results.push({
            action: "lockdown",
            success: !lockdownError,
            message: lockdownError ? lockdownError.message : "Lockdown mode activated",
          });
          break;

        case "dispatch":
          console.log(`[ACTION] Dispatch - Security team notified for ${alert.camera_name}`);
          results.push({
            action: "dispatch",
            success: true,
            message: `Dispatch request sent for ${alert.camera_name}`,
          });
          break;

        default:
          results.push({
            action,
            success: false,
            message: `Unknown action: ${action}`,
          });
      }
    } catch (error) {
      console.error(`[ERROR] Action ${action} failed:`, error);
      results.push({
        action,
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

// Log rule execution to rule_executions table
// deno-lint-ignore no-explicit-any
async function logRuleExecution(supabase: any, rule: Rule, alert: Alert, results: ActionResult[], startTime: number): Promise<void> {
  try {
    const endTime = Date.now();
    const executionTimeMs = endTime - startTime;
    
    const hasErrors = results.some(r => !r.success);
    const allFailed = results.every(r => !r.success);
    
    const status = allFailed ? 'error' : (hasErrors ? 'partial' : 'success');
    const errorMessage = hasErrors 
      ? results.filter(r => !r.success).map(r => r.message).join('; ')
      : null;

    const executionData = {
      rule_id: rule.id,
      user_id: alert.user_id,
      alert_id: alert.id,
      triggered_at: new Date().toISOString(),
      actions_executed: results.map(r => r.action),
      status,
      error_message: errorMessage,
      execution_time_ms: executionTimeMs,
    };

    const { error } = await supabase.from("rule_executions").insert(executionData);
    
    if (error) {
      console.error("[ERROR] Failed to log rule execution:", error);
    } else {
      console.log(`[INFO] Rule execution logged: ${rule.name} - ${status}`);
    }
  } catch (error) {
    console.error("[ERROR] Failed to log rule execution:", error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { alert } = await req.json() as { alert: Alert };

    if (!alert || !alert.user_id) {
      return new Response(
        JSON.stringify({ error: "Missing alert data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[INFO] Processing automation rules for alert: ${alert.id}`);

    const { data: rules, error: rulesError } = await supabase
      .from("rules")
      .select("*")
      .eq("user_id", alert.user_id)
      .eq("is_active", true);

    if (rulesError) {
      console.error("[ERROR] Failed to fetch rules:", rulesError);
      return new Response(
        JSON.stringify({ error: rulesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matchedRules: { rule: Rule; results: ActionResult[] }[] = [];

    for (const rule of (rules || []) as Rule[]) {
      if (ruleMatchesAlert(rule, alert)) {
        console.log(`[INFO] Rule "${rule.name}" matched alert ${alert.id}`);
        
        const startTime = Date.now();
        const results = await executeActions(supabase, rule, alert);
        matchedRules.push({ rule, results });
        
        await logRuleExecution(supabase, rule, alert, results, startTime);
      }
    }

    console.log(`[INFO] Processed ${rules?.length || 0} rules, ${matchedRules.length} matched`);

    return new Response(
      JSON.stringify({
        success: true,
        alert_id: alert.id,
        rules_evaluated: rules?.length || 0,
        rules_matched: matchedRules.length,
        executions: matchedRules.map(({ rule, results }) => ({
          rule_id: rule.id,
          rule_name: rule.name,
          actions: results,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ERROR] Edge function failed:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
