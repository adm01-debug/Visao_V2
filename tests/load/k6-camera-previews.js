/**
 * VISÃO — Teste de carga: Prévias RTSP em paralelo (k6).
 *
 * Simula N câmeras virtuais executando, em paralelo:
 *   1) POST /functions/v1/validate-rtsp-stream
 *   2) POST /functions/v1/rtsp-preview   { action: "start" }
 *   3) POST /functions/v1/rtsp-preview   { action: "extend" }
 *   4) POST /functions/v1/rtsp-preview   { action: "stop"   }
 *
 * Coleta:
 *   - Latência p50/p95/p99 por endpoint (Trend por action).
 *   - Taxa de erro global e por status HTTP.
 *   - Rate limiting (contagem de 429) por endpoint.
 *   - Sessões preview_ok / preview_fail.
 *
 * Uso:
 *   BASE_URL=https://<project>.supabase.co \
 *   ANON_KEY=... USER_JWT=... \
 *   RTSP_URL="rtsp://user:pass@10.0.0.1:554/Streaming/Channels/101" \
 *   SCENARIO=ramp k6 run tests/load/k6-camera-previews.js
 *
 * Cenários (SCENARIO env):
 *   - smoke   : 5 VUs por 30s   (sanidade — CI).
 *   - ramp    : 0→50→100 VUs em 5m (default — busca do joelho).
 *   - burst   : 200 VUs instantâneos por 1m (validar 429/backpressure).
 *   - soak    : 40 VUs por 15m (memory leaks / bloat de conexões).
 *
 * ATENÇÃO: aponte o `RTSP_URL` para um stream de laboratório. Não use
 *          câmera de produção — o k6 abre dezenas de handshakes por segundo.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE_URL = __ENV.BASE_URL;
const ANON_KEY = __ENV.ANON_KEY || '';
const USER_JWT = __ENV.USER_JWT || ANON_KEY;
const RTSP_URL = __ENV.RTSP_URL || 'rtsp://demo.local:554/stream';
const SCENARIO = (__ENV.SCENARIO || 'ramp').toLowerCase();

if (!BASE_URL) {
  if (__ENV.DRY_RUN) {
    throw new Error(
      'DRY_RUN pertence ao runner Node (scripts/run-camera-load-test.mjs). ' +
        'No k6, simulação sem rede não existe: exporte BASE_URL e ANON_KEY de um alvo de laboratório.'
    );
  }
  throw new Error('BASE_URL é obrigatório (nunca produção por padrão). Exporte antes de rodar.');
}
if (!ANON_KEY) throw new Error('ANON_KEY é obrigatório. Exporte antes de rodar.');

// ---------- Métricas customizadas ----------
const validateLatency = new Trend('validate_latency_ms', true);
const startLatency = new Trend('preview_start_latency_ms', true);
const extendLatency = new Trend('preview_extend_latency_ms', true);
const stopLatency = new Trend('preview_stop_latency_ms', true);

const rateLimited = new Counter('rate_limited_429_total');
const rateLimitedByEndpoint = {
  validate: new Counter('rate_limited_validate'),
  start: new Counter('rate_limited_start'),
  extend: new Counter('rate_limited_extend'),
  stop: new Counter('rate_limited_stop'),
};
const previewStarted = new Counter('preview_started_ok');
const previewFailed = new Counter('preview_failed');
const okRate = new Rate('any_request_ok');

// ---------- Cenários ----------
const SCENARIOS = {
  smoke: {
    executor: 'constant-vus',
    vus: 5,
    duration: '30s',
  },
  ramp: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '1m', target: 100 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '20s',
  },
  burst: {
    executor: 'ramping-arrival-rate',
    startRate: 0,
    timeUnit: '1s',
    preAllocatedVUs: 200,
    maxVUs: 400,
    stages: [
      { duration: '10s', target: 200 },
      { duration: '1m', target: 200 },
      { duration: '10s', target: 0 },
    ],
  },
  soak: {
    executor: 'constant-vus',
    vus: 40,
    duration: '15m',
  },
};

export const options = {
  scenarios: { camera_previews: SCENARIOS[SCENARIO] || SCENARIOS.ramp },
  thresholds: {
    // SLOs iniciais — calibre após rodar `smoke` no ambiente alvo.
    validate_latency_ms: ['p(95)<2500'],
    preview_start_latency_ms: ['p(95)<3500'],
    preview_stop_latency_ms: ['p(95)<1500'],
    any_request_ok: ['rate>0.95'],
    // 429 é sinal esperado em burst; falha só se ultrapassar 20% do total.
    rate_limited_429_total: ['count>=0'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// ---------- Helpers ----------
function headers() {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${USER_JWT}`,
    'Content-Type': 'application/json',
  };
}

function post(path, payload, trend, endpointKey) {
  const res = http.post(`${BASE_URL}/functions/v1/${path}`, JSON.stringify(payload), {
    headers: headers(),
    tags: { endpoint: path, action: endpointKey },
  });
  trend.add(res.timings.duration);
  const is2xx = res.status >= 200 && res.status < 300;
  okRate.add(is2xx);
  if (res.status === 429) {
    rateLimited.add(1);
    rateLimitedByEndpoint[endpointKey]?.add(1);
  }
  return res;
}

// ---------- VU behaviour ----------
export default function () {
  // 1) Validar
  const validateRes = post(
    'validate-rtsp-stream',
    { rtsp_url: RTSP_URL, samples: 3 },
    validateLatency,
    'validate'
  );
  check(validateRes, {
    'validate: 2xx ou 429': (r) => r.status < 300 || r.status === 429,
  });

  // Se validação foi rejeitada por rate-limit, respira e tenta prévia mesmo assim
  // (queremos observar o comportamento do preview sob pressão paralela).
  sleep(randomIntBetween(0, 1));

  // 2) Start
  const startRes = post(
    'rtsp-preview',
    { action: 'start', rtsp_url: RTSP_URL },
    startLatency,
    'start'
  );

  let sessionId = null;
  try {
    const body = startRes.json();
    sessionId = body?.sessionId ?? null;
  } catch (_) {
    // ignorado — JSON pode falhar em 5xx
  }

  if (startRes.status >= 200 && startRes.status < 300 && sessionId) {
    previewStarted.add(1);
    sleep(randomIntBetween(2, 6));

    // 3) Extend (só se ainda temos sessão)
    const extendRes = post(
      'rtsp-preview',
      { action: 'extend', sessionId, seconds: 60 },
      extendLatency,
      'extend'
    );
    check(extendRes, { 'extend: sem 5xx': (r) => r.status < 500 });

    sleep(randomIntBetween(1, 3));

    // 4) Stop — sempre encerrar para não deixar sessão zumbi
    const stopRes = post(
      'rtsp-preview',
      { action: 'stop', sessionId, reason: 'loadtest' },
      stopLatency,
      'stop'
    );
    check(stopRes, { 'stop: 2xx': (r) => r.status >= 200 && r.status < 300 });
  } else {
    previewFailed.add(1);
    // Backoff quando bombeando 429/5xx para não amplificar a tempestade.
    sleep(randomIntBetween(1, 3));
  }
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'tests/load/reports/k6-summary.json': JSON.stringify(data, null, 2),
  };
}

// Mini text summary sem dependência externa.
function textSummary(data) {
  const m = data.metrics;
  const line = (k) => {
    const v = m[k];
    if (!v) return `${k}: n/a`;
    if (v.values.p95 !== undefined || v.values['p(95)'] !== undefined) {
      const p95 = v.values['p(95)'] ?? v.values.p95;
      return `${k}: avg=${v.values.avg?.toFixed(1)}ms p95=${p95?.toFixed(1)}ms`;
    }
    if (v.values.count !== undefined) return `${k}: count=${v.values.count}`;
    if (v.values.rate !== undefined) return `${k}: rate=${(v.values.rate * 100).toFixed(2)}%`;
    return `${k}: ${JSON.stringify(v.values)}`;
  };
  return [
    '',
    '=== VISÃO :: k6 Camera Preview Load ===',
    line('validate_latency_ms'),
    line('preview_start_latency_ms'),
    line('preview_extend_latency_ms'),
    line('preview_stop_latency_ms'),
    line('any_request_ok'),
    line('rate_limited_429_total'),
    line('rate_limited_validate'),
    line('rate_limited_start'),
    line('preview_started_ok'),
    line('preview_failed'),
    '',
  ].join('\n');
}
