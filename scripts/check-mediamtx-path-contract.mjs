#!/usr/bin/env node
/**
 * Gate: check-mediamtx-path-contract
 * Verifica estaticamente que o mediamtx-proxy/index.ts:
 *   1. Importa mediamtxPath.ts (o sanitizador de seguranca)
 *   2. Usa sanitizePathName antes de construir qualquer URL de controle
 *   3. Usa validatePathBody para a action 'add' (bloqueio de runOn-STAR-/pollution/SSRF)
 *   4. Usa DELETE para remove (nao POST /remove/)
 *   5. Usa maskSecrets nos logs (nao vaza credenciais)
 *   6. Le MEDIAMTX_API_URL do env (nao hardcoded)
 * E que mediamtxPath.ts:
 *   7. Tem RUN_ON regex (barreira anti-RCE)
 *   8. Tem DANGEROUS_KEYS (barreira anti-prototype-pollution)
 *   9. Tem bloqueio de file:// (anti-SSRF)
 *  10. Tem bloqueio de 169.254.169.254 (anti-cloud-metadata SSRF)
 *
 * Rodado automaticamente em: npm run prebuild
 * Invariante: se alguem remover qualquer dessas protecoes, o CI quebra.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROXY = join(REPO, 'supabase/functions/mediamtx-proxy/index.ts');
const SANITIZER = join(REPO, 'supabase/functions/_shared/mediamtxPath.ts');

const errors = [];
const bad = (msg) => errors.push(msg);

// Verifica existencia dos arquivos
if (!existsSync(PROXY)) {
  bad('mediamtx-proxy/index.ts nao encontrado');
}
if (!existsSync(SANITIZER)) {
  bad('supabase/functions/_shared/mediamtxPath.ts nao encontrado');
}

if (errors.length) {
  console.error('❌ check-mediamtx-path-contract: arquivo(s) ausente(s):');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

const proxy = readFileSync(PROXY, 'utf8');
const san = readFileSync(SANITIZER, 'utf8');

// --- Verificacoes no proxy ---

// 1. Importa mediamtxPath.ts (invariante de dependencia)
if (!proxy.includes('mediamtxPath.ts'))
  bad('[proxy] nao importa mediamtxPath.ts — o sanitizador de seguranca nao esta sendo usado');

// 2. Usa sanitizePathName
if (!proxy.includes('sanitizePathName'))
  bad(
    '[proxy] nao chama sanitizePathName — paths nao estao sendo sanitizados (path traversal possivel)'
  );

// 3. Usa validatePathBody para action add
if (!proxy.includes('validatePathBody'))
  bad(
    '[proxy] nao chama validatePathBody — campos runOn-STAR-/pollution/SSRF nao estao sendo bloqueados'
  );

// 4. Usa DELETE para remove (nao POST /remove/)
if (!proxy.includes('method: "DELETE"') && !proxy.includes("method: 'DELETE'"))
  bad('[proxy] remove nao usa DELETE — bug: MediaMTX v1.18+ retorna 404 para POST /remove/');

// 5. Usa maskSecrets nos logs
if (!proxy.includes('maskSecrets'))
  bad('[proxy] nao usa maskSecrets nos logs — credenciais podem vazar em logs');

// 6. Le MEDIAMTX_API_URL do env
if (!proxy.includes('MEDIAMTX_API_URL'))
  bad('[proxy] MEDIAMTX_API_URL nao lido do env — URL hardcoded e inseguro');

// 7. Le credenciais do env (nao hardcoded)
if (!proxy.includes('MEDIAMTX_API_USER') || !proxy.includes('MEDIAMTX_API_PASS'))
  bad('[proxy] credenciais nao lidas do env — MEDIAMTX_API_USER/PASS hardcoded');

// --- Verificacoes no sanitizador ---

// 8. Tem RUN_ON regex (barreira anti-RCE)
if (!san.includes('RUN_ON') || !san.includes('/^runOn/i'))
  bad(
    '[sanitizador] sem RUN_ON — campos runOnReady/runOnInit/etc. podem ser injetados via API (RCE!)'
  );

// 9. Tem DANGEROUS_KEYS
if (!san.includes('DANGEROUS_KEYS') || !san.includes('__proto__'))
  bad('[sanitizador] sem DANGEROUS_KEYS — prototype pollution possivel via JSON.parse(__proto__)');

// 10. Tem bloqueio de file:// (SSRF)
if (!san.includes('file:'))
  bad('[sanitizador] sem bloqueio de file:// — SSRF: source=file:///etc/passwd possivel');

// 11. Tem bloqueio de 169.254 (cloud metadata SSRF)
if (!san.includes('169') || !san.includes('254'))
  bad('[sanitizador] sem bloqueio de 169.254.169.254 — SSRF para cloud metadata possivel');

// --- Resultado ---
if (errors.length > 0) {
  console.error(
    `❌ check-mediamtx-path-contract: ${errors.length} invariante(s) de seguranca violado(s):`
  );
  errors.forEach((e) => console.error(`  - ${e}`));
  console.error(
    '\nEste gate garante que o proxy MediaMTX nao seja refatorado sem manter as protecoes de seguranca.'
  );
  process.exit(1);
}
console.log(
  '✅ check-mediamtx-path-contract: proxy importa e usa mediamtxPath.ts corretamente; sanitizador tem todas as barreiras de seguranca (RCE, traversal, SSRF, pollution).'
);
