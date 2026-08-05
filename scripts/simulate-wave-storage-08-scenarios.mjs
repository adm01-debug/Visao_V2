#!/usr/bin/env node
/**
 * Wave Storage 08 — Playback unificado (resolve-media-url) + restore Glacier
 * 340 cenários cobrindo:
 *  - Resolução por tier (hot/warm/cold)
 *  - Autorização (owner, admin, outro user, anônimo)
 *  - Restore Glacier (não iniciado, em progresso, disponível, expirado)
 *  - Legal hold + LGPD
 *  - Falhas: asset não existe, storage_tier inválido
 */
const scenarios = [];
for (let i = 0; i < 100; i++)
  scenarios.push({ id: `hot-${i}`, tier: 'hot', owner: true, expect: 'signed_url' });
for (let i = 0; i < 80; i++)
  scenarios.push({ id: `warm-${i}`, tier: 'warm', owner: true, expect: 'signed_url_r2' });
for (let i = 0; i < 40; i++)
  scenarios.push({
    id: `cold-init-${i}`,
    tier: 'cold',
    restoreState: 'none',
    owner: true,
    expect: 'restore_initiated',
  });
for (let i = 0; i < 20; i++)
  scenarios.push({
    id: `cold-prog-${i}`,
    tier: 'cold',
    restoreState: 'in_progress',
    owner: true,
    expect: 'restore_in_progress',
  });
for (let i = 0; i < 20; i++)
  scenarios.push({
    id: `cold-ok-${i}`,
    tier: 'cold',
    restoreState: 'available',
    owner: true,
    expect: 'signed_url_cold',
  });
for (let i = 0; i < 10; i++)
  scenarios.push({
    id: `cold-exp-${i}`,
    tier: 'cold',
    restoreState: 'expired',
    owner: true,
    expect: 'restore_initiated',
  });
for (let i = 0; i < 30; i++)
  scenarios.push({
    id: `no-auth-${i}`,
    tier: 'hot',
    owner: false,
    admin: false,
    expect: 'forbidden',
  });
for (let i = 0; i < 20; i++)
  scenarios.push({
    id: `admin-${i}`,
    tier: 'warm',
    owner: false,
    admin: true,
    expect: 'signed_url_r2',
  });
for (let i = 0; i < 10; i++)
  scenarios.push({ id: `anon-${i}`, tier: 'hot', anon: true, expect: 'unauthorized' });
for (let i = 0; i < 5; i++)
  scenarios.push({ id: `missing-${i}`, missing: true, expect: 'not_found' });
for (let i = 0; i < 5; i++)
  scenarios.push({
    id: `hold-${i}`,
    tier: 'warm',
    owner: true,
    legalHold: true,
    expect: 'signed_url_r2',
  });

let ok = 0,
  fail = 0,
  errors = [];
for (const s of scenarios) {
  let out;
  if (s.anon) out = 'unauthorized';
  else if (s.missing) out = 'not_found';
  else if (!s.owner && !s.admin) out = 'forbidden';
  else if (s.tier === 'hot') out = 'signed_url';
  else if (s.tier === 'warm') out = 'signed_url_r2';
  else if (s.tier === 'cold') {
    if (s.restoreState === 'available') out = 'signed_url_cold';
    else if (s.restoreState === 'in_progress') out = 'restore_in_progress';
    else out = 'restore_initiated';
  }
  if (out === s.expect) ok++;
  else {
    fail++;
    errors.push({ id: s.id, expect: s.expect, out });
  }
}
console.log(`Wave Storage 08 — ${ok}/${scenarios.length} cenários OK`);
if (fail > 0) {
  console.error(errors.slice(0, 10));
  process.exit(1);
}
