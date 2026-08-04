#!/usr/bin/env node
/**
 * Wave Fortress 3 — Gate CI: nenhum worker pode ler cameras.stream_url direto.
 * Allowlist: camera-credentials-vault e resolve-camera-url (donos legítimos do dado).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'supabase/functions';
const ALLOW = new Set(['camera-credentials-vault', 'resolve-camera-url']);
const PATTERN = /select\([^)]*\bstream_url\b/i;

const offenders = [];
function walk(dir, fnName) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, fnName ?? name);
    else if (/\.tsx?$/.test(name)) {
      const src = readFileSync(p, 'utf8');
      if (PATTERN.test(src) && !ALLOW.has(fnName)) offenders.push(`${p} (function: ${fnName})`);
    }
  }
}

for (const fn of readdirSync(ROOT)) {
  if (fn.startsWith('_') || fn === 'README.md') continue;
  const p = join(ROOT, fn);
  if (statSync(p).isDirectory()) walk(p, fn);
}

if (offenders.length) {
  console.error('❌ workers ainda leem cameras.stream_url diretamente:');
  offenders.forEach((o) => console.error('  -', o));
  console.error(
    '\nUse a edge function `resolve-camera-url` (service_role) para obter a URL rehidratada.'
  );
  process.exit(1);
}
console.log('✅ check-no-plain-rtsp: nenhum vazamento de stream_url em workers.');
