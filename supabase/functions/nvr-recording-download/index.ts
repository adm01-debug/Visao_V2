// Edge Function: nvr-recording-download
// Lista e baixa trechos de gravação de NVRs Dahua via HTTP-CGI,
// salvando no bucket privado `nvr-recordings` com progresso e retry.
//
// Ações suportadas (POST JSON):
//  { action: "list",     nvr: {...}, channel, stream_type, start_time, end_time }
//  { action: "download", nvr: {...}, download_id }           // reprocessa uma linha existente
//  { action: "download", nvr: {...}, channel, stream_type,   // cria + baixa
//                        start_time, end_time, remote_file_path? }
//  { action: "cancel",   download_id }
//
// `nvr` = { host, http_port?, username, password }. Credenciais NUNCA são persistidas.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type NvrCreds = {
  host: string;
  http_port?: number;
  username: string;
  password: string;
};

type ListReq = {
  action: "list";
  nvr_id?: string;
  nvr: NvrCreds;
  channel: number;
  stream_type?: "main" | "sub";
  start_time: string;
  end_time: string;
};

type DownloadReq = {
  action: "download";
  nvr_id?: string;
  nvr: NvrCreds;
  download_id?: string;
  channel?: number;
  stream_type?: "main" | "sub";
  start_time?: string;
  end_time?: string;
  remote_file_path?: string;
  max_attempts?: number;
};

type CancelReq = { action: "cancel"; download_id: string };
type Req = ListReq | DownloadReq | CancelReq;

const BUCKET = "nvr-recordings";
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GiB por trecho
const PROGRESS_EVERY = 512 * 1024; // atualiza a cada 512 KiB
const CHUNK_SIZE = 5 * 1024 * 1024; // uploads em blocos de 5 MiB
const DEFAULT_MAX_ATTEMPTS = 3;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fmtDahuaDate(iso: string): string {
  // Dahua espera "YYYY-MM-DD HH:mm:ss" (URL encoded)
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// -------- Digest Auth (MD5) minimal ------------------------------------
async function md5(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  // Deno subtle não suporta MD5; use crypto do WebCrypto via 'node:crypto' equivalent.
  // Alternativa: implementação md5 pura via npm.
  // @ts-ignore npm import in Deno edge
  const { createHash } = await import("npm:node-forge@1.3.1/lib/md5.js").catch(() => ({}));
  if (createHash) {
    // node-forge fallback
    const forge = await import("npm:node-forge@1.3.1");
    const md = forge.md.md5.create();
    md.update(input, "utf8");
    return md.digest().toHex();
  }
  // Fallback via SubtleCrypto (não tem MD5) — usa impl JS embutida
  return md5Pure(bytes);
}

// md5 puro (RFC 1321) — pequeno, sem dependências
function md5Pure(bytes: Uint8Array): string {
  function toHex(n: number) {
    let s = "", j = 0;
    for (; j < 4; j++) s += ((n >> (j * 8 + 4)) & 0x0f).toString(16) + ((n >> (j * 8)) & 0x0f).toString(16);
    return s;
  }
  function add32(a: number, b: number) { return (a + b) & 0xffffffff; }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  const n = bytes.length;
  const buf = new Uint8Array((((n + 8) >> 6) + 1) * 64);
  buf.set(bytes);
  buf[n] = 0x80;
  const bits = n * 8;
  buf[buf.length - 8] = bits & 0xff;
  buf[buf.length - 7] = (bits >>> 8) & 0xff;
  buf[buf.length - 6] = (bits >>> 16) & 0xff;
  buf[buf.length - 5] = (bits >>> 24) & 0xff;
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  const x = new Int32Array(16);
  const dv = new DataView(buf.buffer);
  for (let i = 0; i < buf.length; i += 64) {
    for (let j = 0; j < 16; j++) x[j] = dv.getInt32(i + j * 4, true);
    const oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, x[0], 7, -680876936); d = ff(d, a, b, c, x[1], 12, -389564586); c = ff(c, d, a, b, x[2], 17, 606105819); b = ff(b, c, d, a, x[3], 22, -1044525330);
    a = ff(a, b, c, d, x[4], 7, -176418897); d = ff(d, a, b, c, x[5], 12, 1200080426); c = ff(c, d, a, b, x[6], 17, -1473231341); b = ff(b, c, d, a, x[7], 22, -45705983);
    a = ff(a, b, c, d, x[8], 7, 1770035416); d = ff(d, a, b, c, x[9], 12, -1958414417); c = ff(c, d, a, b, x[10], 17, -42063); b = ff(b, c, d, a, x[11], 22, -1990404162);
    a = ff(a, b, c, d, x[12], 7, 1804603682); d = ff(d, a, b, c, x[13], 12, -40341101); c = ff(c, d, a, b, x[14], 17, -1502002290); b = ff(b, c, d, a, x[15], 22, 1236535329);
    a = gg(a, b, c, d, x[1], 5, -165796510); d = gg(d, a, b, c, x[6], 9, -1069501632); c = gg(c, d, a, b, x[11], 14, 643717713); b = gg(b, c, d, a, x[0], 20, -373897302);
    a = gg(a, b, c, d, x[5], 5, -701558691); d = gg(d, a, b, c, x[10], 9, 38016083); c = gg(c, d, a, b, x[15], 14, -660478335); b = gg(b, c, d, a, x[4], 20, -405537848);
    a = gg(a, b, c, d, x[9], 5, 568446438); d = gg(d, a, b, c, x[14], 9, -1019803690); c = gg(c, d, a, b, x[3], 14, -187363961); b = gg(b, c, d, a, x[8], 20, 1163531501);
    a = gg(a, b, c, d, x[13], 5, -1444681467); d = gg(d, a, b, c, x[2], 9, -51403784); c = gg(c, d, a, b, x[7], 14, 1735328473); b = gg(b, c, d, a, x[12], 20, -1926607734);
    a = hh(a, b, c, d, x[5], 4, -378558); d = hh(d, a, b, c, x[8], 11, -2022574463); c = hh(c, d, a, b, x[11], 16, 1839030562); b = hh(b, c, d, a, x[14], 23, -35309556);
    a = hh(a, b, c, d, x[1], 4, -1530992060); d = hh(d, a, b, c, x[4], 11, 1272893353); c = hh(c, d, a, b, x[7], 16, -155497632); b = hh(b, c, d, a, x[10], 23, -1094730640);
    a = hh(a, b, c, d, x[13], 4, 681279174); d = hh(d, a, b, c, x[0], 11, -358537222); c = hh(c, d, a, b, x[3], 16, -722521979); b = hh(b, c, d, a, x[6], 23, 76029189);
    a = hh(a, b, c, d, x[9], 4, -640364487); d = hh(d, a, b, c, x[12], 11, -421815835); c = hh(c, d, a, b, x[15], 16, 530742520); b = hh(b, c, d, a, x[2], 23, -995338651);
    a = ii(a, b, c, d, x[0], 6, -198630844); d = ii(d, a, b, c, x[7], 10, 1126891415); c = ii(c, d, a, b, x[14], 15, -1416354905); b = ii(b, c, d, a, x[5], 21, -57434055);
    a = ii(a, b, c, d, x[12], 6, 1700485571); d = ii(d, a, b, c, x[3], 10, -1894986606); c = ii(c, d, a, b, x[10], 15, -1051523); b = ii(b, c, d, a, x[1], 21, -2054922799);
    a = ii(a, b, c, d, x[8], 6, 1873313359); d = ii(d, a, b, c, x[15], 10, -30611744); c = ii(c, d, a, b, x[6], 15, -1560198380); b = ii(b, c, d, a, x[13], 21, 1309151649);
    a = ii(a, b, c, d, x[4], 6, -145523070); d = ii(d, a, b, c, x[11], 10, -1120210379); c = ii(c, d, a, b, x[2], 15, 718787259); b = ii(b, c, d, a, x[9], 21, -343485551);
    a = add32(a, oa); b = add32(b, ob); c = add32(c, oc); d = add32(d, od);
  }
  return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}

function parseChallenge(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)=(?:"([^"]*)"|([^,]*))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(header)) !== null) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? "";
  return out;
}

function randomHex(n = 16): string {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function digestAuthHeader(
  method: string,
  urlPath: string,
  user: string,
  pass: string,
  challenge: Record<string, string>,
): Promise<string> {
  const realm = challenge.realm ?? "";
  const nonce = challenge.nonce ?? "";
  const qop = challenge.qop ?? "auth";
  const opaque = challenge.opaque;
  const nc = "00000001";
  const cnonce = randomHex(8);
  const ha1 = await md5(`${user}:${realm}:${pass}`);
  const ha2 = await md5(`${method}:${urlPath}`);
  const response = await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  const parts = [
    `username="${user}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${urlPath}"`,
    `algorithm=MD5`,
    `qop=${qop}`,
    `nc=${nc}`,
    `cnonce="${cnonce}"`,
    `response="${response}"`,
  ];
  if (opaque) parts.push(`opaque="${opaque}"`);
  return `Digest ${parts.join(", ")}`;
}

async function cgiFetch(
  base: string,
  urlPath: string,
  user: string,
  pass: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${base}${urlPath}`;
  const first = await fetch(url, init);
  if (first.status !== 401) return first;
  const wa = first.headers.get("www-authenticate") ?? "";
  await first.body?.cancel();
  if (!wa.toLowerCase().startsWith("digest")) {
    // Basic fallback
    const basic = "Basic " + btoa(`${user}:${pass}`);
    return fetch(url, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: basic },
    });
  }
  const challenge = parseChallenge(wa.slice(7));
  const auth = await digestAuthHeader(init?.method ?? "GET", urlPath, user, pass, challenge);
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: auth },
  });
}

// -------- Dahua mediaFileFind ------------------------------------------
type Recording = {
  file_path: string;
  channel: number;
  start_time: string;
  end_time: string;
  length_bytes?: number;
  type?: string;
};

function parseFindResponse(body: string): Recording[] {
  // formato: items[N].FilePath=... items[N].StartTime=...
  const map = new Map<string, Record<string, string>>();
  for (const line of body.split(/\r?\n/)) {
    const m = /^items\[(\d+)\]\.(\w+)=(.*)$/.exec(line);
    if (!m) continue;
    const [, idx, key, val] = m;
    const rec = map.get(idx) ?? {};
    rec[key] = val;
    map.set(idx, rec);
  }
  const out: Recording[] = [];
  for (const rec of map.values()) {
    if (!rec.FilePath) continue;
    out.push({
      file_path: rec.FilePath,
      channel: Number(rec.Channel ?? 0),
      start_time: rec.StartTime ?? "",
      end_time: rec.EndTime ?? "",
      length_bytes: rec.Length ? Number(rec.Length) : undefined,
      type: rec.Type,
    });
  }
  return out;
}

async function listRecordings(
  nvr: NvrCreds,
  channel: number,
  streamType: "main" | "sub",
  start: string,
  end: string,
): Promise<Recording[]> {
  const base = `http://${nvr.host}:${nvr.http_port ?? 80}`;
  const user = nvr.username;
  const pass = nvr.password;
  // 1) factory.create
  const createRes = await cgiFetch(base, `/cgi-bin/mediaFileFind.cgi?action=factory.create`, user, pass);
  if (!createRes.ok) throw new Error(`factory.create HTTP ${createRes.status}`);
  const createBody = await createRes.text();
  const objectId = createBody.split("=").pop()?.trim();
  if (!objectId) throw new Error("mediaFileFind: objeto não retornado");
  try {
    // 2) findFile
    const params = new URLSearchParams({
      action: "findFile",
      object: objectId,
      "condition.Channel": String(channel),
      "condition.StartTime": fmtDahuaDate(start),
      "condition.EndTime": fmtDahuaDate(end),
      "condition.Dirs[0]": streamType === "sub" ? "/mnt/sd" : "/mnt/dvr",
      "condition.VideoStream": streamType === "sub" ? "Extra1" : "Main",
    });
    const findRes = await cgiFetch(base, `/cgi-bin/mediaFileFind.cgi?${params}`, user, pass);
    if (!findRes.ok) throw new Error(`findFile HTTP ${findRes.status}`);
    // 3) findNextFile (loop até esgotar)
    const all: Recording[] = [];
    for (let i = 0; i < 20; i++) {
      const next = await cgiFetch(
        base,
        `/cgi-bin/mediaFileFind.cgi?action=findNextFile&object=${objectId}&count=100`,
        user,
        pass,
      );
      if (!next.ok) break;
      const body = await next.text();
      const found = parseFindResponse(body);
      if (found.length === 0) break;
      all.push(...found);
      if (found.length < 100) break;
    }
    return all;
  } finally {
    await cgiFetch(base, `/cgi-bin/mediaFileFind.cgi?action=close&object=${objectId}`, user, pass)
      .then((r) => r.body?.cancel())
      .catch(() => {});
  }
}

// -------- Download com retry + progresso -------------------------------
async function downloadStream(
  supabaseAdmin: ReturnType<typeof createClient>,
  downloadId: string,
  userId: string,
  nvr: NvrCreds,
  channel: number,
  streamType: "main" | "sub",
  startIso: string,
  endIso: string,
  remoteFilePath: string | null,
  maxAttempts: number,
): Promise<{ storage_path: string; bytes: number }> {
  const base = `http://${nvr.host}:${nvr.http_port ?? 80}`;
  const user = nvr.username;
  const pass = nvr.password;

  // Se não sabemos o arquivo remoto, usa loadfile por tempo:
  //   /cgi-bin/loadfile.cgi?action=startLoad&channel=N&startTime=...&endTime=...&subtype=0
  // Se sabemos, usa RPC loadfile por caminho.
  let urlPath: string;
  if (remoteFilePath) {
    urlPath = `/RPC_Loadfile/${encodeURIComponent(remoteFilePath)}`;
  } else {
    const params = new URLSearchParams({
      action: "startLoad",
      channel: String(channel),
      startTime: fmtDahuaDate(startIso),
      endTime: fmtDahuaDate(endIso),
      subtype: streamType === "sub" ? "1" : "0",
    });
    urlPath = `/cgi-bin/loadfile.cgi?${params}`;
  }

  const storagePath = `${userId}/${downloadId}.dav`;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await supabaseAdmin
      .from("nvr_recording_downloads")
      .update({
        status: "downloading",
        attempts: attempt,
        started_at: new Date().toISOString(),
        last_error: null,
        progress_percent: 0,
        bytes_downloaded: 0,
      })
      .eq("id", downloadId);

    try {
      const res = await cgiFetch(base, urlPath, user, pass);
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status} ao iniciar download`);
      }
      const totalHeader = res.headers.get("content-length");
      const total = totalHeader ? Number(totalHeader) : null;
      if (total) {
        await supabaseAdmin
          .from("nvr_recording_downloads")
          .update({ total_bytes: total })
          .eq("id", downloadId);
      }

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      let sinceProgress = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        received += value.length;
        if (received > MAX_BYTES) {
          await reader.cancel();
          throw new Error(`Arquivo excede limite de ${MAX_BYTES} bytes`);
        }
        chunks.push(value);
        sinceProgress += value.length;
        if (sinceProgress >= PROGRESS_EVERY) {
          sinceProgress = 0;
          const pct = total ? Math.min(99.99, (received / total) * 100) : 0;
          await supabaseAdmin
            .from("nvr_recording_downloads")
            .update({ bytes_downloaded: received, progress_percent: pct })
            .eq("id", downloadId);
        }
      }

      // Concatena e envia (edge functions são efêmeras — mantemos em memória, limitado a MAX_BYTES)
      const blob = new Blob(chunks, { type: "video/dahua" });
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, blob, {
          contentType: "video/dahua",
          upsert: true,
        });
      if (upErr) throw upErr;

      const sourceFormat = "dav";
      const proprietary = true; // .dav sempre exige conversão para MP4 padrão
      await supabaseAdmin
        .from("nvr_recording_downloads")
        .update({
          status: "completed",
          bytes_downloaded: received,
          total_bytes: total ?? received,
          progress_percent: 100,
          storage_path: storagePath,
          source_format: sourceFormat,
          conversion_status: proprietary ? "pending" : "skipped",
          completed_at: new Date().toISOString(),
        })
        .eq("id", downloadId);

      // Auto-dispara conversão para MP4 padrão (fire-and-forget).
      if (proprietary) {
        try {
          const convertUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/nvr-recording-convert`;
          // @ts-ignore EdgeRuntime provisto pelo runtime Supabase
          EdgeRuntime.waitUntil(
            fetch(convertUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "x-internal-user-id": userId,
              },
              body: JSON.stringify({ action: "convert", download_id: downloadId }),
            }).catch((e) => console.warn("[convert dispatch] falhou", e)),
          );
        } catch (e) {
          console.warn("[convert dispatch] erro", e);
        }
      }

      return { storage_path: storagePath, bytes: received };

    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      await supabaseAdmin
        .from("nvr_recording_downloads")
        .update({ last_error: `tentativa ${attempt}: ${msg}` })
        .eq("id", downloadId);
      // backoff exponencial 1s, 2s, 4s...
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      }
    }
  }

  await supabaseAdmin
    .from("nvr_recording_downloads")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", downloadId);
  throw lastErr ?? new Error("Falha desconhecida");
}

// -------- Handler ------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não suportado" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Não autenticado" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser();
  if (userErr || !user) return json({ error: "Sessão inválida" }, 401);

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let body: Req;
  try {
    body = (await req.json()) as Req;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  try {
    if (body.action === "list") {
      if (!body.nvr?.host || !body.nvr.username || !body.nvr.password) {
        return json({ error: "Credenciais do NVR ausentes" }, 400);
      }
      const items = await listRecordings(
        body.nvr,
        body.channel,
        body.stream_type ?? "main",
        body.start_time,
        body.end_time,
      );
      return json({ items });
    }

    if (body.action === "cancel") {
      const { error } = await supabaseAdmin
        .from("nvr_recording_downloads")
        .update({ status: "canceled", completed_at: new Date().toISOString() })
        .eq("id", body.download_id)
        .eq("user_id", user.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (body.action === "download") {
      if (!body.nvr?.host || !body.nvr.username || !body.nvr.password) {
        return json({ error: "Credenciais do NVR ausentes" }, 400);
      }

      let downloadId = body.download_id;
      let channel = body.channel ?? 0;
      let streamType: "main" | "sub" = body.stream_type ?? "main";
      let startIso = body.start_time ?? "";
      let endIso = body.end_time ?? "";
      let remoteFilePath = body.remote_file_path ?? null;
      const maxAttempts = Math.max(1, Math.min(10, body.max_attempts ?? DEFAULT_MAX_ATTEMPTS));

      if (downloadId) {
        const { data: row, error } = await supabaseAdmin
          .from("nvr_recording_downloads")
          .select("*")
          .eq("id", downloadId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (error || !row) return json({ error: "Download não encontrado" }, 404);
        channel = row.channel;
        streamType = row.stream_type;
        startIso = row.start_time;
        endIso = row.end_time;
        remoteFilePath = row.remote_file_path;
      } else {
        if (!body.nvr_id || !body.start_time || !body.end_time || body.channel === undefined) {
          return json({ error: "Campos obrigatórios ausentes" }, 400);
        }
        const { data: created, error } = await supabaseAdmin
          .from("nvr_recording_downloads")
          .insert({
            user_id: user.id,
            nvr_id: body.nvr_id,
            channel,
            stream_type: streamType,
            start_time: startIso,
            end_time: endIso,
            remote_file_path: remoteFilePath,
            max_attempts: maxAttempts,
            status: "pending",
          })
          .select("id")
          .single();
        if (error || !created) return json({ error: error?.message ?? "Falha ao criar" }, 400);
        downloadId = created.id;
      }

      // Executa em background — a UI acompanha via realtime/polling na tabela.
      const task = downloadStream(
        supabaseAdmin,
        downloadId!,
        user.id,
        body.nvr,
        channel,
        streamType,
        startIso,
        endIso,
        remoteFilePath,
        maxAttempts,
      ).catch((err) => {
        console.error("nvr-recording-download background error", err);
      });
      // @ts-ignore Deno global
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(task);
      }

      return json({ download_id: downloadId, status: "downloading" }, 202);
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (err) {
    console.error("nvr-recording-download error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
});

// Suprime uso não-referenciado do fallback digest (mantém no bundle)
void randomHex;
