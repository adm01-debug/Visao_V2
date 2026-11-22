#!/usr/bin/env node
/**
 * VISÃO — Runner Node de teste de carga para prévias RTSP.
 *
 * Alternativa ao k6 quando `k6` não está instalado no host/CI. Simula N câmeras
 * virtuais executando validate → preview.start → preview.extend → preview.stop
 * em paralelo, controlando concorrência (semaphore) e coletando métricas.
 *
 * Uso:
 *   BASE_URL=https://<project>.supabase.co \
 *   ANON_KEY=... USER_JWT=... \
 *   RTSP_URL="rtsp://user:pass@10.0.0.1:554/Streaming/Channels/101" \
 *   node scripts/run-camera-load-test.mjs --cameras=100 --concurrency=25 --scenario=ramp
 *
 * Flags:
 *   --cameras=N       Total de câmeras virtuais (default 50).
 *   --concurrency=C   Máximo em paralelo (default 20).
 *   --scenario=NAME   smoke|ramp|burst|soak (ajusta pacing).
 *   --dry-run         Não faz HTTP; útil para validar o runner.
 *   --out=PATH        Diretório de relatórios (default tests/load/reports).
 *
 * SEGURANÇA: Aponte RTSP_URL para stream de laboratório. Não use produção.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const BASE_URL = process.env.BASE_URL;
const ANON_KEY = process.env.ANON_KEY || '';
const USER_JWT = process.env.USER_JWT || ANON_KEY;
if (!BASE_URL) {
  if (argv['dry-run']) {
    console.log('[dry-run] sem BASE_URL: simulação local independente de rede.');
  } else {
    console.error(
      'Sem BASE_URL: defina BASE_URL para mirar um ambiente (nunca produção por padrão). Abortando.'
    );
    process.exit(1);
  }
}
const RTSP_URL = process.env.RTSP_URL || 'rtsp://demo.local:554/stream';
const CAMERAS = Number.parseInt(argv.cameras ?? '50', 10);
const CONCURRENCY = Number.parseInt(argv.concurrency ?? '20', 10);
const SCENARIO = String(argv.scenario ?? 'ramp');
const DRY = Boolean(argv['dry-run']);
const OUT_DIR = String(argv.out ?? 'tests/load/reports');

if (!DRY && !ANON_KEY) {
  console.error('[fatal] ANON_KEY é obrigatório (use --dry-run para testar o runner).');
  process.exit(2);
}
if (!Number.isFinite(CAMERAS) || CAMERAS < 1 || CAMERAS > 5000) {
  console.error('[fatal] --cameras deve estar entre 1 e 5000.');
  process.exit(2);
}
if (!Number.isFinite(CONCURRENCY) || CONCURRENCY < 1 || CONCURRENCY > 500) {
  console.error('[fatal] --concurrency deve estar entre 1 e 500.');
  process.exit(2);
}

mkdirSync(OUT_DIR, { recursive: true });

// ---------- Métricas ----------
const samples = {
  validate: [],
  start: [],
  extend: [],
  stop: [],
};
const counters = {
  total: 0,
  ok: 0,
  fail: 0,
  status: new Map(), // status -> count
  rateLimited: { validate: 0, start: 0, extend: 0, stop: 0 },
  previewStarted: 0,
  previewFailed: 0,
  networkErrors: 0,
};

function pushSample(bucket, ms, status) {
  samples[bucket].push({ ms, status });
  counters.total += 1;
  const key = String(status);
  counters.status.set(key, (counters.status.get(key) ?? 0) + 1);
  if (status === 429) counters.rateLimited[bucket] += 1;
  if (status >= 200 && status < 300) counters.ok += 1;
  else counters.fail += 1;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function summarize(bucket) {
  const ms = samples[bucket].map((s) => s.ms);
  if (!ms.length) return { count: 0 };
  const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
  return {
    count: ms.length,
    avg: +avg.toFixed(1),
    p50: percentile(ms, 50),
    p95: percentile(ms, 95),
    p99: percentile(ms, 99),
    max: Math.max(...ms),
  };
}

// ---------- HTTP ----------
async function callFn(path, payload) {
  if (DRY) {
    // Latência sintética entre 20-200ms; 5% de 429 para exercitar a lógica.
    const ms = 20 + Math.random() * 180;
    await new Promise((r) => setTimeout(r, ms));
    const status = Math.random() < 0.05 ? 429 : 200;
    return {
      status,
      ms,
      body:
        status === 200
          ? { sessionId: `dry-${Math.random().toString(36).slice(2, 10)}` }
          : { error: 'rate_limited' },
    };
  }
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE_URL}/functions/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${USER_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const ms = performance.now() - t0;
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, ms, body };
  } catch (err) {
    counters.networkErrors += 1;
    return { status: 0, ms: performance.now() - t0, body: { error: String(err?.message || err) } };
  }
}

// ---------- Pacing por cenário ----------
function pacingDelayMs(index) {
  switch (SCENARIO) {
    case 'burst':
      return 0; // dispara tudo o mais rápido possível.
    case 'soak':
      return 250 + Math.random() * 250;
    case 'smoke':
      return 200;
    case 'ramp':
    default: {
      // Ramp linear: primeiras câmeras esperam mais, últimas menos.
      const ratio = 1 - index / CAMERAS;
      return Math.floor(ratio * 300);
    }
  }
}

// ---------- VU ----------
async function runVirtualCamera(index) {
  await new Promise((r) => setTimeout(r, pacingDelayMs(index)));

  const v = await callFn('validate-rtsp-stream', { rtsp_url: RTSP_URL, samples: 3 });
  pushSample('validate', v.ms, v.status);

  const s = await callFn('rtsp-preview', { action: 'start', rtsp_url: RTSP_URL });
  pushSample('start', s.ms, s.status);
  const sessionId = s.body?.sessionId ?? null;
  const okStart = s.status >= 200 && s.status < 300 && sessionId;
  if (okStart) counters.previewStarted += 1;
  else counters.previewFailed += 1;

  if (okStart) {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));
    const e = await callFn('rtsp-preview', { action: 'extend', sessionId, seconds: 60 });
    pushSample('extend', e.ms, e.status);

    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
    const stop = await callFn('rtsp-preview', { action: 'stop', sessionId, reason: 'loadtest' });
    pushSample('stop', stop.ms, stop.status);
  }
}

// ---------- Semaphore ----------
async function runAll() {
  const queue = Array.from({ length: CAMERAS }, (_, i) => i);
  const active = new Set();
  let inFlight = 0;
  let launched = 0;
  const t0 = performance.now();

  return new Promise((resolve) => {
    const pump = () => {
      while (inFlight < CONCURRENCY && queue.length > 0) {
        const i = queue.shift();
        inFlight += 1;
        launched += 1;
        const p = runVirtualCamera(i).finally(() => {
          inFlight -= 1;
          active.delete(p);
          pump();
        });
        active.add(p);
      }
      if (inFlight === 0 && queue.length === 0) {
        resolve({ elapsedMs: performance.now() - t0, launched });
      }
    };
    pump();
  });
}

// ---------- Report ----------
function buildReport(runInfo) {
  const bySlot = {
    validate: summarize('validate'),
    start: summarize('start'),
    extend: summarize('extend'),
    stop: summarize('stop'),
  };
  const total = counters.total || 1;
  const failRate = counters.fail / total;
  const rl429Total = Object.values(counters.rateLimited).reduce((a, b) => a + b, 0);
  const rl429Rate = rl429Total / total;

  const gaps = [];
  if (bySlot.start.p95 && bySlot.start.p95 > 3500)
    gaps.push(`preview.start p95=${bySlot.start.p95.toFixed(0)}ms acima do SLO (3500ms)`);
  if (bySlot.validate.p95 && bySlot.validate.p95 > 2500)
    gaps.push(`validate p95=${bySlot.validate.p95.toFixed(0)}ms acima do SLO (2500ms)`);
  if (failRate > 0.05) gaps.push(`taxa de falha ${(failRate * 100).toFixed(2)}% acima de 5%`);
  if (rl429Rate > 0.2)
    gaps.push(
      `429s em ${(rl429Rate * 100).toFixed(2)}% das requisições — considere elevar limite ou aplicar backoff no cliente`
    );
  if (counters.networkErrors > 0)
    gaps.push(`${counters.networkErrors} erros de rede (DNS/TCP/TLS)`);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      baseUrl: DRY && !BASE_URL ? '(simulação — sem rede)' : BASE_URL,
      scenario: SCENARIO,
      cameras: CAMERAS,
      concurrency: CONCURRENCY,
      dryRun: DRY,
      rtspUrlMasked: RTSP_URL.replace(/\/\/[^@/]+@/, '//***@'),
      elapsedMs: Math.round(runInfo.elapsedMs),
    },
    latencies: bySlot,
    counters: {
      total,
      ok: counters.ok,
      fail: counters.fail,
      failRate: +failRate.toFixed(4),
      previewStarted: counters.previewStarted,
      previewFailed: counters.previewFailed,
      networkErrors: counters.networkErrors,
      rateLimited: { ...counters.rateLimited, total: rl429Total, ratio: +rl429Rate.toFixed(4) },
      statusHistogram: Object.fromEntries([...counters.status.entries()].sort()),
    },
    gaps,
  };
}

function renderMarkdown(report) {
  const l = report.latencies;
  const c = report.counters;
  const lines = [];
  lines.push(`# Camera Preview Load Test — ${report.meta.scenario}`);
  lines.push('');
  lines.push(`- **Gerado em:** ${report.meta.generatedAt}`);
  lines.push(`- **Base URL:** ${report.meta.baseUrl}`);
  lines.push(
    `- **Câmeras virtuais:** ${report.meta.cameras} (concorrência ${report.meta.concurrency})`
  );
  lines.push(
    `- **Duração:** ${(report.meta.elapsedMs / 1000).toFixed(1)}s${report.meta.dryRun ? ' _(dry-run)_' : ''}`
  );
  lines.push('');
  lines.push('## Latências (ms)');
  lines.push('| Endpoint | count | avg | p50 | p95 | p99 | max |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const [name, s] of Object.entries(l)) {
    lines.push(
      `| ${name} | ${s.count ?? 0} | ${s.avg ?? '-'} | ${s.p50 ?? '-'} | ${s.p95 ?? '-'} | ${s.p99 ?? '-'} | ${s.max ?? '-'} |`
    );
  }
  lines.push('');
  lines.push('## Resultado');
  lines.push(
    `- Requisições totais: **${c.total}** — OK **${c.ok}** / Fail **${c.fail}** (${(c.failRate * 100).toFixed(2)}%)`
  );
  lines.push(`- Prévias iniciadas: **${c.previewStarted}** — falhas: **${c.previewFailed}**`);
  lines.push(
    `- 429 total: **${c.rateLimited.total}** (${(c.rateLimited.ratio * 100).toFixed(2)}%) — por endpoint: ${JSON.stringify({ validate: c.rateLimited.validate, start: c.rateLimited.start, extend: c.rateLimited.extend, stop: c.rateLimited.stop })}`
  );
  lines.push(`- Erros de rede: **${c.networkErrors}**`);
  lines.push(`- Histograma HTTP: ${JSON.stringify(c.statusHistogram)}`);
  lines.push('');
  lines.push('## Gaps detectados');
  if (report.gaps.length === 0) lines.push('- Nenhum gap identificado nos SLOs configurados. ✅');
  else for (const g of report.gaps) lines.push(`- ⚠️ ${g}`);
  lines.push('');
  return lines.join('\n');
}

// ---------- Main ----------
(async () => {
  console.log(
    `[info] Iniciando teste de carga (${CAMERAS} câmeras, conc=${CONCURRENCY}, cenário=${SCENARIO})…`
  );
  const runInfo = await runAll();
  const report = buildReport(runInfo);
  const jsonPath = join(OUT_DIR, `camera-load-${Date.now()}.json`);
  const mdPath = join(OUT_DIR, `camera-load-${Date.now()}.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, renderMarkdown(report));
  console.log(renderMarkdown(report));
  console.log(`[info] JSON: ${jsonPath}`);
  console.log(`[info] Markdown: ${mdPath}`);
  // Exit code 1 se houver gaps — permite gating em CI.
  process.exit(report.gaps.length > 0 ? 1 : 0);
})().catch((err) => {
  console.error('[fatal]', err);
  process.exit(2);
});
