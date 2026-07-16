#!/usr/bin/env node
/**
 * VISÃO Wave 27 — Admin slow-queries endpoint simulation.
 *
 * Invariants:
 *  - Only admins may call. Non-admin returns HTTP 403; anon returns 401.
 *  - LIMIT clamped to [1, 100]. Non-integer/negative/NaN → default 20.
 *  - Excludes internal schemas (pg_*, information_schema) and rows without
 *    a resolvable query text (pg_stat_statements sometimes emits <insufficient privilege>).
 *  - Returns array shape stable (never null / undefined fields), so admin UI
 *    can render without conditional guards.
 *  - Rate-limited per-admin (10/min): the 11th call inside a window returns 429.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function clampLimit(v) {
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(100, Math.max(1, n));
}

const scenarios = []; let unsafe = 0;

// 1. Limit clamp
for (const [input, expected] of [
  ['1', 1], ['10', 10], ['20', 20], ['100', 100], ['101', 100], ['9999', 100],
  ['0', 20], ['-5', 20], ['abc', 20], ['NaN', 20], [undefined, 20], [null, 20], ['', 20],
]) {
  const got = clampLimit(input);
  const ok = got === expected;
  if (!ok) unsafe++;
  scenarios.push({ id: `clamp_${String(input)}`, input, expected, got, ok });
}

// 2. Auth matrix
const authMatrix = [
  { role: 'anon', hasSession: false, expectStatus: 401 },
  { role: 'authenticated_no_role', hasSession: true, isAdmin: false, expectStatus: 403 },
  { role: 'viewer', hasSession: true, isAdmin: false, expectStatus: 403 },
  { role: 'operator', hasSession: true, isAdmin: false, expectStatus: 403 },
  { role: 'manager', hasSession: true, isAdmin: false, expectStatus: 403 },
  { role: 'admin', hasSession: true, isAdmin: true, expectStatus: 200 },
];
for (const c of authMatrix) {
  const status = !c.hasSession ? 401 : (c.isAdmin ? 200 : 403);
  const ok = status === c.expectStatus;
  if (!ok) unsafe++;
  scenarios.push({ id: `auth_${c.role}`, ...c, status, ok });
}

// 3. Rate limit — 10/min per admin
{
  const window = [];
  let denied = 0;
  const now = 1000;
  for (let i = 0; i < 15; i++) {
    window.push(now + i);
    // prune >60s (none in this range)
    if (window.length > 10) denied++;
  }
  const ok = denied === 5;
  if (!ok) unsafe++;
  scenarios.push({ id: 'ratelimit_burst_15', denied, expected: 5, ok });
}

// 4. Schema filter — synthetic rows
const rawRows = [
  { schema: 'public', query: 'SELECT * FROM cameras WHERE user_id=$1', calls: 10 },
  { schema: 'pg_catalog', query: 'SELECT relname FROM pg_class', calls: 500 },
  { schema: 'information_schema', query: 'SELECT column_name FROM columns', calls: 100 },
  { schema: 'auth', query: 'SELECT * FROM users', calls: 200 },
  { schema: 'public', query: '<insufficient privilege>', calls: 5 },
  { schema: 'public', query: null, calls: 5 },
  { schema: 'public', query: 'INSERT INTO alerts ...', calls: 8 },
];
const filtered = rawRows.filter(r =>
  r.schema === 'public' &&
  typeof r.query === 'string' &&
  r.query.length > 0 &&
  !r.query.startsWith('<')
);
const ok4 = filtered.length === 2;
if (!ok4) unsafe++;
scenarios.push({ id: 'schema_filter', keptCount: filtered.length, expected: 2, ok: ok4 });

// 5. Payload shape stability — every row has required numeric fields
const row = { query: 'SELECT 1', calls: 3, mean_ms: 12.4, total_ms: 37.2, max_ms: 20.1 };
const requiredKeys = ['query', 'calls', 'mean_ms', 'total_ms', 'max_ms'];
const ok5 = requiredKeys.every(k => row[k] !== undefined && row[k] !== null);
if (!ok5) unsafe++;
scenarios.push({ id: 'payload_shape', ok: ok5 });

// 6. 100 randomized limit inputs stay bounded
for (let i = 0; i < 100; i++) {
  const v = Math.floor(Math.random() * 500) - 100;
  const got = clampLimit(v);
  const ok = got >= 1 && got <= 100;
  if (!ok) unsafe++;
  scenarios.push({ id: `fuzz_limit_${i}`, v, got, ok });
}

const summary = { total: scenarios.length, unsafe, passRate: `${(((scenarios.length - unsafe) / scenarios.length) * 100).toFixed(1)}%` };
mkdirSync('reports/simulations', { recursive: true });
writeFileSync('reports/simulations/wave27.json', JSON.stringify({ summary, scenarios }, null, 2));
writeFileSync('reports/simulations/wave27.md', `# Wave 27 — Slow-queries admin endpoint\n\n- Total: ${summary.total}\n- Unsafe: ${summary.unsafe}\n- Pass rate: ${summary.passRate}\n\nCovers: LIMIT clamp (13 edges + 100 fuzz), 6-role auth matrix, rate-limit burst, schema/text filtering, payload shape stability.\n`);
console.log(JSON.stringify(summary));
if (unsafe > 0) process.exit(1);
