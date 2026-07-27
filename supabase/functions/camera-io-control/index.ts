// Onda 154 — camera-io-control: descoberta e acionamento de I/O físico ONVIF.
//
// Dois verbos, um único porteiro:
//   { action: "discover", camera_id }              → GetRelayOutputs + GetDigitalInputs
//   { action: "actuate",  camera_id, port_id, command, duration_ms? }
//
// Ordem das checagens (nunca inverter):
//   1. JWT válido               → 401
//   2. capability cameras.control_io (servidor, via effective_capabilities) → 403
//   3. propriedade da câmera sob RLS do chamador                            → 404
//   4. ioSafety.decideActuation (regra única, espelhada de src/lib)         → 409
//   5. só então o SOAP toca o equipamento
//
// A trilha `io_actuation_log` recebe TODA tentativa — inclusive as recusadas
// antes de chegar ao hardware. Recusa não registrada é recusa invisível, e
// auditoria de alarme físico que só grava sucesso não serve como prova.
import { createClient } from "npm:@supabase/supabase-js@2";
import { decideActuation, type IoPortConfig } from "../_shared/ioSafety.ts";
import { extractDigitalInputs, extractRelayOutputs } from "../_shared/onvifIo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const j = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function escapeXml(s: string): string {
  return s.replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!),
  );
}

async function wsseHeader(username: string, password: string): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const created = new Date().toISOString();
  const enc = new TextEncoder();
  const passBytes = enc.encode(password);
  const createdBytes = enc.encode(created);
  const buf = new Uint8Array(nonce.length + createdBytes.length + passBytes.length);
  buf.set(nonce, 0);
  buf.set(createdBytes, nonce.length);
  buf.set(passBytes, nonce.length + createdBytes.length);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", buf));
  const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
  return `<s:Header>
    <Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <UsernameToken>
        <Username>${escapeXml(username)}</Username>
        <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${b64(digest)}</Password>
        <Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${b64(nonce)}</Nonce>
        <Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">${created}</Created>
      </UsernameToken>
    </Security>
  </s:Header>`;
}

async function soap(
  url: string,
  headerXml: string,
  bodyXml: string,
  timeoutMs = 6000,
): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
  xmlns:tt="http://www.onvif.org/ver10/schema"
  xmlns:tds="http://www.onvif.org/ver10/device/wsdl"
  xmlns:tmd="http://www.onvif.org/ver10/deviceIO/wsdl">
  ${headerXml}
  <s:Body>${bodyXml}</s:Body>
</s:Envelope>`,
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (e) {
    return { ok: false, status: 0, text: String(e) };
  } finally {
    clearTimeout(t);
  }
}

interface Payload {
  action?: "discover" | "actuate";
  camera_id?: string;
  port_id?: string;
  command?: "pulse" | "set_active" | "set_inactive";
  duration_ms?: number | null;
  origin?: "manual" | "rule" | "schedule";
  origin_ref?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "method_not_allowed" }, 405);

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, service);

    // Chamada interna do motor de regras: o portador é a própria chave de
    // serviço. Não há usuário, e não deve haver — a regra já foi autorizada
    // quando o operador a criou. O que NÃO muda é o resto: a decisão de
    // segurança do pulso continua sendo a mesma função, e o log continua
    // registrando origem `rule`. Sistema não ganha passe livre no ioSafety.
    const isSystemCall = bearer !== "" && bearer === service;

    // 1. autenticação
    const { data: { user } } = isSystemCall
      ? { data: { user: null } }
      : await userClient.auth.getUser();
    if (!user && !isSystemCall) return j({ error: "unauthenticated" }, 401);

    // 2. capability no servidor — a UI apenas antecipa esta recusa
    let canControl = isSystemCall;
    if (user) {
      const { data: caps } = await admin.rpc("effective_capabilities", { p_user_id: user.id });
      const capList: string[] = Array.isArray(caps) ? caps as string[] : [];
      canControl = capList.includes("cameras.control_io");
    }

    const payload = (await req.json()) as Payload;
    const action = payload.action ?? "actuate";
    if (!payload.camera_id) return j({ error: "missing_camera_id" }, 400);
    // Descoberta é operação de cadastro e nunca é feita pelo sistema.
    if (action === "discover" && isSystemCall) return j({ error: "forbidden_for_system" }, 403);

    // 3. propriedade sob RLS do chamador — nunca com service role para usuário
    const scopedClient = isSystemCall ? admin : userClient;
    const { data: camera } = await scopedClient
      .from("cameras")
      .select("id, user_id")
      .eq("id", payload.camera_id)
      .maybeSingle();
    if (!camera) return j({ error: "camera_not_found" }, 404);

    // Endpoint e credenciais ONVIF vivem em camera_ptz_config — a mesma fonte
    // que o PTZ já usa. Reaproveitar evita duas verdades sobre o mesmo
    // equipamento (e duas senhas para o operador manter em dia).
    const { data: cfgRow } = await admin
      .from("camera_ptz_config")
      .select("endpoint, port, username, password_encrypted")
      .eq("camera_id", camera.id)
      .maybeSingle();
    if (!cfgRow?.endpoint) return j({ error: "onvif_not_configured" }, 409);

    const endpoint = String(cfgRow.endpoint);
    const port = Number(cfgRow.port ?? 80) || 80;
    if (!/^[a-zA-Z0-9.\-_]+$/.test(endpoint)) return j({ error: "invalid_endpoint" }, 400);

    const header = await wsseHeader(cfgRow.username ?? "", cfgRow.password_encrypted ?? "");
    const deviceUrl = `http://${endpoint}:${port}/onvif/device_service`;
    const deviceIoUrl = `http://${endpoint}:${port}/onvif/deviceIO_service`;

    /* ---------------- discover ---------------- */
    if (action === "discover") {
      if (!canControl) return j({ error: "missing_capability" }, 403);

      const relayRes = await soap(deviceUrl, header, "<tds:GetRelayOutputs/>");
      if (!relayRes.ok && relayRes.status === 0) {
        return j({ error: "unreachable", hint: "Equipamento não respondeu no serviço ONVIF" }, 200);
      }
      const outputs = relayRes.ok ? extractRelayOutputs(relayRes.text) : [];

      // Ausência de DeviceIO não é erro — é equipamento sem entradas declaradas.
      const inputRes = await soap(deviceIoUrl, header, "<tmd:GetDigitalInputs/>");
      const inputs = inputRes.ok ? extractDigitalInputs(inputRes.text) : [];

      const rows = [...outputs, ...inputs].map((p, index) => ({
        user_id: camera.user_id,
        camera_id: camera.id,
        direction: p.direction,
        port_token: p.portToken,
        label: p.direction === "output"
          ? `Saída ${index + 1} (${p.portToken})`
          : `Entrada ${p.portToken}`,
        idle_state: p.idleState,
        output_mode: p.outputMode,
        pulse_ms: p.delayMs && p.delayMs >= 100 ? p.delayMs : 2000,
        metadata: { discovered_at: new Date().toISOString() },
      }));

      let persisted = 0;
      for (const row of rows) {
        // upsert preserva rótulo e ajustes já feitos pelo operador: só
        // reafirmamos o que o equipamento declara sobre si mesmo.
        const { error } = await admin
          .from("camera_io_ports")
          .upsert(row, { onConflict: "camera_id,port_token", ignoreDuplicates: true });
        if (!error) persisted++;
      }

      return j({
        ok: true,
        outputs: outputs.length,
        inputs: inputs.length,
        persisted,
        device_io_supported: inputRes.ok,
      });
    }

    /* ---------------- actuate ---------------- */
    const { data: portRow } = await scopedClient
      .from("camera_io_ports")
      .select("*")
      .eq("id", payload.port_id ?? "")
      .eq("camera_id", camera.id)
      .maybeSingle();

    const nowMs = Date.now();
    const cfg: IoPortConfig | null = portRow
      ? {
        id: portRow.id,
        direction: portRow.direction,
        enabled: portRow.enabled,
        outputMode: portRow.output_mode,
        pulseMs: portRow.pulse_ms,
        minIntervalMs: portRow.min_interval_ms,
        lastState: portRow.last_state,
        lastActuatedAtMs: portRow.last_actuated_at
          ? Date.parse(portRow.last_actuated_at)
          : null,
      }
      : null;

    // 4. regra única de segurança
    const decision = decideActuation({
      port: cfg,
      command: { kind: payload.command ?? "pulse", durationMs: payload.duration_ms ?? null },
      hasCapability: canControl,
      nowMs,
    });

    const logBase = {
      user_id: camera.user_id,
      camera_id: camera.id,
      port_id: portRow?.id ?? null,
      port_token: portRow?.port_token ?? null,
      origin: payload.origin ?? "manual",
      origin_ref: payload.origin_ref ?? null,
      actor_user_id: user?.id ?? null,
      command: payload.command ?? "pulse",
      requested_ms: payload.duration_ms ?? null,
    };

    if (!decision.allowed) {
      await admin.from("io_actuation_log").insert({
        ...logBase,
        outcome: "refused",
        reason_code: decision.reason,
        latency_ms: Date.now() - startedAt,
      });
      const status = decision.reason === "missing_capability"
        ? 403
        : decision.reason === "unknown_port"
        ? 404
        : 409;
      return j({ error: decision.reason, retry_after_ms: decision.retryAfterMs ?? null }, status);
    }

    // 5. hardware
    const token = escapeXml(portRow!.port_token);
    const wanted = decision.kind === "set_inactive" ? "inactive" : "active";
    const setState = (state: string) =>
      soap(
        deviceUrl,
        header,
        `<tds:SetRelayOutputState><tds:RelayOutputToken>${token}</tds:RelayOutputToken><tds:LogicalState>${state}</tds:LogicalState></tds:SetRelayOutputState>`,
      );

    const first = await setState(wanted);
    if (!first.ok) {
      await admin.from("io_actuation_log").insert({
        ...logBase,
        outcome: "failed",
        reason_code: first.status === 0 ? "unreachable" : `onvif_${first.status}`,
        latency_ms: Date.now() - startedAt,
      });
      return j({ error: "actuation_failed", status: first.status }, 502);
    }

    // Pulso: o retorno ao repouso é responsabilidade nossa, não do equipamento.
    // Muitos relés "monostable" ignoram o DelayTime configurado; fechar o pulso
    // aqui evita sirene travada ligada por falha de firmware.
    let released = true;
    if (decision.kind === "pulse" && decision.effectiveMs) {
      await new Promise((r) => setTimeout(r, decision.effectiveMs!));
      const back = await setState("inactive");
      released = back.ok;
    }

    const finalState = decision.kind === "pulse"
      ? (released ? "inactive" : "unknown")
      : decision.kind === "set_active"
      ? "active"
      : "inactive";

    await admin
      .from("camera_io_ports")
      .update({
        last_state: finalState,
        last_state_at: new Date().toISOString(),
        last_actuated_at: new Date(nowMs).toISOString(),
      })
      .eq("id", portRow!.id);

    await admin.from("io_actuation_log").insert({
      ...logBase,
      outcome: released ? "ok" : "partial",
      reason_code: released ? null : "release_failed",
      latency_ms: Date.now() - startedAt,
    });

    return j({
      ok: true,
      command: decision.kind,
      effective_ms: decision.effectiveMs,
      state: finalState,
      next_allowed_at_ms: decision.nextAllowedAtMs,
    });
  } catch (e) {
    return j({ error: "internal", detail: String(e) }, 500);
  }
});
