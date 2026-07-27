// firmware-fingerprint — Autodetecção de marca/modelo por conteúdo do firmware.
//
// Aceita:
//   - multipart/form-data com campo `file` (≤ 32 MB) e opcional `onvif` (JSON).
//   - application/json com { url: string, onvif?: object } (baixa e analisa).
//
// Retorna { matches, topMatch, ranBy: "server" } e grava telemetria em
// `firmware_fingerprint_events` (hash SHA-256, tamanho, top match, evidências).
// Nunca persiste o binário.
import { createClient } from "npm:@supabase/supabase-js@2";
import { recordEdgeError } from "../_shared/errorAudit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 32 * 1024 * 1024; // 32 MB
const FETCH_TIMEOUT_MS = 15_000;

// ---------- Assinaturas (espelham src/lib/firmwareFingerprints.ts) ----------
// Mantidas embutidas para evitar bundling do código do frontend na função.

type BrandId = "hikvision" | "dahua" | "intelbras" | "usecam" | "xiongmai" | "generica";

interface Signature {
  brandId: BrandId;
  profileId?: string;
  displayName: string;
  modelHints: string[];
  templates: string[];
  defaultPorts: { rtsp: number; onvif: number; http: number };
  strongStrings: string[];
  weakStrings?: string[];
  notes?: string;
}

const SIGNATURES: Signature[] = [
  {
    brandId: "xiongmai",
    profileId: "xiongmai-nbd80x",
    displayName: "XiongMai / HZXM (Sofia)",
    modelHints: ["NBD80X08S-QWG-V3", "NBD80X16S", "NBD80X*"],
    templates: ["xm-xmeye-legacy", "xm-live-chnn", "xm-h264-ch"],
    defaultPorts: { rtsp: 554, onvif: 8899, http: 80 },
    strongStrings: ["Sofia", "HZXM", "XMEYE", "dvrsvr", "XM_", "NBD80X"],
    weakStrings: ["xmeye", "XiongMai"],
    notes: "Firmware Sofia (HZXM/XM). ONVIF em 8899, RTSP com stream=0.sdp.",
  },
  {
    brandId: "hikvision",
    displayName: "Hikvision",
    modelHints: ["DS-2CD*", "DS-7xxx"],
    templates: ["hik-ipc-main-sub", "hik-nvr", "hik-isapi-legacy"],
    defaultPorts: { rtsp: 554, onvif: 80, http: 80 },
    strongStrings: ["hikvision", "HIKVISION", "ISAPI", "davinci"],
    weakStrings: ["Streaming/Channels"],
  },
  {
    brandId: "dahua",
    displayName: "Dahua Technology",
    modelHints: ["IPC-HFW*", "IPC-HDW*", "NVR4xxx"],
    templates: ["dahua-ipc", "dahua-nvr"],
    defaultPorts: { rtsp: 554, onvif: 80, http: 80 },
    strongStrings: ["dahua", "DAHUA", "DVRIPweb", "General.dh"],
    weakStrings: ["cam/realmonitor"],
  },
  {
    brandId: "intelbras",
    displayName: "Intelbras",
    modelHints: ["VIP*", "iM*", "MHDX*"],
    templates: ["intelbras-vip", "intelbras-mhdx"],
    defaultPorts: { rtsp: 554, onvif: 80, http: 80 },
    strongStrings: ["intelbras", "INTELBRAS"],
    weakStrings: ["cam/realmonitor"],
  },
  {
    brandId: "usecam",
    displayName: "Usecam",
    modelHints: ["UC-NVR*", "UC-IPC*"],
    templates: ["usecam-nvr-dahua-like", "usecam-xmeye-legacy", "usecam-hik-like"],
    defaultPorts: { rtsp: 554, onvif: 8899, http: 80 },
    strongStrings: ["Usecam", "USECAM", "uc-nvr", "UC-NVR"],
  },
];

const STRONG = 0.35;
const WEAK = 0.1;
const ONVIF_STRONG = 0.5;

interface Evidence { kind: "magic"|"string"|"onvif"; value: string; weight: number; offset?: number; }
interface Match {
  brandId: BrandId; profileId?: string; displayName: string;
  modelHints: string[]; templates: string[];
  defaultPorts: { rtsp: number; onvif: number; http: number };
  score: number; evidence: Evidence[]; notes?: string;
}

function extractAscii(bytes: Uint8Array): string {
  const CHUNK = 128 * 1024;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    let s = "";
    for (let j = 0; j < slice.length; j++) {
      const b = slice[j];
      s += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "\n";
    }
    parts.push(s);
  }
  return parts.join("");
}

function extractUtf16(bytes: Uint8Array): string {
  let s = "";
  const limit = bytes.length - 1;
  for (let i = 0; i < limit; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    s += code >= 0x20 && code <= 0x7e ? String.fromCharCode(code) : "\n";
  }
  return s;
}

function detectFromBuffer(bytes: Uint8Array): Match[] {
  if (!bytes.length) return [];
  const ascii = extractAscii(bytes).toLowerCase();
  const utf16 = extractUtf16(bytes).toLowerCase();
  const out: Match[] = [];
  for (const sig of SIGNATURES) {
    let score = 0;
    const ev: Evidence[] = [];
    for (const s of sig.strongStrings) {
      const n = s.toLowerCase();
      let idx = ascii.indexOf(n);
      if (idx < 0) idx = utf16.indexOf(n);
      if (idx >= 0) {
        score += STRONG;
        ev.push({ kind: "string", value: `string "${s}"`, weight: STRONG, offset: idx });
      }
    }
    for (const s of sig.weakStrings ?? []) {
      if (ascii.indexOf(s.toLowerCase()) >= 0 || utf16.indexOf(s.toLowerCase()) >= 0) {
        score += WEAK;
        ev.push({ kind: "string", value: `string "${s}"`, weight: WEAK });
      }
    }
    if (score > 0) {
      out.push({
        brandId: sig.brandId, profileId: sig.profileId, displayName: sig.displayName,
        modelHints: sig.modelHints, templates: sig.templates, defaultPorts: sig.defaultPorts,
        score: Math.min(1, score), evidence: ev, notes: sig.notes,
      });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

function detectFromOnvif(onvif: Record<string, unknown> | null | undefined): Match[] {
  if (!onvif) return [];
  const mfr = String(onvif.manufacturer ?? "").toLowerCase();
  const model = String(onvif.model ?? "");
  const hw = String(onvif.hardwareId ?? "");
  const out: Match[] = [];
  for (const sig of SIGNATURES) {
    const hits: Evidence[] = [];
    if (mfr && sig.strongStrings.some((s) => mfr.includes(s.toLowerCase()))) {
      hits.push({ kind: "onvif", value: `Manufacturer=${onvif.manufacturer}`, weight: ONVIF_STRONG });
    }
    if (hw && sig.modelHints.some((h) => matchHint(h, hw))) {
      hits.push({ kind: "onvif", value: `HardwareId=${hw}`, weight: ONVIF_STRONG });
    }
    if (model && sig.modelHints.some((h) => matchHint(h, model))) {
      hits.push({ kind: "onvif", value: `Model=${model}`, weight: ONVIF_STRONG });
    }
    if (hits.length) {
      out.push({
        brandId: sig.brandId, profileId: sig.profileId, displayName: sig.displayName,
        modelHints: sig.modelHints, templates: sig.templates, defaultPorts: sig.defaultPorts,
        score: Math.min(1, hits.length * ONVIF_STRONG), evidence: hits, notes: sig.notes,
      });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

function matchHint(pattern: string, candidate: string): boolean {
  const p = pattern.trim().toLowerCase();
  const c = candidate.trim().toLowerCase();
  if (!p || !c) return false;
  if (p.endsWith("*")) return c.startsWith(p.slice(0, -1));
  return p === c;
}

function mergeMatches(...groups: Match[][]): Match[] {
  const byKey = new Map<string, Match>();
  for (const g of groups) for (const m of g) {
    const key = `${m.brandId}:${m.profileId ?? ""}`;
    const cur = byKey.get(key);
    if (!cur) byKey.set(key, { ...m, evidence: [...m.evidence] });
    else {
      cur.score = Math.min(1, cur.score + m.score);
      cur.evidence.push(...m.evidence);
      if (!cur.profileId && m.profileId) cur.profileId = m.profileId;
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.score - a.score);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Uint8Array> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`download_failed_${res.status}`);
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len && len > MAX_BYTES) throw new Error("file_too_large");
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) throw new Error("file_too_large");
    return buf;
  } finally {
    clearTimeout(t);
  }
}

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = SUPABASE_URL && SERVICE_ROLE
    ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    : null;

  // Resolve user_id a partir do JWT (verify_jwt=false por padrão nesse projeto,
  // mas se veio Authorization Bearer usamos para telemetria).
  let userId: string | null = null;
  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token && admin) {
      const { data } = await admin.auth.getUser(token);
      userId = data.user?.id ?? null;
    }
  } catch { /* ignore */ }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let bytes: Uint8Array | null = null;
    let onvif: Record<string, unknown> | null = null;
    let source: "upload" | "url" | "onvif-probe" = "upload";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const onvifRaw = form.get("onvif");
      if (file instanceof File) {
        if (file.size > MAX_BYTES) return json({ error: "file_too_large" }, 413);
        bytes = new Uint8Array(await file.arrayBuffer());
      }
      if (typeof onvifRaw === "string") {
        try { onvif = JSON.parse(onvifRaw); } catch { /* ignore */ }
      }
    } else {
      const body = await req.json().catch(() => ({} as Record<string, unknown>));
      onvif = (body?.onvif as Record<string, unknown> | undefined) ?? null;
      const url = typeof body?.url === "string" ? body.url : "";
      if (url) {
        source = "url";
        try { bytes = await fetchWithTimeout(url, FETCH_TIMEOUT_MS); }
        catch (e) {
          const msg = e instanceof Error ? e.message : "download_failed";
          return json({ error: msg }, msg === "file_too_large" ? 413 : 400);
        }
      } else if (onvif) {
        source = "onvif-probe";
      }
    }

    const fromBuf = bytes ? detectFromBuffer(bytes) : [];
    const fromOnvif = onvif ? detectFromOnvif(onvif) : [];
    const matches = mergeMatches(fromBuf, fromOnvif);
    const topMatch = matches[0] ?? null;

    // Telemetria (best-effort, nunca bloqueia).
    if (admin && userId) {
      try {
        const sha = bytes ? await sha256Hex(bytes) : "onvif-only";
        await admin.from("firmware_fingerprint_events").insert({
          user_id: userId,
          sha256: sha,
          size_bytes: bytes?.byteLength ?? null,
          source,
          top_brand: topMatch?.brandId ?? null,
          top_profile_id: topMatch?.profileId ?? null,
          top_score: topMatch ? Number(topMatch.score.toFixed(3)) : null,
          matched_count: matches.length,
          evidence: topMatch?.evidence?.slice(0, 12) ?? [],
        });
      } catch { /* ignore telemetry errors */ }
    }

    return json({ matches, topMatch, ranBy: "server" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "internal_error";
    await recordEdgeError({
      function_name: "firmware-fingerprint",
      error_code: "internal_error",
      http_status: 500,
      user_id: userId,
      message: msg,
      // Deixa a taxonomia classificar: erro de rede vira classe, erro de
      // lógica permanece sem classe (e sem acusar equipamento algum).
      error: err,
    }).catch(() => { /* ignore */ });
    return json({ error: "internal_error", details: msg }, 500);
  }
});
