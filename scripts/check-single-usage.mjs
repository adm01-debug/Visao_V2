#!/usr/bin/env node
/** VISÃO — Wave 13: audit .single() usage. Fails on pure SELECT + .single() (risk of PGRST116). */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry) && !p.includes('__tests__')) audit(p);
  }
}

function audit(file) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/\.single\(\)/.test(lines[i])) continue;
    // Look back up to 20 lines for insert/update/upsert on the same chain.
    // Objetos com muitos campos superam 8 linhas — ajuste de Wave 13.
    const window = lines.slice(Math.max(0, i - 20), i + 1).join('\n');
    const isWrite = /\.(insert|update|upsert|delete)\s*\(/.test(window);
    if (!isWrite) {
      offenders.push(`${file}:${i + 1}`);
    }
  }
}

walk(ROOT);
if (offenders.length) {
  console.error('❌ Pure SELECT + .single() detected (use .maybeSingle()):');
  offenders.forEach((o) => console.error('  ' + o));
  process.exit(1);
}
console.log('✅ No unsafe .single() usage on pure SELECT queries.');
