#!/usr/bin/env node
/**
 * VISÃO - Mobile Nav Checklist
 *
 * Verifica se todas as páginas em src/pages/ incluem a classe `mb-mobile-nav`
 * para evitar sobreposição pela bottom navigation em dispositivos móveis.
 *
 * Allowlist: páginas legitimamente isentas (auth, 404, redirects).
 * Exit code 1 em caso de falha (quebra CI).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const PAGES_DIR = 'src/pages';
const REQUIRED_CLASS = 'mb-mobile-nav';

// Páginas isentas (sem bottom nav: auth, 404, redirects puros, telas standalone)
const ALLOWLIST = new Set([
  'AuthPage.tsx',
  'Auth.tsx',
  'AuthCallback.tsx',
  'ResetPasswordPage.tsx',
  'NotFound.tsx',
  'Index.tsx',
  'AcessoNegado.tsx',
]);

// Apenas arquivos no nível raiz de src/pages/ são páginas roteadas.
// Subdiretórios contêm subcomponentes (não páginas), portanto são ignorados.
function listPages(dir) {
  return readdirSync(dir)
    .filter((entry) => {
      const full = join(dir, entry);
      return statSync(full).isFile() && entry.endsWith('.tsx');
    })
    .map((entry) => join(dir, entry));
}

const files = listPages(PAGES_DIR);
const missing = [];
let okCount = 0;
let skipped = 0;

for (const file of files) {
  const basename = file.split(/[\\/]/).pop();
  if (ALLOWLIST.has(basename)) {
    skipped++;
    continue;
  }
  const content = readFileSync(file, 'utf8');
  if (content.includes(REQUIRED_CLASS)) {
    okCount++;
  } else {
    missing.push(relative(process.cwd(), file));
  }
}

console.log(`\n📐 Mobile Nav Checklist\n`);
console.log(`✅ ${okCount} páginas OK`);
console.log(`⊘  ${skipped} páginas isentas (allowlist)`);

if (missing.length > 0) {
  console.error(`\n❌ ${missing.length} página(s) sem \`${REQUIRED_CLASS}\`:`);
  for (const f of missing) console.error(`   - ${f}`);
  console.error(
    `\nAdicione \`${REQUIRED_CLASS}\` ao container raiz da página, ` +
    `ou inclua o arquivo na ALLOWLIST de scripts/check-mobile-nav.mjs se for legitimamente isento.\n`
  );
  process.exit(1);
}

console.log(`\n✨ Todas as páginas estão consistentes!\n`);
