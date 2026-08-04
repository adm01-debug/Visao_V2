// relay.ts — Worker de relé HTTP do Agente Local.
// Long-poll no backend por tarefas pendentes, executa fetch contra a LAN e devolve o resultado.
// Payloads binários são carregados em base64.
import { request } from 'undici';
import pino from 'pino';

const log = pino({ name: 'visao-agent:relay' });

interface RelayTask {
  id: string;
  kind: 'http_request';
  request: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body_b64?: string | null;
    timeout_ms?: number;
    allow_hosts?: string[]; // se presente, restringe destinos
  };
}

interface RelayResponse {
  status: number;
  headers: Record<string, string>;
  body_b64: string;
  duration_ms: number;
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return Buffer.from(bin, 'binary').toString('base64');
}

function fromB64(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}

// Bloqueia destinos perigosos (metadata cloud, loopback público inesperado, etc).
// LAN privada É permitida — é o ponto do relé.
function isTargetAllowed(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === '169.254.169.254') return false; // metadata IMDS
  if (host === 'metadata.google.internal') return false;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return true;
}

export class RelayWorker {
  private stopping = false;
  constructor(
    private baseUrl: string,
    private token: string,
    private maxTasks = 4
  ) {}

  stop() {
    this.stopping = true;
  }

  async start() {
    log.info({ maxTasks: this.maxTasks }, 'relay_worker_started');
    while (!this.stopping) {
      try {
        const tasks = await this.poll();
        if (tasks.length === 0) continue;
        await Promise.all(tasks.map((t) => this.execute(t)));
      } catch (err) {
        log.error({ err: (err as Error).message }, 'relay_loop_error');
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  private async poll(): Promise<RelayTask[]> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/functions/v1/agent-ingest/relay-poll`;
    const res = await request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-agent-token': this.token },
      body: JSON.stringify({ max: this.maxTasks }),
      headersTimeout: 20_000,
      bodyTimeout: 25_000,
    });
    const text = await res.body.text();
    if (res.statusCode !== 200) {
      log.warn({ status: res.statusCode, body: text.slice(0, 200) }, 'poll_bad_status');
      await new Promise((r) => setTimeout(r, 3000));
      return [];
    }
    const parsed = JSON.parse(text);
    return Array.isArray(parsed?.tasks) ? parsed.tasks : [];
  }

  private async execute(task: RelayTask): Promise<void> {
    const started = Date.now();
    try {
      if (task.kind !== 'http_request') {
        return this.complete(task.id, null, `unsupported_kind:${task.kind}`);
      }
      const target = new URL(task.request.url);
      if (!isTargetAllowed(target)) {
        return this.complete(task.id, null, 'target_blocked');
      }
      const timeout = Math.min(Math.max(task.request.timeout_ms ?? 8000, 500), 30_000);

      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeout);
      let response: RelayResponse;
      try {
        const res = await fetch(task.request.url, {
          method: task.request.method ?? 'GET',
          headers: task.request.headers ?? {},
          body: task.request.body_b64 ? fromB64(task.request.body_b64) : undefined,
          signal: ac.signal,
        });
        const buf = new Uint8Array(await res.arrayBuffer());
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => {
          headers[k] = v;
        });
        response = {
          status: res.status,
          headers,
          body_b64: toB64(buf),
          duration_ms: Date.now() - started,
        };
      } finally {
        clearTimeout(t);
      }
      log.debug(
        { id: task.id, status: response.status, ms: response.duration_ms },
        'relay_task_done'
      );
      await this.complete(task.id, response, null);
    } catch (err) {
      const msg = (err as Error).name === 'AbortError' ? 'local_timeout' : (err as Error).message;
      log.warn({ id: task.id, err: msg }, 'relay_task_failed');
      await this.complete(task.id, null, msg);
    }
  }

  private async complete(taskId: string, response: RelayResponse | null, error: string | null) {
    const url = `${this.baseUrl.replace(/\/$/, '')}/functions/v1/agent-ingest/relay-complete`;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await request(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-agent-token': this.token },
          body: JSON.stringify({ task_id: taskId, response, error }),
          headersTimeout: 10_000,
          bodyTimeout: 15_000,
        });
        await res.body.dump();
        if (res.statusCode >= 200 && res.statusCode < 300) return;
      } catch (err) {
        log.warn({ attempt, err: (err as Error).message }, 'complete_error');
      }
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
}
