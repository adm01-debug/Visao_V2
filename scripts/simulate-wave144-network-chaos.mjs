#!/usr/bin/env node
/**
 * Onda 144 — Simulação de falhas de rede e timeouts REAIS.
 *
 * Diferente das ondas anteriores (que simulavam lógica pura em memória), este
 * script sobe servidores HTTP locais que reproduzem patologias de rede de
 * verdade — sockets pendurados, RST no meio do corpo, corpo truncado, trickle
 * de bytes, redirect loop, 5xx intermitente — e exercita os utilitários reais
 * `fetchWithTimeout` / `fetchWithRetry` (espelhados de
 * supabase/functions/_shared/{timeout,retry}.ts) contra eles.
 *
 * Objetivo: prever gaps de classificação de erro, vazamento de socket e
 * estouro de orçamento de tempo ANTES das próximas ondas.
 *
 * Uso:
 *   node scripts/simulate-wave144-network-chaos.mjs
 *   node scripts/simulate-wave144-network-chaos.mjs --verbose
 */
import http from 'node:http';
import net from 'node:net';
import { performance } from 'node:perf_hooks';

const VERBOSE = process.argv.includes('--verbose');

let ok = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) {
    ok++;
    if (VERBOSE) console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Espelho fiel dos utilitários de produção (_shared/timeout.ts, _shared/retry.ts)
// ---------------------------------------------------------------------------
class TimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

async function fetchWithTimeout(input, init = {}, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError' || err?.cause?.name === 'AbortError') {
      throw new TimeoutError(`fetch ${String(input)} aborted after ${ms}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [500, 502, 503, 504],
  timeoutMs: 30_000,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getDelay(attempt, config, rnd = Math.random) {
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = delay * 0.2 * rnd();
  return Math.min(delay + jitter, config.maxDelayMs);
}

/** Igual ao de produção, mas instrumentado (conta tentativas) para a simulação. */
async function fetchWithRetry(url, init, config = {}, telemetry = {}) {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  telemetry.attempts = 0;
  telemetry.statuses = [];
  telemetry.errors = [];
  let lastError = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    telemetry.attempts++;
    const controller = cfg.timeoutMs > 0 ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), cfg.timeoutMs) : null;
    try {
      const response = await fetch(url, controller ? { ...init, signal: controller.signal } : init);
      if (timer) clearTimeout(timer);
      telemetry.statuses.push(response.status);

      if (response.ok || !cfg.retryableStatuses.includes(response.status)) {
        return response;
      }
      const errorText = await response.text();
      lastError = new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      if (attempt < cfg.maxRetries) await sleep(getDelay(attempt, cfg));
    } catch (error) {
      if (timer) clearTimeout(timer);
      lastError = error instanceof Error ? error : new Error(String(error));
      telemetry.errors.push(classify(lastError));
      if (attempt < cfg.maxRetries) await sleep(getDelay(attempt, cfg));
    }
  }
  throw lastError ?? new Error('fetchWithRetry: all attempts failed');
}

/**
 * Classificação canônica de falha de rede. É esta função que impede o gap
 * clássico: tratar RST/conexão recusada como "timeout" e assim aplicar o
 * backoff errado (ou culpar o agente local por silêncio quando o culpado é
 * a rede).
 */
function classify(err) {
  const code = err?.cause?.code ?? err?.code;
  const name = err?.cause?.name ?? err?.name;
  if (name === 'AbortError' || err instanceof TimeoutError) return 'timeout';
  if (code === 'ECONNREFUSED') return 'refused';
  if (code === 'ECONNRESET' || code === 'UND_ERR_SOCKET') return 'reset';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns';
  if (code === 'UND_ERR_HEADERS_TIMEOUT' || code === 'UND_ERR_BODY_TIMEOUT') return 'timeout';
  if (code === 'HPE_INVALID_CONSTANT' || code === 'UND_ERR_RESPONSE_STATUS_CODE') return 'protocol';
  if (String(err?.message ?? '').includes('redirect count exceeded')) return 'redirect_loop';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Servidores de caos (patologias reais)
// ---------------------------------------------------------------------------
const openSockets = new Set();
let flakyState = new Map();

function makeChaosServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const q = (k, d) => Number(url.searchParams.get(k) ?? d);

    switch (url.pathname) {
      // Resposta imediata e saudável.
      case '/ok':
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ ok: true }));

      // Atraso controlado antes de responder (usado para cruzar o deadline).
      case '/slow':
        return setTimeout(() => {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: true, delayed: q('ms', 0) }));
        }, q('ms', 100));

      // Headers rápidos, corpo em conta-gotas — pega o gap de quem só mede TTFB.
      case '/trickle': {
        res.writeHead(200, { 'content-type': 'application/json' });
        const chunks = ['{"o', 'k":', 'true}'];
        let i = 0;
        const tick = () => {
          if (i >= chunks.length) return res.end();
          res.write(chunks[i++]);
          setTimeout(tick, q('gap', 80));
        };
        return tick();
      }

      // Corpo truncado: promete Content-Length maior e destrói o socket.
      case '/truncate':
        res.writeHead(200, { 'content-type': 'application/json', 'content-length': '64' });
        res.write('{"ok":tr');
        return setTimeout(() => req.socket.destroy(), 20);

      // RST puro no meio da requisição.
      case '/reset':
        return setTimeout(() => req.socket.destroy(), q('ms', 10));

      // 5xx intermitente: falha N vezes e depois cura.
      case '/flaky': {
        const key = url.searchParams.get('key') ?? 'default';
        const failTimes = q('fail', 2);
        const seen = (flakyState.get(key) ?? 0) + 1;
        flakyState.set(key, seen);
        if (seen <= failTimes) {
          res.writeHead(q('status', 503), { 'content-type': 'text/plain' });
          return res.end('upstream indisponivel');
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, attempts: seen }));
      }

      // Status fixo (429, 402, 500...).
      case '/status':
        res.writeHead(q('code', 500), { 'content-type': 'text/plain' });
        return res.end('x');

      // Redirect loop — orçamento do cliente precisa cortar.
      case '/loop':
        res.writeHead(302, { location: '/loop' });
        return res.end();

      default:
        res.writeHead(404);
        return res.end();
    }
  });
  server.on('connection', (s) => {
    openSockets.add(s);
    s.on('close', () => openSockets.delete(s));
  });
  return server;
}

/** Aceita TCP e nunca responde nada (blackhole real). */
function makeBlackhole() {
  return net.createServer((socket) => {
    openSockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => openSockets.delete(socket));
  });
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}
function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}
/** Espera os sockets do servidor drenarem (keep-alive + handlers pendentes). */
async function drainSockets(maxWaitMs) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (openSockets.size === 0) return true;
    await sleep(100);
  }
  return openSockets.size === 0;
}


// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
async function main() {
  const chaos = makeChaosServer();
  const blackhole = makeBlackhole();
  const chaosPort = await listen(chaos);
  const holePort = await listen(blackhole);
  const closedPort = await (async () => {
    const tmp = http.createServer();
    const p = await listen(tmp);
    await close(tmp);
    return p; // porta garantidamente sem listener
  })();
  const base = `http://127.0.0.1:${chaosPort}`;

  // ---- 1. Deadline real: matriz de (timeout x atraso) -----------------------
  console.log('\n[1] Deadline real por AbortController (matriz timeout × atraso)');
  const timeouts = [80, 120, 200, 320];
  const delays = [0, 40, 150, 400];
  for (const t of timeouts) {
    for (const d of delays) {
      const started = performance.now();
      let outcome = 'ok';
      try {
        const r = await fetchWithTimeout(`${base}/slow?ms=${d}`, {}, t);
        await r.text();
      } catch (e) {
        outcome = classify(e);
      }
      const elapsed = performance.now() - started;
      const shouldTimeout = d >= t;
      check(
        `timeout=${t}ms atraso=${d}ms → ${shouldTimeout ? 'timeout' : 'sucesso'}`,
        shouldTimeout ? outcome === 'timeout' : outcome === 'ok',
        `obtido=${outcome}`,
      );
      // O deadline precisa ser um teto real, não uma sugestão.
      check(`timeout=${t}ms atraso=${d}ms respeita teto`, elapsed < t + 250, `${Math.round(elapsed)}ms`);
    }
  }

  // ---- 2. Blackhole TCP (aceita e some) ------------------------------------
  console.log('\n[2] Blackhole TCP — conexão aceita, resposta nunca chega');
  for (const t of [60, 120, 240]) {
    const started = performance.now();
    let outcome = 'ok';
    try {
      await fetchWithTimeout(`http://127.0.0.1:${holePort}/`, {}, t);
    } catch (e) {
      outcome = classify(e);
    }
    const elapsed = performance.now() - started;
    check(`blackhole timeout=${t}ms classifica timeout`, outcome === 'timeout', `obtido=${outcome}`);
    check(`blackhole timeout=${t}ms aborta a tempo`, elapsed < t + 250, `${Math.round(elapsed)}ms`);
  }

  // ---- 3. Falhas de transporte distintas não viram "timeout" ---------------
  console.log('\n[3] Classificação de falhas de transporte (gap clássico)');
  const transportCases = [
    { name: 'conexão recusada', url: `http://127.0.0.1:${closedPort}/ok`, expect: 'refused' },
    { name: 'DNS inexistente', url: 'http://nao-existe.invalid/ok', expect: 'dns' },
    { name: 'RST no meio', url: `${base}/reset?ms=10`, expect: 'reset' },
    { name: 'corpo truncado', url: `${base}/truncate`, expect: 'reset' },
  ];
  for (const c of transportCases) {
    let outcome = 'ok';
    try {
      const r = await fetchWithTimeout(c.url, {}, 3000);
      await r.text();
    } catch (e) {
      outcome = classify(e);
    }
    check(`${c.name} → ${c.expect}`, outcome === c.expect, `obtido=${outcome}`);
    check(`${c.name} não é confundido com timeout`, outcome !== 'timeout');
  }

  // ---- 4. Corpo lento (trickle) estoura deadline mesmo com headers rápidos --
  console.log('\n[4] Corpo em conta-gotas (headers rápidos, bytes lentos)');
  for (const gap of [30, 90, 200]) {
    const started = performance.now();
    let outcome = 'ok';
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 150);
      try {
        const r = await fetch(`${base}/trickle?gap=${gap}`, { signal: controller.signal });
        await r.text(); // deadline precisa cobrir a leitura do corpo, não só o TTFB
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      outcome = classify(e);
    }
    const elapsed = performance.now() - started;
    const expectTimeout = gap * 3 >= 150;
    check(
      `trickle gap=${gap}ms → ${expectTimeout ? 'timeout' : 'sucesso'}`,
      expectTimeout ? outcome === 'timeout' : outcome === 'ok',
      `obtido=${outcome}`,
    );
    check(`trickle gap=${gap}ms dentro do envelope`, elapsed < 500, `${Math.round(elapsed)}ms`);
  }

  // ---- 5. Retry: cura, não-retry e esgotamento ------------------------------
  console.log('\n[5] Política de retry sob 5xx / 429 / 402');
  flakyState = new Map();
  {
    const tel = {};
    const r = await fetchWithRetry(
      `${base}/flaky?key=cura&fail=2`,
      {},
      { baseDelayMs: 10, maxDelayMs: 40, timeoutMs: 1000 },
      tel,
    );
    const body = await r.json();
    check('503 intermitente cura na 3ª tentativa', r.status === 200 && tel.attempts === 3, `attempts=${tel.attempts}`);
    check('resposta curada é a boa', body.ok === true && body.attempts === 3);
  }
  for (const code of [429, 402, 400, 404]) {
    const tel = {};
    const r = await fetchWithRetry(`${base}/status?code=${code}`, {}, { baseDelayMs: 5, timeoutMs: 1000 }, tel);
    check(`HTTP ${code} não é retentado`, tel.attempts === 1 && r.status === code, `attempts=${tel.attempts}`);
    await r.text();
  }
  for (const code of [500, 502, 503, 504]) {
    const tel = {};
    const started = performance.now();
    let threw = false;
    try {
      const r = await fetchWithRetry(
        `${base}/status?code=${code}`,
        {},
        { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 40, timeoutMs: 1000 },
        tel,
      );
      await r.text();
    } catch {
      threw = true;
    }
    const elapsed = performance.now() - started;
    check(`HTTP ${code} esgota tentativas e falha`, threw && tel.attempts === 3, `attempts=${tel.attempts}`);
    check(`HTTP ${code} respeita orçamento de backoff`, elapsed < 1500, `${Math.round(elapsed)}ms`);
  }

  // ---- 6. Retry sobre falha de transporte + timeout por tentativa ----------
  console.log('\n[6] Retry com timeout POR TENTATIVA (orçamento total limitado)');
  {
    const tel = {};
    const started = performance.now();
    let threw = false;
    try {
      await fetchWithRetry(
        `http://127.0.0.1:${holePort}/`,
        {},
        { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 20, timeoutMs: 80 },
        tel,
      );
    } catch {
      threw = true;
    }
    const elapsed = performance.now() - started;
    check('blackhole: 3 tentativas, todas timeout', threw && tel.attempts === 3 && tel.errors.every((e) => e === 'timeout'), JSON.stringify(tel.errors));
    // 3 × 80ms + 2 × ~20ms de espera ≈ 280ms. Teto generoso protege CI lento.
    check('orçamento total do retry não explode', elapsed < 900, `${Math.round(elapsed)}ms`);
  }
  {
    const tel = {};
    let threw = false;
    try {
      await fetchWithRetry(
        `http://127.0.0.1:${closedPort}/ok`,
        {},
        { maxRetries: 2, baseDelayMs: 5, maxDelayMs: 10, timeoutMs: 500 },
        tel,
      );
    } catch {
      threw = true;
    }
    check('conexão recusada é retentada e classificada', threw && tel.attempts === 3 && tel.errors.every((e) => e === 'refused'), JSON.stringify(tel.errors));
  }

  // ---- 7. Redirect loop ----------------------------------------------------
  console.log('\n[7] Redirect loop');
  {
    let outcome = 'ok';
    const started = performance.now();
    try {
      const r = await fetchWithTimeout(`${base}/loop`, {}, 3000);
      await r.text();
    } catch (e) {
      outcome = classify(e);
    }
    check('redirect loop é cortado pelo cliente', outcome !== 'ok', `obtido=${outcome}`);
    check('redirect loop não pendura o processo', performance.now() - started < 3000);
  }

  // ---- 8. Backoff: limites e jitter (10k amostras) -------------------------
  console.log('\n[8] Backoff exponencial com jitter — invariantes estatísticas');
  {
    const cfg = { ...DEFAULT_RETRY_CONFIG, baseDelayMs: 100, maxDelayMs: 800 };
    let violations = 0;
    let capped = 0;
    for (let i = 0; i < 10_000; i++) {
      const attempt = i % 6;
      const d = getDelay(attempt, cfg);
      const nominal = cfg.baseDelayMs * 2 ** attempt;
      if (d < Math.min(nominal, cfg.maxDelayMs) - 0.001) violations++;
      if (d > cfg.maxDelayMs + 0.001) violations++;
      if (d === cfg.maxDelayMs) capped++;
    }
    check('nenhum atraso fora de [nominal, maxDelay]', violations === 0, `violações=${violations}`);
    check('teto maxDelay é efetivamente atingido', capped > 0, `capped=${capped}`);
    const zeroJitter = getDelay(0, cfg, () => 0);
    const fullJitter = getDelay(0, cfg, () => 1);
    check('jitter fica em 0–20% do nominal', zeroJitter === 100 && Math.abs(fullJitter - 120) < 1e-9, `${zeroJitter}/${fullJitter}`);
  }

  // ---- 9. Carga concorrente com falhas misturadas --------------------------
  console.log('\n[9] Carga concorrente (120 chamadas, falhas misturadas)');
  {
    const mix = [
      () => fetchWithTimeout(`${base}/ok`, {}, 500).then((r) => r.text()).then(() => 'ok'),
      () => fetchWithTimeout(`${base}/slow?ms=400`, {}, 100).then(() => 'ok').catch((e) => classify(e)),
      () => fetchWithTimeout(`${base}/reset?ms=5`, {}, 500).then((r) => r.text()).then(() => 'ok').catch((e) => classify(e)),
      () => fetchWithTimeout(`http://127.0.0.1:${closedPort}/ok`, {}, 500).then(() => 'ok').catch((e) => classify(e)),
      () => fetchWithTimeout(`http://127.0.0.1:${holePort}/`, {}, 100).then(() => 'ok').catch((e) => classify(e)),
      () => fetchWithTimeout(`${base}/truncate`, {}, 500).then((r) => r.text()).then(() => 'ok').catch((e) => classify(e)),
    ];
    let unhandled = 0;
    const onUnhandled = () => { unhandled++; };
    process.on('unhandledRejection', onUnhandled);

    const started = performance.now();
    const results = await Promise.all(Array.from({ length: 120 }, (_, i) => mix[i % mix.length]()));
    const elapsed = performance.now() - started;
    await sleep(120);
    process.off('unhandledRejection', onUnhandled);

    const tally = results.reduce((acc, r) => ({ ...acc, [r]: (acc[r] ?? 0) + 1 }), {});
    check('nenhuma promessa rejeitada sem tratamento', unhandled === 0, `unhandled=${unhandled}`);
    check('toda falha recebeu classificação conhecida', results.every((r) => r !== 'unknown'), JSON.stringify(tally));
    check('20 sucessos limpos sob caos', (tally.ok ?? 0) === 20, JSON.stringify(tally));
    check('carga concorrente conclui em tempo hábil', elapsed < 5000, `${Math.round(elapsed)}ms`);
    peakSockets = Math.max(peakSockets, openSockets.size);


  }

  // ---- 10. Idempotência de leitura sob falha -------------------------------
  console.log('\n[10] Corpo parcial nunca vira JSON válido silenciosamente');
  for (let i = 0; i < 12; i++) {
    let parsedSilently = false;
    try {
      const r = await fetchWithTimeout(`${base}/truncate`, {}, 800);
      const txt = await r.text();
      JSON.parse(txt);
      parsedSilently = true;
    } catch {
      parsedSilently = false;
    }
    check(`corpo truncado #${i + 1} falha em vez de mentir`, parsedSilently === false);
  }


  // ---- 11. Sem vazamento de socket após fechar o pool ----------------------
  // Abort fecha o lado do cliente, mas o socket do servidor só cai quando o
  // handler pendente termina + keep-alive expira. O que NÃO pode existir é
  // socket que sobrevive ao fechamento do pool HTTP — isso seria vazamento.
  console.log('\n[11] Drenagem de sockets após fechar o pool HTTP');
  {
    const peak = Math.max(peakSockets, openSockets.size);
    await closeHttpPool();
    const drained = await drainSockets(15000);
    check('todo socket drena após o pool fechar', drained, `pico=${peak} restantes=${openSockets.size}`);
    check('a carga realmente abriu conexões (teste não é vazio)', peak > 10, `pico=${peak}`);
  }

  await close(chaos);
  await close(blackhole);
  for (const s of openSockets) s.destroy();


  const total = ok + fail;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Onda 144 — caos de rede: ${ok}/${total} verificações OK`);
  if (fail > 0) {
    console.log(`\n${fail} falha(s):`);
    for (const f of failures) console.log(`  • ${f}`);
    process.exitCode = 1;
  } else {
    console.log('Nenhum gap de rede/timeout detectado.');
  }
}

main().catch((err) => {
  console.error('Simulação abortou:', err);
  process.exit(1);
});
