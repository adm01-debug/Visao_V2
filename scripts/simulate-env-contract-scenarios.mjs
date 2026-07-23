#!/usr/bin/env node
/**
 * Simulação de cenários — gate scripts/check-env-contract.mjs.
 *
 * Gera um workspace temporário com .env* + src/ fictícios e roda o gate real
 * contra ele, afirmando exit 0 (contrato ok) ou exit 1 (violação) por cenário.
 * Serve de regressão permanente: se alguém enfraquecer o gate, isto quebra.
 *
 * Uso: node scripts/simulate-env-contract-scenarios.mjs
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const GATE = join(dirname(fileURLToPath(import.meta.url)), 'check-env-contract.mjs');

// ── Baseline coerente com o contrato real ─────────────────────────────────
const BASE = {
  '.env.example': [
    'VITE_SUPABASE_URL="https://x.supabase.co"',
    'VITE_SUPABASE_PUBLISHABLE_KEY="k"',
    'VITE_SUPABASE_PROJECT_ID="pid"',
    'VITE_MEDIAMTX_HLS_URL="https://s/hls"',
    'VITE_MEDIAMTX_WEBRTC_URL="https://s/webrtc"',
    'VITE_MEDIAMTX_RTSP_URL="rtsp://s:8554"',
  ].join('\n'),
  '.env.development': [
    'VITE_MEDIAMTX_HLS_URL=http://localhost:8888',
    'VITE_MEDIAMTX_WEBRTC_URL=http://localhost:8889',
    'VITE_MEDIAMTX_RTSP_URL=rtsp://localhost:8554',
    'VITE_ENABLE_DEVTOOLS=true',
  ].join('\n'),
  '.env.production': [
    'VITE_SUPABASE_URL=https://x.supabase.co',
    'VITE_SUPABASE_PUBLISHABLE_KEY=',
    'VITE_SUPABASE_PROJECT_ID=pid',
    'VITE_MEDIAMTX_HLS_URL=https://s/hls',
    'VITE_MEDIAMTX_WEBRTC_URL=https://s/webrtc',
    'VITE_MEDIAMTX_RTSP_URL=rtsp://s:8554',
  ].join('\n'),
  'src/hooks/useMediaMTX.ts':
    'const a=import.meta.env.VITE_MEDIAMTX_HLS_URL;const b=import.meta.env.VITE_MEDIAMTX_WEBRTC_URL;' +
    'const c=import.meta.env.VITE_MEDIAMTX_RTSP_URL;export{a,b,c};',
  'src/lib/supa.ts':
    'export const u=import.meta.env.VITE_SUPABASE_URL;export const k=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;',
};

/** Materializa BASE + overrides num diretório; retorna o path. */
function makeWorkspace(overrides = {}, removals = []) {
  const dir = mkdtempSync(join(tmpdir(), 'envgate-'));
  const files = { ...BASE, ...overrides };
  for (const rel of removals) delete files[rel];
  for (const [rel, content] of Object.entries(files)) {
    const p = join(dir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  return dir;
}

/** Roda o gate com cwd=dir; retorna o exit code. */
function runGate(dir) {
  const r = spawnSync(process.execPath, [GATE], { cwd: dir, encoding: 'utf8' });
  return r.status;
}

// ── Cenários ───────────────────────────────────────────────────────────────
const scenarios = [
  {
    name: 'baseline coerente → passa',
    expect: 0,
    build: () => makeWorkspace(),
  },
  {
    name: 'prod sem VITE_MEDIAMTX_RTSP_URL (o bug original) → falha',
    expect: 1,
    build: () =>
      makeWorkspace({
        '.env.production':
          'VITE_SUPABASE_URL=https://x.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=\nVITE_SUPABASE_PROJECT_ID=pid\n' +
          'VITE_MEDIAMTX_HLS_URL=https://s/hls\nVITE_MEDIAMTX_WEBRTC_URL=https://s/webrtc',
      }),
  },
  {
    name: 'src lê VITE_MEDIAMTX_FOO fora do contrato → falha',
    expect: 1,
    build: () =>
      makeWorkspace({
        'src/x.ts': 'const z=import.meta.env.VITE_MEDIAMTX_FOO;export{z};',
      }),
  },
  {
    name: 'src lê VITE_SUPABASE_ANON_KEY legado → falha (supabase governado)',
    expect: 1,
    build: () =>
      makeWorkspace({
        'src/y.ts': 'const z=import.meta.env.VITE_SUPABASE_ANON_KEY;export{z};',
      }),
  },
  {
    name: 'trio declarado mas RTSP não lido em src (órfão) → falha',
    expect: 1,
    build: () =>
      makeWorkspace({
        'src/hooks/useMediaMTX.ts':
          'const a=import.meta.env.VITE_MEDIAMTX_HLS_URL;const b=import.meta.env.VITE_MEDIAMTX_WEBRTC_URL;export{a,b};',
      }),
  },
  {
    name: 'supabase ausente em production → falha (presença)',
    expect: 1,
    build: () =>
      makeWorkspace({
        '.env.production':
          'VITE_SUPABASE_URL=https://x.supabase.co\n' +
          'VITE_MEDIAMTX_HLS_URL=https://s/hls\nVITE_MEDIAMTX_WEBRTC_URL=https://s/webrtc\nVITE_MEDIAMTX_RTSP_URL=rtsp://s:8554',
      }),
  },
  {
    name: '.env.production ausente → falha',
    expect: 1,
    build: () => makeWorkspace({}, ['.env.production']),
  },
  {
    name: '.env.local.example com VITE_MEDIAMTX_URL (nome errado) → falha em qualquer .env*',
    expect: 1,
    build: () =>
      makeWorkspace({
        '.env.local.example':
          'VITE_SUPABASE_URL=http://localhost:54321\nVITE_SUPABASE_PUBLISHABLE_KEY=k\nVITE_MEDIAMTX_URL=http://localhost:8889',
      }),
  },
  {
    name: '.env.test com VITE_SUPABASE_ANON_KEY legado → falha em qualquer .env*',
    expect: 1,
    build: () =>
      makeWorkspace({
        '.env.test': 'VITE_SUPABASE_URL=http://localhost:54321\nVITE_SUPABASE_ANON_KEY=test',
      }),
  },
  {
    name: 'flags dev-only (devtools/log) não disparam falso-positivo → passa',
    expect: 0,
    build: () =>
      makeWorkspace({
        '.env.development':
          'VITE_MEDIAMTX_HLS_URL=http://localhost:8888\nVITE_MEDIAMTX_WEBRTC_URL=http://localhost:8889\n' +
          'VITE_MEDIAMTX_RTSP_URL=rtsp://localhost:8554\nVITE_ENABLE_DEVTOOLS=true\nVITE_LOG_LEVEL=debug\nVITE_ENABLE_MOCK_DATA=true',
      }),
  },
];

// ── Execução ─────────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
const dirs = [];
for (const s of scenarios) {
  const dir = s.build();
  dirs.push(dir);
  const code = runGate(dir);
  const ok = code === s.expect;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? '✅' : '❌'} [exit ${code}, esperado ${s.expect}] ${s.name}`);
}
for (const d of dirs) rmSync(d, { recursive: true, force: true });

console.log(`\nResultado: ${pass} passaram, ${fail} falharam (de ${scenarios.length} cenários).`);
if (fail > 0) {
  console.error('❌ simulate-env-contract: o gate não se comportou como esperado — regressão.');
  process.exit(1);
}
console.log('✅ simulate-env-contract: todos os cenários confirmam o comportamento do gate.');
