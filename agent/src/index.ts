// index.ts — Loop principal do Agente Local VISÃO.
import "dotenv/config";
import pino from "pino";
import { discoverOnce } from "./discover.js";
import { Sender } from "./sender.js";

const AGENT_VERSION = "1.0.0";
const log = pino({
  name: "visao-agent",
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.stdout.isTTY ? { target: "pino-pretty" } : undefined,
});

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    log.fatal({ name }, "missing_env");
    process.exit(1);
  }
  return v;
}

async function main() {
  const backend = required("BACKEND_URL");
  const token = required("AGENT_TOKEN");
  const heartbeatSec = parseInt(process.env.HEARTBEAT_INTERVAL ?? "30", 10);
  const discoverySec = parseInt(process.env.DISCOVERY_INTERVAL ?? "300", 10);
  const onvifUser = process.env.ONVIF_USERNAME;
  const onvifPass = process.env.ONVIF_PASSWORD;
  const cidr = process.env.NETWORK_CIDR;

  const sender = new Sender(backend, token, AGENT_VERSION);

  log.info({ backend, heartbeatSec, discoverySec }, "agent_started");

  const runDiscovery = async () => {
    try {
      const devices = await discoverOnce({
        username: onvifUser,
        password: onvifPass,
        probeTimeoutMs: 6_000,
        discoveryTimeoutMs: 5_000,
      });
      log.info({ count: devices.length }, "discovery_batch");
      if (devices.length > 0) await sender.discoveries(devices);
    } catch (err) {
      log.error({ err: (err as Error).message }, "discovery_failed");
    }
  };

  const runHeartbeat = async () => {
    try { await sender.heartbeat(cidr); }
    catch (err) { log.error({ err: (err as Error).message }, "heartbeat_failed"); }
  };

  await runHeartbeat();
  await runDiscovery();
  setInterval(runHeartbeat, heartbeatSec * 1000);
  setInterval(runDiscovery, discoverySec * 1000);

  const shutdown = (signal: string) => {
    log.info({ signal }, "shutting_down");
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  log.fatal({ err: err.message }, "fatal");
  process.exit(1);
});
