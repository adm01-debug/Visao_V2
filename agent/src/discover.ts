// discover.ts — Descoberta ONVIF via WS-Discovery multicast + probe SOAP.
import { Discovery, Cam } from "onvif";
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

export async function discoverOnce(opts: {
  username?: string;
  password?: string;
  probeTimeoutMs?: number;
  discoveryTimeoutMs?: number;
}): Promise<DiscoveredDevice[]> {
  const probeTimeout = opts.probeTimeoutMs ?? 5000;
  const discoveryTimeout = opts.discoveryTimeoutMs ?? 5000;
  const creds = opts.username && opts.password ? { username: opts.username, password: opts.password } : null;

  const hits: DiscoveryHit[] = await new Promise((resolve) => {
    const found: DiscoveryHit[] = [];
    Discovery.on("device", (cam: DiscoveryHit) => found.push(cam));
    Discovery.probe({ timeout: discoveryTimeout }, () => {
      Discovery.removeAllListeners("device");
      resolve(found);
    });
  });

  log.info({ count: hits.length }, "ws_discovery_done");
  const devices = await Promise.all(hits.map((h) => probeCamera(h, creds, probeTimeout)));
  return devices.filter((d): d is DiscoveredDevice => d !== null);
}
