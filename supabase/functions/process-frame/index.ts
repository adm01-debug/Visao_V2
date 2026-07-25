/**
 * VISÃO — process-frame
 *
 * Pipeline de detecção por câmera:
 *   frame/recorte → Lovable AI (Gemini) → camera_events + event_detections
 *                → avalia camera_detection_rules → event_alerts (com cooldown)
 *
 * Body:
 * {
 *   cameraId: string,
 *   organizationId: string,
 *   imageBase64?: string,          // sem prefixo data:
 *   imageUrl?: string,
 *   occurredAt?: string,           // ISO; default now
 *   eventType?: string,            // default 'person_detected'
 *   source?: string                // default 'ai'
 * }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { createLogger } from "../_shared/logger.ts";
import { fetchWithRetry } from "../_shared/retry.ts";
import { isBoxInZone, normalizeGeometry } from "../_shared/zoneMatcher.ts";

const log = createLogger("process-frame");

interface Detection {
  label: string;
  category?: string;
  confidence: number;
  bbox?: { x: number; y: number; width: number; height: number };
  attributes?: Record<string, unknown>;
}

interface Rule {
  id: string;
  name: string;
  target_labels: string[];
  target_categories: string[];
  min_confidence: number;
  min_count: number;
  zone_id: string | null;
  active_days: number[];
  active_from: string | null;
  active_to: string | null;
  alert_severity: "low" | "medium" | "high" | "critical";
  alert_title_template: string;
  cooldown_seconds: number;
}

const DETECTION_PROMPT = `You are a computer vision system. Analyze the image and list detected objects/people.
Respond ONLY with strict JSON:
{
  "detections": [
    { "label": "person", "category": "person|vehicle|object|animal", "confidence": 0-1,
      "bbox": {"x":0-1,"y":0-1,"width":0-1,"height":0-1} }
  ]
}`;

function withinTimeWindow(rule: Rule, at: Date): boolean {
  const dow = at.getUTCDay();
  if (!rule.active_days.includes(dow)) return false;
  if (!rule.active_from || !rule.active_to) return true;
  const hhmm = at.toISOString().substring(11, 16);
  const from = rule.active_from.substring(0, 5);
  const to = rule.active_to.substring(0, 5);
  return from <= to ? hhmm >= from && hhmm <= to : hhmm >= from || hhmm <= to;
}

function ruleMatches(rule: Rule, dets: Detection[], at: Date): Detection[] {
  if (!withinTimeWindow(rule, at)) return [];
  const matched = dets.filter((d) => {
    if (d.confidence < rule.min_confidence) return false;
    const labelOk = rule.target_labels.length === 0 || rule.target_labels.includes(d.label.toLowerCase());
    const catOk = rule.target_categories.length === 0 ||
      (d.category ? rule.target_categories.includes(d.category.toLowerCase()) : false);
    return labelOk && catOk;
  });
  return matched.length >= rule.min_count ? matched : [];
}

function renderTitle(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? `{${k}}`);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = checkRateLimit(req, RATE_LIMITS.ai, "process-frame", corsHeaders);
  if (!rl.allowed) return rl.response;

  const done = log.time("process-frame");
  try {
    const body = await req.json();
    const {
      cameraId, organizationId, imageBase64, imageUrl,
      occurredAt, eventType = "person_detected", source = "ai",
    } = body ?? {};

    if (!cameraId || !organizationId || (!imageBase64 && !imageUrl)) {
      return new Response(
        JSON.stringify({ error: "cameraId, organizationId and image are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "server misconfigured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: usuário autenticado + membership check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: membership } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "not a member of organization" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Chamar IA
    const imageContent = imageBase64
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

    const aiRes = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash",
        messages: [
          { role: "system", content: DETECTION_PROMPT },
          { role: "user", content: [{ type: "text", text: "Detect objects." }, imageContent] },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const text = await aiRes.text();
      log.error("ai gateway error", { status: aiRes.status, text: text.substring(0, 200) });
      return new Response(JSON.stringify({ error: "ai_gateway_failed", status: aiRes.status }), {
        status: aiRes.status === 429 ? 429 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiRes.json();
    let parsed: { detections?: Detection[] } = {};
    try { parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}"); }
    catch { parsed = {}; }
    const detections = (parsed.detections ?? []).filter(
      (d): d is Detection => !!d && typeof d.label === "string" && typeof d.confidence === "number",
    );

    const at = occurredAt ? new Date(occurredAt) : new Date();

    // 2) Inserir camera_event
    const { data: eventRow, error: evErr } = await admin
      .from("camera_events")
      .insert({
        organization_id: organizationId,
        camera_id: cameraId,
        event_type: eventType,
        occurred_at: at.toISOString(),
        source,
        snapshot_url: imageUrl ?? null,
        metadata: { detection_count: detections.length },
        created_by: userId,
      })
      .select("id")
      .single();
    if (evErr || !eventRow) {
      log.error("insert event failed", { err: evErr?.message });
      return new Response(JSON.stringify({ error: "persist_event_failed", details: evErr?.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const eventId = eventRow.id;

    // 3) Inserir detections
    if (detections.length > 0) {
      await admin.from("event_detections").insert(
        detections.map((d) => ({
          event_id: eventId,
          organization_id: organizationId,
          label: d.label.toLowerCase(),
          category: d.category?.toLowerCase() ?? null,
          confidence: Math.max(0, Math.min(1, d.confidence)),
          bbox: d.bbox ?? null,
          model_name: "google/gemini-1.5-flash",
          attributes: d.attributes ?? {},
        })),
      );
    }

    // 3.1) Detecção de pessoas FORA das áreas permitidas (zonas type='safe')
    //      Gera zone_events (event_type='person_out_of_allowed_area') + event_alerts com dedup.
    const outOfAreaOccurrences: Array<{ label: string; confidence: number; bbox: NonNullable<Detection["bbox"]> }> = [];
    try {
      const { data: cameraOwner } = await admin
        .from("cameras")
        .select("user_id")
        .eq("id", cameraId)
        .maybeSingle();
      const ownerId = cameraOwner?.user_id as string | undefined;

      const { data: allowedZonesRaw } = await admin
        .from("zones")
        .select("id, name, is_active, points, type")
        .eq("camera_id", cameraId)
        .eq("is_active", true)
        .in("type", ["safe"]);

      const allowedZones = (allowedZonesRaw ?? [])
        .map((z) => ({ ...z, geometry: normalizeGeometry(z.points) }))
        .filter((z) => z.geometry && (z.geometry.shape === "polygon" || z.geometry.shape === "rectangle" || z.geometry.shape === "circle"));

      if (ownerId && allowedZones.length > 0) {
        const personDets = detections.filter(
          (d) => !!d.bbox && (d.label.toLowerCase() === "person" || d.category?.toLowerCase() === "person"),
        );
        for (const d of personDets) {
          const inside = allowedZones.some((z) => isBoxInZone(d.bbox!, z.geometry!));
          if (!inside) outOfAreaOccurrences.push({ label: d.label, confidence: d.confidence, bbox: d.bbox! });
        }

        if (outOfAreaOccurrences.length > 0) {
          await admin.from("zone_events").insert(
            outOfAreaOccurrences.map((occ) => ({
              zone_id: null,
              user_id: ownerId,
              event_type: "person_out_of_allowed_area",
              detected_objects: [{
                label: occ.label,
                confidence: occ.confidence,
                bbox: occ.bbox,
                camera_id: cameraId,
                event_id: eventId,
              }],
              timestamp: at.toISOString(),
            })),
          );

          // Alerta agregado por câmera com cooldown de 60s
          const bucket = Math.floor(at.getTime() / 1000 / 60);
          const dedupKey = `out_of_area:${cameraId}:${bucket}`;
          const top = outOfAreaOccurrences.reduce((a, b) => (a.confidence >= b.confidence ? a : b));
          await admin.from("event_alerts").upsert(
            {
              organization_id: organizationId,
              event_id: eventId,
              camera_id: cameraId,
              title: `Pessoa fora da área permitida`,
              description: `${outOfAreaOccurrences.length} pessoa(s) detectada(s) fora das ${allowedZones.length} zona(s) permitida(s) da câmera (confiança máx. ${(top.confidence * 100).toFixed(1)}%).`,
              severity: "high" as const,
              status: "open",
              triggered_at: at.toISOString(),
              dedup_key: dedupKey,
              metadata: {
                kind: "person_out_of_allowed_area",
                occurrences: outOfAreaOccurrences.length,
                allowed_zone_ids: allowedZones.map((z) => z.id),
              },
            },
            { onConflict: "organization_id,dedup_key", ignoreDuplicates: true },
          );
        }
      }
    } catch (err) {
      log.warn("out_of_area_detection_failed", { err: err instanceof Error ? err.message : String(err) });
    }



    // 4) Carregar câmera + regras ativas
    const [{ data: camera }, { data: rules }] = await Promise.all([
      admin.from("cameras").select("name").eq("id", cameraId).maybeSingle(),
      admin.from("camera_detection_rules")
        .select("id,name,target_labels,target_categories,min_confidence,min_count,zone_id,active_days,active_from,active_to,alert_severity,alert_title_template,cooldown_seconds")
        .eq("organization_id", organizationId)
        .eq("camera_id", cameraId)
        .eq("enabled", true),
    ]);

    const cameraName = camera?.name ?? "câmera";
    const alertsCreated: string[] = [];

    // 5) Avaliar regras + cooldown via dedup_key
    for (const rule of (rules ?? []) as Rule[]) {
      const matched = ruleMatches(rule, detections, at);
      if (matched.length === 0) continue;

      const cooldownBucket = rule.cooldown_seconds > 0
        ? Math.floor(at.getTime() / 1000 / rule.cooldown_seconds)
        : at.getTime();
      const dedupKey = `${rule.id}:${cameraId}:${cooldownBucket}`;

      const top = matched.reduce((a, b) => (a.confidence >= b.confidence ? a : b));
      const title = renderTitle(rule.alert_title_template, {
        label: top.label, camera: cameraName, rule: rule.name,
      });

      const { data: alertRow, error: alertErr } = await admin
        .from("event_alerts")
        .upsert(
          {
            organization_id: organizationId,
            event_id: eventId,
            camera_id: cameraId,
            title,
            description: `Regra "${rule.name}" acionada (${matched.length} detecção(ões), confiança ${(top.confidence * 100).toFixed(1)}%)`,
            severity: rule.alert_severity,
            status: "open",
            triggered_at: at.toISOString(),
            dedup_key: dedupKey,
            metadata: {
              rule_id: rule.id,
              matched_count: matched.length,
              top_label: top.label,
              top_confidence: top.confidence,
            },
          },
          { onConflict: "organization_id,dedup_key", ignoreDuplicates: true },
        )
        .select("id")
        .maybeSingle();

      if (alertErr) {
        log.warn("alert upsert error", { rule: rule.id, err: alertErr.message });
        continue;
      }
      if (alertRow?.id) alertsCreated.push(alertRow.id);
    }

    done();
    return new Response(
      JSON.stringify({
        success: true,
        eventId,
        detectionCount: detections.length,
        rulesEvaluated: rules?.length ?? 0,
        alertsCreated,
        outOfAreaOccurrences: outOfAreaOccurrences.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    log.error("unhandled", { err: err instanceof Error ? err.message : String(err) });
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
