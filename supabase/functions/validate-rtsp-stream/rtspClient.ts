// Cliente RTSP mínimo sobre TCP puro (Deno.connect).
// Faz OPTIONS + DESCRIBE, suporta Basic e Digest auth, parseia SDP.

import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

export interface ParsedRtsp {
  hostname: string;
  port: number;
  path: string;
  username?: string;
  password?: string;
  scheme: "rtsp" | "rtsps";
}

export function parseRtspUrl(raw: string): ParsedRtsp {
  const u = new URL(raw);
  if (u.protocol !== "rtsp:" && u.protocol !== "rtsps:") {
    throw new Error("URL deve começar com rtsp:// ou rtsps://");
  }
  const scheme = u.protocol === "rtsps:" ? "rtsps" : "rtsp";
  return {
    hostname: u.hostname,
    port: u.port ? Number(u.port) : scheme === "rtsps" ? 322 : 554,
    path: u.pathname + (u.search || "") || "/",
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    scheme,
  };
}

// SSRF guard — bloqueia loopback e link-local.
export function assertSafeHostname(host: string): void {
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower === "ip6-localhost") {
    throw new Error("Hostname bloqueado (loopback)");
  }
  if (/^127\./.test(lower)) throw new Error("Hostname bloqueado (loopback)");
  if (/^169\.254\./.test(lower)) throw new Error("Hostname bloqueado (link-local/metadata)");
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") {
    throw new Error("Hostname bloqueado (loopback v6)");
  }
  if (lower.startsWith("fe80:")) throw new Error("Hostname bloqueado (link-local v6)");
}

export function isPrivateIp(host: string): boolean {
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const m = host.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}

interface RtspResponse {
  status: number;
  reason: string;
  headers: Record<string, string>;
  body: string;
}

function parseResponse(text: string): RtspResponse {
  const [head, ...bodyParts] = text.split("\r\n\r\n");
  const lines = head.split("\r\n");
  const first = lines.shift() ?? "";
  const m = first.match(/^RTSP\/\d\.\d\s+(\d+)\s+(.*)$/);
  const status = m ? Number(m[1]) : 0;
  const reason = m ? m[2] : first;
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx > 0) headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }
  return { status, reason, headers, body: bodyParts.join("\r\n\r\n") };
}

async function md5Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await stdCrypto.subtle.digest("MD5", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface DigestChallenge {
  realm: string;
  nonce: string;
  qop?: string;
  algorithm?: string;
  opaque?: string;
}

function parseDigest(header: string): DigestChallenge | null {
  const trimmed = header.replace(/^Digest\s+/i, "");
  const out: Record<string, string> = {};
  const re = /(\w+)=(?:"([^"]*)"|([^,]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(trimmed)) !== null) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? "";
  if (!out.realm || !out.nonce) return null;
  return {
    realm: out.realm,
    nonce: out.nonce,
    qop: out.qop,
    algorithm: out.algorithm,
    opaque: out.opaque,
  };
}

async function digestAuthHeader(
  d: DigestChallenge,
  user: string,
  pass: string,
  method: string,
  uri: string,
): Promise<string> {
  const ha1 = await md5Hex(`${user}:${d.realm}:${pass}`);
  const ha2 = await md5Hex(`${method}:${uri}`);
  const nc = "00000001";
  const cnonce = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  let response: string;
  const parts = [
    `username="${user}"`,
    `realm="${d.realm}"`,
    `nonce="${d.nonce}"`,
    `uri="${uri}"`,
  ];
  if (d.qop) {
    response = await md5Hex(`${ha1}:${d.nonce}:${nc}:${cnonce}:${d.qop}:${ha2}`);
    parts.push(`qop=${d.qop}`, `nc=${nc}`, `cnonce="${cnonce}"`, `response="${response}"`);
  } else {
    response = await md5Hex(`${ha1}:${d.nonce}:${ha2}`);
    parts.push(`response="${response}"`);
  }
  if (d.opaque) parts.push(`opaque="${d.opaque}"`);
  if (d.algorithm) parts.push(`algorithm=${d.algorithm}`);
  return `Digest ${parts.join(", ")}`;
}

const CONNECT_TIMEOUT_MS = 5000;
const READ_TIMEOUT_MS = 5000;

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout:${label}`)), ms)),
  ]);
}

async function readAll(conn: Deno.Conn): Promise<string> {
  const chunks: Uint8Array[] = [];
  const buf = new Uint8Array(4096);
  const deadline = Date.now() + READ_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const n = await withTimeout(conn.read(buf), READ_TIMEOUT_MS, "read");
    if (n === null) break;
    chunks.push(buf.slice(0, n));
    const combined = new TextDecoder().decode(concat(chunks));
    // Fim quando temos cabeçalhos + corpo completo (Content-Length) ou timeout curto.
    const headerEnd = combined.indexOf("\r\n\r\n");
    if (headerEnd >= 0) {
      const headers = combined.slice(0, headerEnd);
      const clMatch = headers.match(/Content-Length:\s*(\d+)/i);
      const bodyLen = clMatch ? Number(clMatch[1]) : 0;
      const body = combined.slice(headerEnd + 4);
      if (new TextEncoder().encode(body).length >= bodyLen) return combined;
    }
  }
  return new TextDecoder().decode(concat(chunks));
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

async function sendRequest(
  hostname: string,
  port: number,
  request: string,
): Promise<{ elapsedMs: number; response: RtspResponse }> {
  const started = performance.now();
  const conn = await withTimeout(Deno.connect({ hostname, port }), CONNECT_TIMEOUT_MS, "connect");
  try {
    await conn.write(new TextEncoder().encode(request));
    const raw = await readAll(conn);
    const elapsedMs = performance.now() - started;
    return { elapsedMs, response: parseResponse(raw) };
  } finally {
    try {
      conn.close();
    } catch { /* ignore */ }
  }
}

export interface SampleResult {
  ok: boolean;
  status: number;
  elapsedMs: number;
  timeout: boolean;
  error?: string;
}

export interface DescribeResult {
  ok: boolean;
  status: number;
  authMethod: "none" | "basic" | "digest";
  codec: string | null;
  resolution: string | null;
  fps: number | null;
  error?: string;
}

async function optionsOnce(p: ParsedRtsp, cseq: number, auth?: string): Promise<{ elapsedMs: number; res: RtspResponse }> {
  const url = `${p.scheme}://${p.hostname}:${p.port}${p.path}`;
  const lines = [
    `OPTIONS ${url} RTSP/1.0`,
    `CSeq: ${cseq}`,
    `User-Agent: VISAO-Probe/1.0`,
  ];
  if (auth) lines.push(`Authorization: ${auth}`);
  lines.push("", "");
  const { elapsedMs, response } = await sendRequest(p.hostname, p.port, lines.join("\r\n"));
  return { elapsedMs, res: response };
}

export async function optionsSample(p: ParsedRtsp, cseq: number): Promise<SampleResult> {
  try {
    // Primeira tentativa sem auth
    let { elapsedMs, res } = await optionsOnce(p, cseq);
    if (res.status === 401 && p.username && p.password) {
      const www = res.headers["www-authenticate"] ?? "";
      if (/^Digest/i.test(www)) {
        const d = parseDigest(www);
        if (d) {
          const uri = `${p.scheme}://${p.hostname}:${p.port}${p.path}`;
          const authH = await digestAuthHeader(d, p.username, p.password, "OPTIONS", uri);
          const retry = await optionsOnce(p, cseq + 1, authH);
          elapsedMs = retry.elapsedMs;
          res = retry.res;
        }
      } else if (/^Basic/i.test(www)) {
        const b = "Basic " + encodeBase64(`${p.username}:${p.password}`);
        const retry = await optionsOnce(p, cseq + 1, b);
        elapsedMs = retry.elapsedMs;
        res = retry.res;
      }
    }
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      elapsedMs: Math.round(elapsedMs),
      timeout: false,
    };
  } catch (e) {
    const msg = (e as Error).message;
    return {
      ok: false,
      status: 0,
      elapsedMs: 0,
      timeout: msg.startsWith("timeout:"),
      error: msg,
    };
  }
}

function parseSdp(body: string): { codec: string | null; resolution: string | null; fps: number | null } {
  let codec: string | null = null;
  let resolution: string | null = null;
  let fps: number | null = null;
  for (const line of body.split(/\r?\n/)) {
    const rt = line.match(/^a=rtpmap:\d+\s+([A-Za-z0-9\-]+)\//);
    if (rt && !codec) {
      const c = rt[1].toUpperCase();
      if (c === "H264") codec = "H.264";
      else if (c === "H265" || c === "HEVC") codec = "H.265";
      else codec = c;
    }
    const dim = line.match(/a=cliprect:\d+,\d+,(\d+),(\d+)/i)
      || line.match(/a=x-dimensions[:=]\s*(\d+)[,x](\d+)/i);
    if (dim && !resolution) resolution = `${dim[1]}x${dim[2]}`;
    const fr = line.match(/a=framerate:\s*(\d+(?:\.\d+)?)/i);
    if (fr && !fps) fps = Math.round(Number(fr[1]));
  }
  return { codec, resolution, fps };
}

export async function describeOnce(p: ParsedRtsp, cseq: number): Promise<DescribeResult> {
  try {
    const url = `${p.scheme}://${p.hostname}:${p.port}${p.path}`;
    const build = (auth?: string) => {
      const lines = [
        `DESCRIBE ${url} RTSP/1.0`,
        `CSeq: ${cseq}`,
        `Accept: application/sdp`,
        `User-Agent: VISAO-Probe/1.0`,
      ];
      if (auth) lines.push(`Authorization: ${auth}`);
      lines.push("", "");
      return lines.join("\r\n");
    };

    let { response: res } = await sendRequest(p.hostname, p.port, build());
    let authMethod: "none" | "basic" | "digest" = "none";

    if (res.status === 401 && p.username && p.password) {
      const www = res.headers["www-authenticate"] ?? "";
      if (/^Digest/i.test(www)) {
        const d = parseDigest(www);
        if (d) {
          authMethod = "digest";
          const authH = await digestAuthHeader(d, p.username, p.password, "DESCRIBE", url);
          const r2 = await sendRequest(p.hostname, p.port, build(authH));
          res = r2.response;
        }
      } else if (/^Basic/i.test(www)) {
        authMethod = "basic";
        const b = "Basic " + encodeBase64(`${p.username}:${p.password}`);
        const r2 = await sendRequest(p.hostname, p.port, build(b));
        res = r2.response;
      }
    }

    const ok = res.status >= 200 && res.status < 300;
    if (!ok) return { ok, status: res.status, authMethod, codec: null, resolution: null, fps: null };
    const sdp = parseSdp(res.body);
    return { ok, status: res.status, authMethod, ...sdp };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      authMethod: "none",
      codec: null,
      resolution: null,
      fps: null,
      error: (e as Error).message,
    };
  }
}

export function stats(samples: SampleResult[]): {
  min: number; avg: number; max: number; p95: number; jitter: number; lossPct: number;
} {
  const oks = samples.filter((s) => s.ok);
  const lossPct = samples.length ? ((samples.length - oks.length) / samples.length) * 100 : 100;
  if (oks.length === 0) return { min: 0, avg: 0, max: 0, p95: 0, jitter: 0, lossPct };
  const ls = oks.map((s) => s.elapsedMs).sort((a, b) => a - b);
  const min = ls[0];
  const max = ls[ls.length - 1];
  const avg = ls.reduce((a, b) => a + b, 0) / ls.length;
  const p95 = ls[Math.min(ls.length - 1, Math.floor(ls.length * 0.95))];
  const mean = avg;
  const variance = ls.reduce((a, b) => a + (b - mean) ** 2, 0) / ls.length;
  const jitter = Math.sqrt(variance);
  return {
    min: Math.round(min),
    avg: Math.round(avg),
    max: Math.round(max),
    p95: Math.round(p95),
    jitter: Math.round(jitter),
    lossPct: Math.round(lossPct),
  };
}
