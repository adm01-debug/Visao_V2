#!/usr/bin/env node
/**
 * Gera SDK TypeScript a partir de public/openapi.yaml.
 * Saída: src/sdk/visao-api.d.ts (tipos) + src/sdk/visao-api-client.ts (cliente).
 * Uso: `node scripts/generate-api-sdk.mjs`
 * Requer: `bun add -D openapi-typescript` (ou executar via npx).
 */
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INPUT = resolve(ROOT, 'public/openapi.yaml');
const OUT_DIR = resolve(ROOT, 'src/sdk');
const OUT_TYPES = resolve(OUT_DIR, 'visao-api.d.ts');
const OUT_CLIENT = resolve(OUT_DIR, 'visao-api-client.ts');

if (!existsSync(INPUT)) {
  console.error(`❌ ${INPUT} não encontrado`);
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

console.log('→ Gerando tipos via openapi-typescript…');
try {
  execSync(`npx --yes openapi-typescript@7 ${INPUT} -o ${OUT_TYPES}`, { stdio: 'inherit' });
} catch {
  console.error('⚠ openapi-typescript falhou. Instale: bun add -D openapi-typescript@7');
  process.exit(1);
}

const clientSource = `/**
 * VISÃO API v1 — cliente TypeScript autogerado.
 * Regerar: \`node scripts/generate-api-sdk.mjs\`
 */
import type { paths } from "./visao-api";

const DEFAULT_BASE = "https://fsisdfdwlbfeadwfqpir.supabase.co/functions/v1/public-api";

export interface VisaoClientOptions {
  baseUrl?: string;
  token: string;
  fetchFn?: typeof fetch;
}

type MethodOf<P extends keyof paths> = keyof paths[P] & string;

export class VisaoClient {
  private baseUrl: string;
  private token: string;
  private fetchFn: typeof fetch;
  constructor(opts: VisaoClientOptions) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\\/$/, "");
    this.token = opts.token;
    this.fetchFn = opts.fetchFn ?? fetch;
  }
  private async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(this.baseUrl + path);
    if (query) for (const [k, v] of Object.entries(query)) if (v != null) url.searchParams.set(k, String(v));
    const res = await this.fetchFn(url.toString(), {
      method,
      headers: {
        "Authorization": \`Bearer \${this.token}\`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(\`VISÃO API \${res.status}: \${await res.text()}\`);
    return res.json() as Promise<T>;
  }
  // High-level helpers
  health() { return this.request<{ status: string; version: string }>("GET", "/v1/health"); }
  status() { return this.request<{ status: string; cameras_visible: number }>("GET", "/v1/status"); }
  listCameras(q: { page?: number; limit?: number; filter?: string; order?: string } = {}) {
    return this.request("GET", "/v1/cameras", undefined, q);
  }
  getCamera(id: string) { return this.request("GET", \`/v1/cameras/\${id}\`); }
  armCamera(id: string, reason?: string) { return this.request("POST", \`/v1/cameras/\${id}/arm\`, { reason }); }
  disarmCamera(id: string, reason: string) { return this.request("POST", \`/v1/cameras/\${id}/disarm\`, { reason }); }
  acknowledgeAlert(id: string) { return this.request("POST", \`/v1/alerts/\${id}/acknowledge\`); }
  panic(input: { camera_id?: string; description?: string } = {}) { return this.request("POST", "/v1/panic", input); }
  clipUrl(id: string, ttl = 3600) { return this.request("GET", \`/v1/clips/\${id}/url\`, undefined, { ttl }); }
  listEvents(q: { from?: string; to?: string; filter?: string; page?: number; limit?: number } = {}) {
    return this.request("GET", "/v1/events", undefined, q);
  }
  eventsSummary(q: { from?: string; to?: string; filter?: string } = {}) {
    return this.request("GET", "/v1/events/summary", undefined, q);
  }
}

export type { paths } from "./visao-api";
export type Paths<P extends keyof paths, M extends MethodOf<P>> = paths[P][M];
`;

writeFileSync(OUT_CLIENT, clientSource);
console.log(`✅ SDK gerado:\n   ${OUT_TYPES}\n   ${OUT_CLIENT}`);
