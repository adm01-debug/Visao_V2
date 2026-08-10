#!/usr/bin/env node
/**
 * VISÃO Wave 23 — Circuit breaker simulation.
 * Simulates hundreds of failure/recovery sequences to verify state machine
 * invariants before shipping. Pure JS re-implementation mirroring circuitBreaker.ts.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DEFAULTS = { failureThreshold: 5, cooldownMs: 30_000 };

function makeCircuit(opts = {}) {
  return {
    state: 'closed',
    failures: 0,
    openedAt: 0,
    opts: { ...DEFAULTS, ...opts },
  };
}

async function run(c, fn, now) {
  if (c.state === 'open') {
    if (now - c.openedAt < c.opts.cooldownMs) {
      const err = new Error('circuit_open');
      err.code = 'OPEN';
      throw err;
    }
    c.state = 'half-open';
  }
  try {
    const r = await fn();
    c.failures = 0;
    c.state = 'closed';
    return r;
  } catch (e) {
    c.failures += 1;
    if (c.state === 'half-open' || c.failures >= c.opts.failureThreshold) {
      c.state = 'open';
      c.openedAt = now;
    }
    throw e;
  }
}

const scenarios = [];
let unsafe = 0;

// 1. Threshold sweep: fails 1..10, threshold=5
for (let fails = 1; fails <= 10; fails++) {
  const c = makeCircuit();
  let opened = false;
  for (let i = 0; i < fails; i++) {
    try {
      await run(c, () => Promise.reject(new Error('x')), 1000 + i);
    } catch {}
  }
  opened = c.state === 'open';
  const expected = fails >= 5;
  const ok = opened === expected;
  if (!ok) unsafe++;
  scenarios.push({ id: `threshold_${fails}`, fails, opened, expected, ok });
}

// 2. Cooldown behavior: open → probe before/after cooldown
for (const wait of [0, 1000, 15_000, 29_999, 30_000, 30_001, 60_000]) {
  const c = makeCircuit();
  for (let i = 0; i < 5; i++) {
    try {
      await run(c, () => Promise.reject(new Error('x')), 1000 + i);
    } catch {}
  }
  // c.openedAt = 1004
  const now = 1004 + wait;
  let fastFail = false;
  try {
    await run(c, () => Promise.resolve('ok'), now);
  } catch (e) {
    if (e.code === 'OPEN') fastFail = true;
  }
  const expectFastFail = wait < 30_000;
  const ok = fastFail === expectFastFail;
  if (!ok) unsafe++;
  scenarios.push({ id: `cooldown_wait_${wait}`, fastFail, expectFastFail, ok });
}

// 3. Half-open success → closed
{
  const c = makeCircuit();
  for (let i = 0; i < 5; i++) {
    try {
      await run(c, () => Promise.reject(new Error('x')), 1000 + i);
    } catch {}
  }
  await run(c, () => Promise.resolve('ok'), 1000 + 31_000);
  const ok = c.state === 'closed' && c.failures === 0;
  if (!ok) unsafe++;
  scenarios.push({ id: 'half_open_success_closes', state: c.state, failures: c.failures, ok });
}

// 4. Half-open failure → open (reset cooldown)
{
  const c = makeCircuit();
  for (let i = 0; i < 5; i++) {
    try {
      await run(c, () => Promise.reject(new Error('x')), 1000 + i);
    } catch {}
  }
  const t1 = 1000 + 31_000;
  try {
    await run(c, () => Promise.reject(new Error('x')), t1);
  } catch {}
  const ok = c.state === 'open' && c.openedAt === t1;
  if (!ok) unsafe++;
  scenarios.push({ id: 'half_open_fail_reopens', state: c.state, openedAt: c.openedAt, ok });
}

// 5. Intermittent failures (reset on success)
{
  const c = makeCircuit();
  const pattern = [false, false, true, false, false, false, true, false, false];
  for (let i = 0; i < pattern.length; i++) {
    try {
      await run(
        c,
        () => (pattern[i] ? Promise.resolve('ok') : Promise.reject(new Error('x'))),
        1000 + i
      );
    } catch {}
  }
  const ok = c.state === 'closed'; // never reached 5 consecutive
  if (!ok) unsafe++;
  scenarios.push({ id: 'intermittent_never_opens', state: c.state, failures: c.failures, ok });
}

// 6. Burst then recovery cycles (100 cycles)
for (let cycle = 0; cycle < 100; cycle++) {
  const c = makeCircuit();
  for (let i = 0; i < 5; i++) {
    try {
      await run(c, () => Promise.reject(new Error('x')), 1000 + i);
    } catch {}
  }
  // wait past cooldown, probe success
  try {
    await run(c, () => Promise.resolve('ok'), 1000 + 31_000 + cycle);
  } catch {}
  const ok = c.state === 'closed' && c.failures === 0;
  if (!ok) unsafe++;
  scenarios.push({ id: `cycle_${cycle}`, ok });
}

// 7. Custom threshold/cooldown
{
  const c = makeCircuit({ failureThreshold: 2, cooldownMs: 5_000 });
  try {
    await run(c, () => Promise.reject(new Error('x')), 1000);
  } catch {}
  try {
    await run(c, () => Promise.reject(new Error('x')), 1001);
  } catch {}
  const opened = c.state === 'open';
  let fastFail = false;
  try {
    await run(c, () => Promise.resolve('ok'), 1002);
  } catch (e) {
    if (e.code === 'OPEN') fastFail = true;
  }
  let recovered = false;
  try {
    const r = await run(c, () => Promise.resolve('ok'), 1001 + 5_000);
    recovered = r === 'ok';
  } catch {}
  const ok = opened && fastFail && recovered;
  if (!ok) unsafe++;
  scenarios.push({ id: 'custom_opts', opened, fastFail, recovered, ok });
}

const summary = {
  total: scenarios.length,
  unsafe,
  passRate: `${(((scenarios.length - unsafe) / scenarios.length) * 100).toFixed(1)}%`,
};

const outJson = 'reports/simulations/wave23.json';
const outMd = 'reports/simulations/wave23.md';
mkdirSync(dirname(outJson), { recursive: true });
writeFileSync(outJson, JSON.stringify({ summary, scenarios }, null, 2));
writeFileSync(
  outMd,
  `# Wave 23 — Circuit Breaker Simulation\n\n- Total: ${summary.total}\n- Unsafe: ${summary.unsafe}\n- Pass rate: ${summary.passRate}\n\nCovers: threshold sweep, cooldown boundary, half-open success/failure, intermittent traffic, 100 recovery cycles, custom options.\n`
);
console.log(JSON.stringify(summary));
if (unsafe > 0) process.exit(1);
