#!/usr/bin/env node
/**
 * Onda Shinobi 7 — Auto-restart de streams RTSP degradados
 * Simulação: janela deslizante de health, cooldown, backoff exponencial,
 * dedup de restart em vôo, isolamento por user.
 */
let pass = 0, fail = 0;
const check = (n, c) => { if (c) pass++; else { fail++; console.error('❌', n); } };

// Janela deslizante: últimos N checks, N/2 falhos → unhealthy
function isUnhealthy(checks, windowSize = 6, threshold = 3) {
  const w = checks.slice(-windowSize);
  const fails = w.filter(c => c === 'fail').length;
  return w.length >= windowSize && fails >= threshold;
}
check('all ok', !isUnhealthy(Array(10).fill('ok')));
check('all fail', isUnhealthy(Array(10).fill('fail')));
check('3/6 fail → unhealthy', isUnhealthy(['ok','fail','ok','fail','ok','fail']));
check('2/6 fail → healthy', !isUnhealthy(['ok','fail','ok','fail','ok','ok']));
check('window not full', !isUnhealthy(['fail','fail']));

// Backoff exponencial: attempt N → 2^N * base minutos, cap 60
function backoffMinutes(attempt, base = 1, cap = 60) {
  return Math.min(cap, base * Math.pow(2, Math.max(0, attempt)));
}
check('att 0 = 1min', backoffMinutes(0) === 1);
check('att 3 = 8min', backoffMinutes(3) === 8);
check('att 10 capped', backoffMinutes(10) === 60);

// Cooldown: novo restart só se now - last_restart >= backoff
function canRestart(now, lastRestartTs, attempt) {
  if (!lastRestartTs) return true;
  const wait = backoffMinutes(attempt) * 60_000;
  return (now - lastRestartTs) >= wait;
}
const NOW = Date.parse('2026-07-21T20:00:00Z');
check('never restarted', canRestart(NOW, null, 0));
check('1min wait not met', !canRestart(NOW, NOW - 30_000, 0));
check('1min wait met', canRestart(NOW, NOW - 61_000, 0));
check('8min wait respect', !canRestart(NOW, NOW - 5*60_000, 3));

// Dedup restart em vôo
const inflight = new Set();
function scheduleRestart(cameraId) {
  if (inflight.has(cameraId)) return false;
  inflight.add(cameraId);
  return true;
}
check('first restart ok', scheduleRestart('c1'));
check('dupe restart rejected', !scheduleRestart('c1'));
check('other camera ok', scheduleRestart('c2'));

// Isolamento por user_id
const rows = [
  { user_id: 'A', camera_id: 'c1' },
  { user_id: 'B', camera_id: 'c1' },
];
check('user A filter', rows.filter(r => r.user_id === 'A').length === 1);

// 500 permutações aleatórias
for (let i = 0; i < 500; i++) {
  const seq = Array.from({ length: 6 + Math.floor(Math.random() * 10) }, () => (Math.random() < 0.5 ? 'ok' : 'fail'));
  const unh = isUnhealthy(seq);
  const fails = seq.slice(-6).filter(x => x === 'fail').length;
  check(`perm ${i} consistency`, unh === (seq.length >= 6 && fails >= 3));
  const att = Math.floor(Math.random() * 12);
  const back = backoffMinutes(att);
  check(`perm ${i} backoff bounded`, back >= 1 && back <= 60);
}

// Reset após sucesso: attempt volta pra 0
function resetAttemptOnSuccess(lastStatus, attempt) {
  return lastStatus === 'ok' ? 0 : attempt;
}
check('reset on ok', resetAttemptOnSuccess('ok', 5) === 0);
check('keep on fail', resetAttemptOnSuccess('fail', 5) === 5);

console.log(`\nResultado: ${pass}/${pass + fail} ✅  (falhas: ${fail})`);
if (fail > 0) process.exit(1);
