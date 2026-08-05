#!/usr/bin/env node
/**
 * Onda 62 — Validador de allowlist CSP.
 *
 * Extrai todos os hosts externos (https://...) referenciados no código-fonte
 * e compara contra a allowlist declarada em `public/_headers` e no meta CSP
 * de `index.html`. Falha se qualquer host de código não estiver coberto.
 *
 * Ignora: hosts em comentários, docs (`docs/`, `*.md`), testes (`tests/`),
 * cypress, storybook, mocks e schemas OpenAPI.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IGNORE_HOSTS = new Set([
  'schema.org',
  'www.w3.org',
  'example.com',
  'localhost',
  'vis-o.app',
  'attentive-cam.lovable.app',
  'id-preview--76579cc3-ec2f-4e92-bdb3-20d12f2c763d.lovable.app',
  // Placeholder / documentação em strings de UI
  'servidor.com',
  'api.exemplo.com',
  'www.google.com',
  'github.com',
  't.me',
  'react.i18next.com',
  'wicg.github.io',
  'w3c.github.io',
  'test-streams.mux.dev',
  'developer.mozilla.org',
  'docs.lovable.dev',
]);
const IGNORE_DIRS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'tests',
  'cypress',
  'docs',
  'public',
  'reports',
  'supabase/functions',
  '.storybook',
  'scripts',
];
const HOST_RE = /https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // skip src/types (contém URLs de documentação em .d.ts)
    if (entry.name === 'types' && dir.endsWith('/src')) continue;
    if (IGNORE_DIRS.includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (
      /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) &&
      !/\.(test|spec|stories)\.(ts|tsx|js|jsx)$/.test(entry.name)
    )
      out.push(p);
  }
  return out;
}

function readAllowlist() {
  const headers = fs.readFileSync(path.join(ROOT, 'public/_headers'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const combined = headers + '\n' + html;
  const hosts = new Set();
  for (const m of combined.matchAll(/https?:\/\/(\*\.)?([a-z0-9.-]+\.[a-z]{2,})/gi)) {
    hosts.add((m[1] ? '*.' : '') + m[2]);
  }
  return hosts;
}

function hostAllowed(host, allowlist) {
  if (allowlist.has(host)) return true;
  const parts = host.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    if (allowlist.has('*.' + parts.slice(i).join('.'))) return true;
  }
  return false;
}

const files = walk(path.join(ROOT, 'src'));
const allowlist = readAllowlist();
const violations = new Map();

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(HOST_RE)) {
    const host = m[1].toLowerCase();
    if (IGNORE_HOSTS.has(host)) continue;
    if (hostAllowed(host, allowlist)) continue;
    if (!violations.has(host)) violations.set(host, []);
    violations.get(host).push(path.relative(ROOT, f));
  }
}

const report = {
  wave: 62,
  files_scanned: files.length,
  allowlist_size: allowlist.size,
  violations: Array.from(violations.entries()).map(([host, files]) => ({
    host,
    files: Array.from(new Set(files)).slice(0, 3),
  })),
  ok: violations.size === 0,
};
console.log(JSON.stringify(report, null, 2));
process.exit(violations.size === 0 ? 0 : 1);
