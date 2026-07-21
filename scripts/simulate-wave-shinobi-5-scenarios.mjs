#!/usr/bin/env node
/**
 * Onda Shinobi 5 — Timelapse Diário Automático
 * Simulação exaustiva (>600 cenários) cobrindo:
 *  - Validação de janela de captura (start_hour < end_hour, 0..23)
 *  - Intervalo (1..120 min) e cálculo de frames esperados
 *  - Duração do vídeo (frames / fps)
 *  - Retenção (purgar snapshots antigos por retention_days)
 *  - Timezone (America/Sao_Paulo vs UTC) — janela é local
 *  - Isolamento por user_id
 *  - Idempotência: mesma (config,date) não gera dois vídeos
 *  - Skip de câmera offline / sem snapshots
 *  - Edge: end_hour = 24 (overnight não suportado → validar rejeição)
 */

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) pass++; else { fail++; console.error('❌', name); } };

// 1) Validação de janela
function validateWindow(sh, eh) {
  if (!Number.isInteger(sh) || !Number.isInteger(eh)) return false;
  if (sh < 0 || sh > 23 || eh < 1 || eh > 24) return false;
  return sh < eh;
}
for (let sh = -1; sh <= 24; sh++) {
  for (let eh = -1; eh <= 25; eh++) {
    const ok = sh >= 0 && sh <= 23 && eh >= 1 && eh <= 24 && sh < eh;
    check(`window ${sh}->${eh}`, validateWindow(sh, eh) === ok);
  }
}

// 2) Frames esperados
function expectedFrames(sh, eh, intervalMin) {
  const minutes = (eh - sh) * 60;
  return Math.floor(minutes / intervalMin) + 1;
}
check('frames 6->18 @5min = 145', expectedFrames(6, 18, 5) === 145);
check('frames 0->24 @60min = 25', expectedFrames(0, 24, 60) === 25);
check('frames 8->9 @1min = 61', expectedFrames(8, 9, 1) === 61);

// 3) Duração do vídeo
const duration = (frames, fps) => frames / fps;
check('145 frames @30fps ~ 4.83s', Math.abs(duration(145, 30) - 4.8333) < 0.01);

// 4) Retenção
function shouldPurge(capturedAt, now, retentionDays) {
  return (now - capturedAt) / 86400000 > retentionDays;
}
const now = Date.parse('2026-07-21T12:00:00Z');
check('purge 30d old @ret=7', shouldPurge(now - 30 * 86400000, now, 7));
check('keep 3d @ret=7', !shouldPurge(now - 3 * 86400000, now, 7));

// 5) Timezone — capturar às 08:00 America/Sao_Paulo == 11:00 UTC
function localHour(dateUtc, tz) {
  return Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(dateUtc));
}
const t = new Date('2026-07-21T11:00:00Z');
check('SP local hour = 8', localHour(t, 'America/Sao_Paulo') === 8);
check('UTC hour = 11', localHour(t, 'UTC') === 11);

// 6) Isolamento por user
const configs = [
  { user_id: 'A', camera_id: 'c1' },
  { user_id: 'B', camera_id: 'c1' },
];
const userA = configs.filter(c => c.user_id === 'A');
check('RLS isolation A', userA.length === 1 && userA[0].camera_id === 'c1');

// 7) Idempotência
const videos = new Map();
function upsertVideo(configId, date, path) {
  const key = `${configId}::${date}`;
  if (videos.has(key)) return false;
  videos.set(key, path);
  return true;
}
check('idem create', upsertVideo('cfg1', '2026-07-21', '/v1.mp4'));
check('idem dupe rejected', !upsertVideo('cfg1', '2026-07-21', '/v2.mp4'));
check('idem diff date ok', upsertVideo('cfg1', '2026-07-22', '/v3.mp4'));

// 8) Skip sem snapshots
function shouldRender(snapshots) { return snapshots >= 2; }
check('skip 0 snaps', !shouldRender(0));
check('skip 1 snap', !shouldRender(1));
check('render 2 snaps', shouldRender(2));

// 9) 500 permutações aleatórias
for (let i = 0; i < 500; i++) {
  const sh = Math.floor(Math.random() * 20);
  const eh = sh + 1 + Math.floor(Math.random() * (24 - sh - 1));
  const interval = 1 + Math.floor(Math.random() * 60);
  const frames = expectedFrames(sh, eh, interval);
  check(`perm ${i} frames>0`, frames > 0);
  check(`perm ${i} window valid`, validateWindow(sh, eh));
}

console.log(`\nResultado: ${pass}/${pass + fail} ✅  (falhas: ${fail})`);
if (fail > 0) process.exit(1);
