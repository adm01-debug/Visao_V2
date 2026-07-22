// Testes unitários para maybeAlertCriticalScore.
// Cobre: threshold de 2+ consecutivos, cooldown de 30 min, reset de streak
// quando score volta a "ok"/"warn", filtros de severidade e canais.

Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { maybeAlertCriticalScore, type CriticalAlertInput } from "./criticalAlert.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface HealthStateRow {
  consecutive_critical_scores: number | null;
  last_critical_alert_at: string | null;
}

interface NotifCfg {
  channels: string[];
  email_recipients?: string[];
  phone_recipients?: string[];
  webhook_urls?: string[];
  severity_filter?: string[] | null;
  enabled?: boolean;
}

interface MockOptions {
  healthState?: HealthStateRow | null;
  camera?: { id: string; name: string } | null;
  notifCfg?: NotifCfg | null;
}

interface MockRecord {
  upserts: unknown[];
  updates: unknown[];
  inserts: Array<{ table: string; row: unknown }>;
  currentState: HealthStateRow | null;
}

function buildMockClient(opts: MockOptions): { client: SupabaseClient; rec: MockRecord } {
  const rec: MockRecord = {
    upserts: [],
    updates: [],
    inserts: [],
    currentState: opts.healthState ?? null,
  };

  const client = {
    from(table: string) {
      return {
        select(_cols: string) {
          const chain = {
            eq(_k: string, _v: unknown) {
              return {
                maybeSingle: async () => {
                  if (table === "camera_health_state") {
                    return { data: rec.currentState, error: null };
                  }
                  if (table === "cameras") {
                    return { data: opts.camera ?? null, error: null };
                  }
                  return { data: null, error: null };
                },
                eq(_k2: string, _v2: unknown) {
                  return {
                    limit(_n: number) {
                      return {
                        maybeSingle: async () => {
                          if (table === "notification_configs") {
                            return { data: opts.notifCfg ?? null, error: null };
                          }
                          return { data: null, error: null };
                        },
                      };
                    },
                  };
                },
                limit(_n: number) {
                  return {
                    maybeSingle: async () => {
                      if (table === "notification_configs") {
                        return { data: opts.notifCfg ?? null, error: null };
                      }
                      return { data: null, error: null };
                    },
                  };
                },
              };
            },
          };
          return chain;
        },
        async upsert(row: unknown, _opts?: unknown) {
          rec.upserts.push({ table, row });
          const r = row as HealthStateRow & { camera_id?: string };
          rec.currentState = {
            consecutive_critical_scores: r.consecutive_critical_scores ?? 0,
            last_critical_alert_at: rec.currentState?.last_critical_alert_at ?? null,
          };
          return { data: null, error: null };
        },
        update(row: unknown) {
          rec.updates.push({ table, row });
          const r = row as Partial<HealthStateRow>;
          rec.currentState = {
            consecutive_critical_scores: r.consecutive_critical_scores ?? rec.currentState?.consecutive_critical_scores ?? 0,
            last_critical_alert_at: r.last_critical_alert_at ?? rec.currentState?.last_critical_alert_at ?? null,
          };
          return { eq: async (_k: string, _v: unknown) => ({ data: null, error: null }) };
        },
        insert(row: unknown) {
          const p = Promise.resolve({ data: null, error: null });
          rec.inserts.push({ table, row });
          return {
            then: p.then.bind(p),
            catch: p.catch.bind(p),
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, rec };
}

type FetchImpl = typeof fetch;
function stubFetch(response: { ok: boolean; status?: number }): { restore: () => void; calls: Request[] } {
  const original: FetchImpl = globalThis.fetch;
  const calls: Request[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(new Request(input as RequestInfo, init));
    return Promise.resolve(new Response(response.ok ? "ok" : "err", { status: response.status ?? (response.ok ? 200 : 500) }));
  }) as FetchImpl;
  return { restore: () => { globalThis.fetch = original; }, calls };
}

const BASE_INPUT: CriticalAlertInput = {
  userId: "user-1",
  cameraId: "cam-1",
  score: "critical",
  latencyAvg: 800,
  jitter: 200,
  lossPct: 12,
  suggestions: [{ code: "HIGH_LATENCY", severity: "critical", message: "Latência acima do aceitável" }],
};

const FULL_CFG: NotifCfg = {
  channels: ["email", "telegram"],
  email_recipients: ["ops@example.com"],
  phone_recipients: [],
  webhook_urls: [],
  severity_filter: ["critical", "high"],
  enabled: true,
};

Deno.test("não dispara alerta na 1ª validação crítica (streak=1 < 2)", async () => {
  const { client, rec } = buildMockClient({ healthState: null, camera: { id: "cam-1", name: "Cam 1" }, notifCfg: FULL_CFG });
  const stub = stubFetch({ ok: true });
  try {
    const result = await maybeAlertCriticalScore(client, BASE_INPUT);
    assertEquals(result.alerted, false);
    assertEquals(result.reason, "streak_below_threshold");
    assertEquals(result.streak, 1);
    assertEquals(stub.calls.length, 0, "não deve chamar send-alert-notification");
    assertEquals(rec.upserts.length, 1, "deve persistir o streak=1");
  } finally {
    stub.restore();
  }
});

Deno.test("dispara alerta na 2ª validação crítica consecutiva (streak=2)", async () => {
  const { client, rec } = buildMockClient({
    healthState: { consecutive_critical_scores: 1, last_critical_alert_at: null },
    camera: { id: "cam-1", name: "Cam 1" },
    notifCfg: FULL_CFG,
  });
  const stub = stubFetch({ ok: true });
  try {
    const result = await maybeAlertCriticalScore(client, BASE_INPUT);
    assertEquals(result.alerted, true);
    assertEquals(result.reason, "sent");
    assertEquals(result.streak, 2);
    assertEquals(stub.calls.length, 1);
    assertEquals(stub.calls[0].url.endsWith("/functions/v1/send-alert-notification"), true);
    // Streak deve ser zerado após envio
    assertEquals(rec.currentState?.consecutive_critical_scores, 0);
    assertEquals(rec.inserts.some((i) => i.table === "alerts"), true, "deve gravar histórico em alerts");
  } finally {
    stub.restore();
  }
});

Deno.test("reseta streak quando score volta para 'ok'", async () => {
  const { client, rec } = buildMockClient({
    healthState: { consecutive_critical_scores: 3, last_critical_alert_at: null },
    notifCfg: FULL_CFG,
  });
  const stub = stubFetch({ ok: true });
  try {
    const result = await maybeAlertCriticalScore(client, { ...BASE_INPUT, score: "ok" });
    assertEquals(result.alerted, false);
    assertEquals(result.reason, "score_not_critical");
    assertEquals(result.streak, 0);
    assertEquals(stub.calls.length, 0);
    assertEquals((rec.upserts[0] as { row: HealthStateRow }).row.consecutive_critical_scores, 0);
  } finally {
    stub.restore();
  }
});

Deno.test("reseta streak quando score é 'warn'", async () => {
  const { client } = buildMockClient({
    healthState: { consecutive_critical_scores: 5, last_critical_alert_at: null },
    notifCfg: FULL_CFG,
  });
  const stub = stubFetch({ ok: true });
  try {
    const result = await maybeAlertCriticalScore(client, { ...BASE_INPUT, score: "warn" });
    assertEquals(result.alerted, false);
    assertEquals(result.reason, "score_not_critical");
    assertEquals(result.streak, 0);
    assertEquals(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

Deno.test("respeita cooldown de 30 min (alerta há 5 min → suprime)", async () => {
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const { client } = buildMockClient({
    healthState: { consecutive_critical_scores: 1, last_critical_alert_at: fiveMinAgo },
    notifCfg: FULL_CFG,
  });
  const stub = stubFetch({ ok: true });
  try {
    const result = await maybeAlertCriticalScore(client, BASE_INPUT);
    assertEquals(result.alerted, false);
    assertEquals(result.streak, 2);
    assertEquals(result.reason.startsWith("cooldown_active_"), true, `reason=${result.reason}`);
    assertEquals(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

Deno.test("dispara após cooldown expirar (alerta há 31 min)", async () => {
  const past = new Date(Date.now() - 31 * 60_000).toISOString();
  const { client } = buildMockClient({
    healthState: { consecutive_critical_scores: 1, last_critical_alert_at: past },
    camera: { id: "cam-1", name: "Cam 1" },
    notifCfg: FULL_CFG,
  });
  const stub = stubFetch({ ok: true });
  try {
    const result = await maybeAlertCriticalScore(client, BASE_INPUT);
    assertEquals(result.alerted, true);
    assertEquals(result.reason, "sent");
    assertEquals(stub.calls.length, 1);
  } finally {
    stub.restore();
  }
});

Deno.test("não alerta quando nenhum canal está configurado", async () => {
  const { client } = buildMockClient({
    healthState: { consecutive_critical_scores: 1, last_critical_alert_at: null },
    notifCfg: { ...FULL_CFG, channels: [] },
  });
  const stub = stubFetch({ ok: true });
  try {
    const result = await maybeAlertCriticalScore(client, BASE_INPUT);
    assertEquals(result.alerted, false);
    assertEquals(result.reason, "no_channels_configured");
    assertEquals(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

Deno.test("não alerta quando severity_filter exclui 'critical'", async () => {
  const { client } = buildMockClient({
    healthState: { consecutive_critical_scores: 1, last_critical_alert_at: null },
    notifCfg: { ...FULL_CFG, severity_filter: ["low", "medium"] },
  });
  const stub = stubFetch({ ok: true });
  try {
    const result = await maybeAlertCriticalScore(client, BASE_INPUT);
    assertEquals(result.alerted, false);
    assertEquals(result.reason, "severity_filtered_out");
    assertEquals(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

Deno.test("retorna erro quando notify HTTP falha e não reseta streak", async () => {
  const { client, rec } = buildMockClient({
    healthState: { consecutive_critical_scores: 1, last_critical_alert_at: null },
    camera: { id: "cam-1", name: "Cam 1" },
    notifCfg: FULL_CFG,
  });
  const stub = stubFetch({ ok: false, status: 503 });
  try {
    const result = await maybeAlertCriticalScore(client, BASE_INPUT);
    assertEquals(result.alerted, false);
    assertEquals(result.reason, "notify_http_503");
    assertEquals(result.streak, 2);
    // streak não deve ser zerado pelo update de sucesso
    assertEquals(rec.currentState?.consecutive_critical_scores, 2);
  } finally {
    stub.restore();
  }
});

Deno.test("streak cresce ao longo de N validações críticas antes do 1º disparo", async () => {
  let state: HealthStateRow | null = null;
  for (let i = 1; i <= 3; i++) {
    const { client, rec } = buildMockClient({
      healthState: state,
      camera: { id: "cam-1", name: "Cam 1" },
      notifCfg: FULL_CFG,
    });
    const stub = stubFetch({ ok: true });
    try {
      const result = await maybeAlertCriticalScore(client, BASE_INPUT);
      if (i === 1) {
        assertEquals(result.alerted, false);
        assertEquals(result.streak, 1);
      } else if (i === 2) {
        assertEquals(result.alerted, true);
        assertEquals(result.streak, 2);
      }
      state = rec.currentState;
    } finally {
      stub.restore();
    }
  }
});
