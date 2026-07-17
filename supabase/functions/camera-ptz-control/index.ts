// Edge Function: camera-ptz-control
// Multi-driver PTZ control (ONVIF/Hikvision/Dahua/Axis) with role check,
// cooperative lock validation and audit logging.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PtzCommand =
  | "move" | "stop" | "zoom" | "focus" | "iris"
  | "goto_preset" | "save_preset" | "delete_preset" | "home" | "test";

interface PtzPayload {
  camera_id: string;
  command: PtzCommand;
  params?: {
    pan?: number;   // -1..1
    tilt?: number;  // -1..1
    zoom?: number;  // -1..1
    focus?: number; // -1..1
    iris?: number;  // -1..1
    speed?: number; // 1..10
    preset_number?: number;
    preset_name?: string;
  };
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function b64(str: string) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function driverHikvision(cfg: any, cmd: PtzCommand, p: any): Promise<Response> {
  const base = `http://${cfg.endpoint}:${cfg.port}/ISAPI/PTZCtrl/channels/${cfg.channel}`;
  const auth = cfg.username ? `Basic ${b64(`${cfg.username}:${cfg.password_encrypted ?? ""}`)}` : "";
  const speedPct = Math.round((p.speed ?? cfg.default_speed ?? 5) * 10); // 1..100

  if (cmd === "move" || cmd === "zoom") {
    const pan = clamp(Math.round((p.pan ?? 0) * 100), -100, 100);
    const tilt = clamp(Math.round((p.tilt ?? 0) * 100), -100, 100);
    const zoom = clamp(Math.round((p.zoom ?? 0) * 100), -100, 100);
    const body = `<?xml version="1.0"?><PTZData><pan>${pan}</pan><tilt>${tilt}</tilt><zoom>${zoom}</zoom></PTZData>`;
    return fetch(`${base}/continuous`, { method: "PUT", headers: { Authorization: auth, "Content-Type": "application/xml" }, body });
  }
  if (cmd === "stop") {
    const body = `<?xml version="1.0"?><PTZData><pan>0</pan><tilt>0</tilt><zoom>0</zoom></PTZData>`;
    return fetch(`${base}/continuous`, { method: "PUT", headers: { Authorization: auth, "Content-Type": "application/xml" }, body });
  }
  if (cmd === "goto_preset") {
    return fetch(`${base}/presets/${p.preset_number}/goto`, { method: "PUT", headers: { Authorization: auth } });
  }
  if (cmd === "save_preset") {
    const body = `<?xml version="1.0"?><PTZPreset><id>${p.preset_number}</id><presetName>${p.preset_name ?? "Preset"}</presetName></PTZPreset>`;
    return fetch(`${base}/presets/${p.preset_number}`, { method: "PUT", headers: { Authorization: auth, "Content-Type": "application/xml" }, body });
  }
  if (cmd === "focus") {
    const focus = clamp(Math.round((p.focus ?? 0) * 100), -100, 100);
    return fetch(`${base}/continuous`, { method: "PUT", headers: { Authorization: auth, "Content-Type": "application/xml" },
      body: `<?xml version="1.0"?><PTZData><focus>${focus}</focus></PTZData>` });
  }
  return new Response("noop", { status: 200 });
}

async function driverDahua(cfg: any, cmd: PtzCommand, p: any): Promise<Response> {
  const auth = cfg.username ? `Basic ${b64(`${cfg.username}:${cfg.password_encrypted ?? ""}`)}` : "";
  const url = (qs: string) => `http://${cfg.endpoint}:${cfg.port}/cgi-bin/ptz.cgi?${qs}&channel=${cfg.channel - 1}`;
  const speed = clamp(p.speed ?? cfg.default_speed ?? 5, 1, 8);

  if (cmd === "move") {
    const pan = p.pan ?? 0, tilt = p.tilt ?? 0;
    const dir = pan > 0.1 ? (tilt > 0.1 ? "RightUp" : tilt < -0.1 ? "RightDown" : "Right")
              : pan < -0.1 ? (tilt > 0.1 ? "LeftUp" : tilt < -0.1 ? "LeftDown" : "Left")
              : tilt > 0.1 ? "Up" : tilt < -0.1 ? "Down" : "";
    if (!dir) return fetch(url(`action=stop&code=${dir || "Up"}&arg1=0&arg2=${speed}&arg3=0`), { headers: { Authorization: auth } });
    return fetch(url(`action=start&code=${dir}&arg1=0&arg2=${speed}&arg3=0`), { headers: { Authorization: auth } });
  }
  if (cmd === "zoom") {
    const dir = (p.zoom ?? 0) > 0 ? "ZoomTele" : "ZoomWide";
    return fetch(url(`action=start&code=${dir}&arg1=0&arg2=${speed}&arg3=0`), { headers: { Authorization: auth } });
  }
  if (cmd === "stop") return fetch(url(`action=stop&code=Left&arg1=0&arg2=0&arg3=0`), { headers: { Authorization: auth } });
  if (cmd === "goto_preset") return fetch(url(`action=start&code=GotoPreset&arg1=0&arg2=${p.preset_number}&arg3=0`), { headers: { Authorization: auth } });
  if (cmd === "save_preset") return fetch(url(`action=start&code=SetPreset&arg1=0&arg2=${p.preset_number}&arg3=0`), { headers: { Authorization: auth } });
  return new Response("noop", { status: 200 });
}

async function driverAxis(cfg: any, cmd: PtzCommand, p: any): Promise<Response> {
  const auth = cfg.username ? `Basic ${b64(`${cfg.username}:${cfg.password_encrypted ?? ""}`)}` : "";
  const base = `http://${cfg.endpoint}:${cfg.port}/axis-cgi/com/ptz.cgi?camera=${cfg.channel}`;
  const speed = clamp(p.speed ?? cfg.default_speed ?? 5, 1, 10) * 10;

  if (cmd === "move") return fetch(`${base}&continuouspantiltmove=${Math.round((p.pan ?? 0) * speed)},${Math.round((p.tilt ?? 0) * speed)}`, { headers: { Authorization: auth } });
  if (cmd === "zoom") return fetch(`${base}&continuouszoommove=${Math.round((p.zoom ?? 0) * speed)}`, { headers: { Authorization: auth } });
  if (cmd === "stop") return fetch(`${base}&continuouspantiltmove=0,0&continuouszoommove=0`, { headers: { Authorization: auth } });
  if (cmd === "goto_preset") return fetch(`${base}&gotoserverpresetno=${p.preset_number}`, { headers: { Authorization: auth } });
  if (cmd === "save_preset") return fetch(`${base}&setserverpresetname=${encodeURIComponent(p.preset_name ?? `Preset ${p.preset_number}`)}`, { headers: { Authorization: auth } });
  return new Response("noop", { status: 200 });
}

async function driverOnvif(cfg: any, cmd: PtzCommand, p: any): Promise<Response> {
  // Simplified ONVIF PTZ over SOAP. Real deployments should use WS-Security.
  const url = `http://${cfg.endpoint}:${cfg.port}/onvif/ptz_service`;
  const speed = clamp(p.speed ?? cfg.default_speed ?? 5, 1, 10) / 10;
  const profile = `Profile_${cfg.channel}`;

  const envelope = (body: string) => `<?xml version="1.0"?>
  <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tt="http://www.onvif.org/ver10/schema" xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl">
    <s:Body>${body}</s:Body></s:Envelope>`;

  let body = "";
  if (cmd === "move" || cmd === "zoom") {
    body = `<tptz:ContinuousMove><tptz:ProfileToken>${profile}</tptz:ProfileToken>
      <tptz:Velocity>
        <tt:PanTilt x="${(p.pan ?? 0) * speed}" y="${(p.tilt ?? 0) * speed}"/>
        <tt:Zoom x="${(p.zoom ?? 0) * speed}"/>
      </tptz:Velocity></tptz:ContinuousMove>`;
  } else if (cmd === "stop") {
    body = `<tptz:Stop><tptz:ProfileToken>${profile}</tptz:ProfileToken><tptz:PanTilt>true</tptz:PanTilt><tptz:Zoom>true</tptz:Zoom></tptz:Stop>`;
  } else if (cmd === "goto_preset") {
    body = `<tptz:GotoPreset><tptz:ProfileToken>${profile}</tptz:ProfileToken><tptz:PresetToken>${p.preset_number}</tptz:PresetToken></tptz:GotoPreset>`;
  } else if (cmd === "save_preset") {
    body = `<tptz:SetPreset><tptz:ProfileToken>${profile}</tptz:ProfileToken><tptz:PresetName>${p.preset_name ?? "Preset"}</tptz:PresetName><tptz:PresetToken>${p.preset_number}</tptz:PresetToken></tptz:SetPreset>`;
  }
  const auth = cfg.username ? `Basic ${b64(`${cfg.username}:${cfg.password_encrypted ?? ""}`)}` : "";
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/soap+xml", Authorization: auth }, body: envelope(body) });
}

async function dispatch(cfg: any, cmd: PtzCommand, params: any) {
  switch (cfg.protocol) {
    case "hikvision": return driverHikvision(cfg, cmd, params);
    case "dahua": return driverDahua(cfg, cmd, params);
    case "axis": return driverAxis(cfg, cmd, params);
    case "onvif": default: return driverOnvif(cfg, cmd, params);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload = await req.json() as PtzPayload;
    const { camera_id, command, params = {} } = payload;
    if (!camera_id || !command) return new Response(JSON.stringify({ error: "camera_id e command são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Role check
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    const canOperate = roleSet.has("admin") || roleSet.has("manager") || roleSet.has("operator");
    if (!canOperate) return new Response(JSON.stringify({ error: "papel_insuficiente" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Load config
    const { data: cfg, error: cfgErr } = await admin.from("camera_ptz_config").select("*").eq("camera_id", camera_id).maybeSingle();
    if (cfgErr || !cfg) return new Response(JSON.stringify({ error: "ptz_nao_configurado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Acquire lock (via SECURITY DEFINER rpc using user's context)
    const { data: lockRes, error: lockErr } = await userClient.rpc("acquire_ptz_lock", { _camera_id: camera_id, _ttl_seconds: 10 });
    if (lockErr) return new Response(JSON.stringify({ error: "lock_error", detail: lockErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (lockRes && lockRes.acquired === false) {
      return new Response(JSON.stringify({ error: "camera_em_uso", locked_by: lockRes.locked_by }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Dispatch to driver
    let camResp: Response | null = null;
    let camStatus = 0, camBody = "";
    try {
      camResp = await dispatch(cfg, command, params);
      camStatus = camResp.status;
      camBody = (await camResp.text()).slice(0, 500);
    } catch (e) {
      camStatus = 0;
      camBody = String(e).slice(0, 500);
    }

    // Persist preset metadata on save
    if (command === "save_preset" && params.preset_number) {
      await admin.from("camera_presets").upsert({
        camera_id,
        user_id: cfg.user_id,
        preset_number: params.preset_number,
        name: params.preset_name ?? `Preset ${params.preset_number}`,
        ptz_position: params,
      }, { onConflict: "camera_id,preset_number" });
    }
    if (command === "delete_preset" && params.preset_number) {
      await admin.from("camera_presets").delete().eq("camera_id", camera_id).eq("preset_number", params.preset_number);
    }

    // Audit
    await admin.from("audit_logs").insert({
      user_id: user.id,
      action: `ptz.${command}`,
      entity_type: "camera",
      entity_id: camera_id,
      severity: "low",
      new_values: { command, params, driver: cfg.protocol, cam_status: camStatus },
    });

    return new Response(JSON.stringify({ ok: camStatus >= 200 && camStatus < 400, cam_status: camStatus, driver: cfg.protocol, response: camBody }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "internal", detail: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
