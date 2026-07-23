// discover.ts — Descoberta ONVIF via WS-Discovery multicast + probe SOAP.
// Dual-probe: envia DUAS mensagens Probe em paralelo com Types distintos
// (`dn:NetworkVideoTransmitter` e `tds:Device`) porque câmeras XiongMai/HZXM
// (NBD80X*, Usecam OEM) frequentemente ignoram o Types padrão do lib `onvif`
// e só respondem a um ou outro filtro. Faz merge dedup por EndpointReference.
import { Discovery, Cam } from "onvif";
import dgram from "node:dgram";
import { randomUUID } from "node:crypto";
import pino from "pino";


const log = pino({ name: "visao-agent:discover" });

export interface DiscoveredDevice {
  host: string;
  port: number;
  manufacturer: string | null;
  model: string | null;
  firmware: string | null;
  onvif_endpoint: string | null;
  rtsp_primary: string | null;
  rtsp_substream: string | null;
  ptz_capable: boolean;
  discovered_at: string;
  raw?: Record<string, unknown>;
}

interface DiscoveryHit {
  xaddrs: string[];
  types?: string;
  urn?: string;
}

function parseXAddr(xaddr: string): { host: string; port: number } | null {
  try {
    const u = new URL(xaddr);
    return {
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : u.protocol === "https:" ? 443 : 80,
    };
  } catch { return null; }
}

async function probeCamera(
  hit: DiscoveryHit,
  credentials: { username: string; password: string } | null,
  timeoutMs: number,
): Promise<DiscoveredDevice | null> {
  const xaddr = hit.xaddrs[0];
  if (!xaddr) return null;
  const parsed = parseXAddr(xaddr);
  if (!parsed) return null;

  return await new Promise<DiscoveredDevice | null>((resolve) => {
    const timer = setTimeout(() => resolve({
      host: parsed.host,
      port: parsed.port,
      manufacturer: null, model: null, firmware: null,
      onvif_endpoint: xaddr,
      rtsp_primary: null, rtsp_substream: null,
      ptz_capable: false,
      discovered_at: new Date().toISOString(),
      raw: { discovery_only: true, timeout: true },
    }), timeoutMs);

    const cam = new Cam({
      hostname: parsed.host,
      port: parsed.port,
      username: credentials?.username ?? "",
      password: credentials?.password ?? "",
      timeout: timeoutMs,
    }, (err: Error | null) => {
      if (err) {
        clearTimeout(timer);
        // Sem credenciais, ainda registramos o dispositivo cru.
        resolve({
          host: parsed.host,
          port: parsed.port,
          manufacturer: null, model: null, firmware: null,
          onvif_endpoint: xaddr,
          rtsp_primary: null, rtsp_substream: null,
          ptz_capable: false,
          discovered_at: new Date().toISOString(),
          raw: { discovery_only: true, error: err.message },
        });
        return;
      }

      cam.getDeviceInformation((_err: Error | null, info: {
        manufacturer?: string; model?: string; firmwareVersion?: string;
      } | null) => {
        const streams: string[] = [];
        const profiles = cam.profiles ?? [];
        let pending = profiles.length;
        let ptz = false;
        for (const p of profiles) {
          if (p?.PTZConfiguration || p?.ptzConfiguration) ptz = true;
        }
        const finish = () => {
          clearTimeout(timer);
          resolve({
            host: parsed.host,
            port: parsed.port,
            manufacturer: info?.manufacturer ?? null,
            model: info?.model ?? null,
            firmware: info?.firmwareVersion ?? null,
            onvif_endpoint: xaddr,
            rtsp_primary: streams[0] ?? null,
            rtsp_substream: streams[1] ?? null,
            ptz_capable: ptz,
            discovered_at: new Date().toISOString(),
            raw: { profiles_count: profiles.length },
          });
        };
        if (pending === 0) return finish();
        for (const profile of profiles) {
          cam.getStreamUri({ protocol: "RTSP", profileToken: profile.$?.token ?? profile.token }, (_e: Error | null, uri: { uri?: string } | null) => {
            if (uri?.uri) streams.push(uri.uri);
            pending -= 1;
            if (pending === 0) finish();
          });
        }
      });
    });
  });
}

const WS_DISCOVERY_ADDR = "239.255.255.250";
const WS_DISCOVERY_PORT = 3702;

// Filtros Types testados em paralelo. Ordem importa apenas para logs.
const PROBE_TYPES: Array<{ label: string; types: string; namespaces: string }> = [
  {
    label: "NetworkVideoTransmitter",
    types: "dn:NetworkVideoTransmitter",
    namespaces: 'xmlns:dn="http://www.onvif.org/ver10/network/wsdl"',
  },
  {
    label: "tds:Device",
    types: "tds:Device",
    namespaces: 'xmlns:tds="http://www.onvif.org/ver10/device/wsdl"',
  },
];

function buildProbeEnvelope(messageId: string, types: string, namespaces: string): Buffer {
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"` +
    ` xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"` +
    ` xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"` +
    ` ${namespaces}>` +
    `<e:Header>` +
    `<w:MessageID>urn:uuid:${messageId}</w:MessageID>` +
    `<w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>` +
    `<w:Action e:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>` +
    `</e:Header>` +
    `<e:Body><d:Probe><d:Types>${types}</d:Types></d:Probe></e:Body>` +
    `</e:Envelope>`;
  return Buffer.from(xml, "utf8");
}

function extractXAddrs(xml: string): string[] {
  const m = xml.match(/<[^>]*XAddrs[^>]*>([^<]+)</i);
  if (!m) return [];
  return m[1].trim().split(/\s+/).filter(Boolean);
}

function extractEndpointRef(xml: string): string | null {
  const m = xml.match(/<[^>]*Address[^>]*>([^<]+)</i);
  return m?.[1]?.trim() ?? null;
}

function extractTypes(xml: string): string | undefined {
  return xml.match(/<[^>]*Types[^>]*>([^<]+)</i)?.[1]?.trim();
}

// Executa uma sondagem WS-Discovery em socket dedicado, com Types específico.
// Cada probe usa seu próprio socket UDP para não perder mensagens entre filtros.
function probeOnce(
  types: string,
  namespaces: string,
  label: string,
  timeoutMs: number,
): Promise<DiscoveryHit[]> {
  return new Promise((resolve) => {
    const hits: DiscoveryHit[] = [];
    const seenLocal = new Set<string>();
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

    const done = () => {
      try { socket.close(); } catch { /* noop */ }
      log.debug({ types: label, count: hits.length }, "ws_probe_result");
      resolve(hits);
    };

    socket.on("error", (err) => {
      log.warn({ types: label, err: err.message }, "ws_probe_socket_error");
      done();
    });

    socket.on("message", (msg) => {
      const xml = msg.toString("utf8");
      if (!xml.includes("ProbeMatch")) return;
      const xaddrs = extractXAddrs(xml);
      if (xaddrs.length === 0) return;
      const key = extractEndpointRef(xml) ?? xaddrs[0];
      if (seenLocal.has(key)) return;
      seenLocal.add(key);
      hits.push({ xaddrs, types: extractTypes(xml), urn: key });
    });

    socket.bind(0, () => {
      try {
        socket.setBroadcast(true);
        socket.setMulticastTTL(1);
      } catch { /* algumas plataformas restringem */ }
      const envelope = buildProbeEnvelope(randomUUID(), types, namespaces);
      socket.send(envelope, 0, envelope.length, WS_DISCOVERY_PORT, WS_DISCOVERY_ADDR, (err) => {
        if (err) {
          log.warn({ types: label, err: err.message }, "ws_probe_send_failed");
          done();
        }
      });
      setTimeout(done, timeoutMs);
    });
  });
}

// Dispara os dois Probes em paralelo e faz merge por EndpointReference / XAddr.
async function dualProbe(timeoutMs: number): Promise<DiscoveryHit[]> {
  const batches = await Promise.all(
    PROBE_TYPES.map((p) => probeOnce(p.types, p.namespaces, p.label, timeoutMs)),
  );
  const merged = new Map<string, DiscoveryHit>();
  batches.forEach((batch, idx) => {
    for (const hit of batch) {
      const key = hit.urn ?? hit.xaddrs[0];
      if (!key) continue;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, hit);
      } else {
        // Une XAddrs de ambos os probes (algumas câmeras retornam endpoints distintos).
        const xa = new Set([...existing.xaddrs, ...hit.xaddrs]);
        existing.xaddrs = [...xa];
        existing.types = [existing.types, hit.types].filter(Boolean).join(" ");
      }
    }
    log.info({ filter: PROBE_TYPES[idx].label, hits: batch.length }, "ws_probe_filter_done");
  });
  return [...merged.values()];
}

export async function discoverOnce(opts: {
  username?: string;
  password?: string;
  probeTimeoutMs?: number;
  discoveryTimeoutMs?: number;
}): Promise<DiscoveredDevice[]> {
  const probeTimeout = opts.probeTimeoutMs ?? 5000;
  const discoveryTimeout = opts.discoveryTimeoutMs ?? 5000;
  const creds = opts.username && opts.password ? { username: opts.username, password: opts.password } : null;

  // 1) Dual-probe raw UDP (cobre XiongMai/HZXM que ignoram Types default).
  let hits: DiscoveryHit[] = [];
  try {
    hits = await dualProbe(discoveryTimeout);
  } catch (err) {
    log.warn({ err: (err as Error).message }, "ws_dual_probe_failed");
  }

  // 2) Fallback: lib `onvif` (mantido para redundância se dgram falhar/for bloqueado).
  if (hits.length === 0) {
    const legacyHits: DiscoveryHit[] = await new Promise((resolve) => {
      const found: DiscoveryHit[] = [];
      Discovery.on("device", (cam: DiscoveryHit) => found.push(cam));
      Discovery.probe({ timeout: discoveryTimeout }, () => {
        Discovery.removeAllListeners("device");
        resolve(found);
      });
    });
    hits = legacyHits;
    log.info({ count: hits.length, source: "onvif_lib_fallback" }, "ws_discovery_done");
  } else {
    log.info({ count: hits.length, source: "dual_probe" }, "ws_discovery_done");
  }

  const devices = await Promise.all(hits.map((h) => probeCamera(h, creds, probeTimeout)));
  return devices.filter((d): d is DiscoveredDevice => d !== null);
}

