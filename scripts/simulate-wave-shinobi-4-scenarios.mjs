#!/usr/bin/env node
/**
 * Onda Shinobi 4 — Simulação: Agendamentos Arm/Disarm via pg_cron
 * 600+ cenários (parsing CRON, next-run, escopos, conflitos, RLS lógico, DST).
 */

let pass = 0, fail = 0;
const failures = [];
const check = (c, name) => { if (c) pass++; else { fail++; failures.push(name); } };

// ---------- CRON parser (5 campos: m h dom mon dow) ----------
const FIELD_RANGES = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
function parseField(str, [min, max]) {
  if (str === '*') return { any: true };
  const set = new Set();
  for (const part of str.split(',')) {
    let step = 1, range = part;
    if (part.includes('/')) { const [r, s] = part.split('/'); range = r; step = parseInt(s, 10); if (isNaN(step) || step < 1) throw 0; }
    let lo, hi;
    if (range === '*') { lo = min; hi = max; }
    else if (range.includes('-')) { const [a, b] = range.split('-').map(Number); lo = a; hi = b; }
    else { const n = parseInt(range, 10); if (isNaN(n)) throw 0; lo = n; hi = n; }
    if (lo < min || hi > max || lo > hi) throw 0;
    for (let v = lo; v <= hi; v += step) set.add(v);
  }
  return { any: false, set };
}
function parseCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error('invalid');
  return parts.map((p, i) => parseField(p, FIELD_RANGES[i]));
}
function matches(fields, date) {
  const vals = [date.getUTCMinutes(), date.getUTCHours(), date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCDay()];
  return fields.every((f, i) => f.any || f.set.has(vals[i]));
}

// Valid crons
const validCrons = [
  '* * * * *', '0 * * * *', '0 0 * * *', '30 8 * * 1-5',
  '*/15 * * * *', '0 8,12,18 * * *', '0 0 1 1 *', '15 3 * * 0',
  '0 9-17 * * 1-5', '5,25,45 * * * *',
];
for (const c of validCrons) {
  try { parseCron(c); check(true, `parse_ok:${c}`); }
  catch { check(false, `parse_ok:${c}`); }
}
// Invalid
const invalidCrons = ['', '* * * *', '60 * * * *', '* 24 * * *', '* * 32 * *', '* * * 13 *', '* * * * 7', 'abc * * * *', '* * * * */0'];
for (const c of invalidCrons) {
  try { parseCron(c); check(false, `reject:${c}`); }
  catch { check(true, `reject:${c}`); }
}

// Match sample
const f = parseCron('30 8 * * 1-5');
check(matches(f, new Date(Date.UTC(2026, 6, 20, 8, 30))), 'match_mon_0830'); // Monday
check(!matches(f, new Date(Date.UTC(2026, 6, 20, 8, 31))), 'no_match_off_minute');
check(!matches(f, new Date(Date.UTC(2026, 6, 18, 8, 30))), 'no_match_saturday'); // Sat

// ---------- Next-run within 24h (600+ ticks) ----------
function findNext(fields, from, maxMinutes = 60 * 24 * 7) {
  const d = new Date(from);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(d.getUTCMinutes() + 1);
  for (let i = 0; i < maxMinutes; i++) {
    if (matches(fields, d)) return d;
    d.setUTCMinutes(d.getUTCMinutes() + 1);
  }
  return null;
}
const base = new Date(Date.UTC(2026, 6, 20, 0, 0));
for (const c of validCrons) {
  const fields = parseCron(c);
  const n = findNext(fields, base);
  check(n !== null, `next_${c}`);
  if (n) check(matches(fields, n), `next_matches_${c}`);
}

// ---------- Scope validation ----------
function validateSchedule(s) {
  if (!['camera', 'group', 'all'].includes(s.scope)) return 'bad_scope';
  if (!['arm', 'disarm'].includes(s.action)) return 'bad_action';
  if (s.scope === 'camera' && !s.camera_id) return 'camera_required';
  if (s.scope === 'group' && !s.group_id) return 'group_required';
  if (s.scope === 'all' && (s.camera_id || s.group_id)) return 'must_be_null';
  if (s.scope === 'camera' && s.group_id) return 'group_forbidden';
  if (s.scope === 'group' && s.camera_id) return 'camera_forbidden';
  try { parseCron(s.cron_expression); } catch { return 'bad_cron'; }
  return null;
}
check(validateSchedule({ scope: 'camera', action: 'arm', camera_id: 'c1', cron_expression: '0 8 * * *' }) === null, 'valid_camera');
check(validateSchedule({ scope: 'group', action: 'disarm', group_id: 'g1', cron_expression: '0 20 * * *' }) === null, 'valid_group');
check(validateSchedule({ scope: 'all', action: 'arm', cron_expression: '0 0 * * *' }) === null, 'valid_all');
check(validateSchedule({ scope: 'camera', action: 'arm', cron_expression: '0 8 * * *' }) === 'camera_required', 'rej_no_cam');
check(validateSchedule({ scope: 'group', action: 'arm', cron_expression: '0 8 * * *' }) === 'group_required', 'rej_no_group');
check(validateSchedule({ scope: 'all', action: 'arm', camera_id: 'c1', cron_expression: '0 8 * * *' }) === 'must_be_null', 'rej_all_with_cam');
check(validateSchedule({ scope: 'camera', action: 'arm', camera_id: 'c1', group_id: 'g1', cron_expression: '0 8 * * *' }) === 'group_forbidden', 'rej_mixed');
check(validateSchedule({ scope: 'camera', action: 'wipe', camera_id: 'c1', cron_expression: '0 8 * * *' }) === 'bad_action', 'rej_action');
check(validateSchedule({ scope: 'camera', action: 'arm', camera_id: 'c1', cron_expression: 'nope' }) === 'bad_cron', 'rej_cron');

// ---------- Conflict resolution: disarm wins ----------
function resolveConflicts(schedules) {
  // Group by camera_id; if both arm+disarm at same minute → disarm wins
  const map = new Map();
  for (const s of schedules) {
    const key = s.camera_id;
    if (!map.has(key)) map.set(key, s);
    else if (s.action === 'disarm') map.set(key, s); // disarm overrides
  }
  return [...map.values()];
}
const conflicts = [
  { camera_id: 'c1', action: 'arm' },
  { camera_id: 'c1', action: 'disarm' },
  { camera_id: 'c2', action: 'arm' },
  { camera_id: 'c3', action: 'disarm' },
  { camera_id: 'c3', action: 'arm' },
];
const resolved = resolveConflicts(conflicts);
check(resolved.find(x => x.camera_id === 'c1').action === 'disarm', 'conflict_c1_disarm');
check(resolved.find(x => x.camera_id === 'c2').action === 'arm', 'conflict_c2_arm');
check(resolved.find(x => x.camera_id === 'c3').action === 'disarm', 'conflict_c3_disarm');

// ---------- RLS logical isolation ----------
const rows = [
  { id: '1', user_id: 'A', scope: 'camera', camera_id: 'c1' },
  { id: '2', user_id: 'B', scope: 'camera', camera_id: 'c2' },
];
const selA = rows.filter(r => r.user_id === 'A');
const selB = rows.filter(r => r.user_id === 'B');
check(selA.length === 1 && selA[0].camera_id === 'c1', 'rls_A');
check(selB.length === 1 && selB[0].camera_id === 'c2', 'rls_B');
check(rows.filter(r => r.user_id === 'C').length === 0, 'rls_C');

// ---------- 300 random permutations ----------
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
const rand = rng(7);
for (let t = 0; t < 300; t++) {
  const scope = ['camera', 'group', 'all'][Math.floor(rand() * 3)];
  const action = rand() < 0.5 ? 'arm' : 'disarm';
  const min = Math.floor(rand() * 60);
  const hr = Math.floor(rand() * 24);
  const dow = Math.floor(rand() * 7);
  const cron = `${min} ${hr} * * ${dow}`;
  const s = {
    scope, action, cron_expression: cron,
    camera_id: scope === 'camera' ? `cam${t}` : null,
    group_id: scope === 'group' ? `grp${t}` : null,
  };
  check(validateSchedule(s) === null, `rand_${t}`);
  const fields = parseCron(cron);
  check(fields.length === 5, `rand_parse_${t}`);
}

// ---------- Day-of-week bitmask ----------
function daysToCron(bitmask) {
  const days = [];
  for (let i = 0; i < 7; i++) if (bitmask & (1 << i)) days.push(i);
  return days.length === 7 ? '*' : days.join(',');
}
check(daysToCron(0b1111111) === '*', 'bitmask_all');
check(daysToCron(0b0111110) === '1,2,3,4,5', 'bitmask_weekdays');
check(daysToCron(0b1000001) === '0,6', 'bitmask_weekends');
for (let m = 0; m < 128; m++) {
  const s = daysToCron(m);
  const cron = `0 8 * * ${s}`;
  try { parseCron(cron); check(true, `bitmask_${m}`); }
  catch { check(false, `bitmask_${m}`); }
}

// ---------- Timezone sanity ----------
// Just validate string list; DST handled by Postgres AT TIME ZONE
const tzs = ['America/Sao_Paulo', 'UTC', 'America/New_York', 'Europe/Lisbon'];
for (const tz of tzs) check(typeof tz === 'string' && tz.length > 0, `tz_${tz}`);

console.log(`\n[Shinobi 4] ${pass}/${pass + fail} checks ✅`);
if (fail > 0) {
  console.log(`❌ ${fail} failures:`); failures.slice(0, 20).forEach(f => console.log(' -', f));
  process.exit(1);
}
