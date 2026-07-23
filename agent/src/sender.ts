// sender.ts — Envia heartbeat e batches de descobertas ao backend VISÃO.
import { request } from "undici";
import pino from "pino";
import type { DiscoveredDevice } from "./discover.js";

const log = pino({ name: "visao-agent:sender" });

export class Sender {
  constructor(
    private baseUrl: string,
    private token: string,
    private version: string,
  ) {}

  private async post(path: string, body: unknown, attempt = 1): Promise<void> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/functions/v1/agent-ingest/${path}`;
    try {
      const res = await request(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-agent-token": this.token,
        },
        body: JSON.stringify(body),
        headersTimeout: 10_000,
        bodyTimeout: 15_000,
      });
      const text = await res.body.text();
      if (res.statusCode >= 200 && res.statusCode < 300) {
        log.debug({ path, status: res.statusCode }, "post_ok");
        return;
      }
      log.warn({ path, status: res.statusCode, body: text.slice(0, 200) }, "post_bad_status");
      if (res.statusCode >= 500 && attempt < 4) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        return this.post(path, body, attempt + 1);
      }
    } catch (err) {
      log.error({ err: (err as Error).message, attempt }, "post_error");
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        return this.post(path, body, attempt + 1);
      }
    }
  }

  heartbeat(cidr?: string): Promise<void> {
    return this.post("heartbeat", { agent_version: this.version, network_cidr: cidr });
  }

  discoveries(list: DiscoveredDevice[]): Promise<void> {
    if (list.length === 0) return Promise.resolve();
    return this.post("discoveries", { agent_version: this.version, discoveries: list });
  }
}
