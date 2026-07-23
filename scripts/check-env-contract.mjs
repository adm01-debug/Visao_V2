#!/usr/bin/env node
/**
 * Gate CI — contrato de variáveis de ambiente (VITE_*).
 *
 * Contexto: o build de produção já saiu com `localhost:8888` cravado porque as
 * VITE_MEDIAMTX_* estavam AUSENTES do .env.production (divergência dev↔prod).
 * Este gate trava esse contrato para que a regressão não volte.
 *
 * Não exige que TODA VITE_ exista em TODO .env (os arquivos têm flags
 * legitimamente específicas de ambiente — devtools, mock-data, error-tracking).
 * Trava apenas os contratos de runtime que precisam ser consistentes:
 *
 *   A) STREAMING (VITE_MEDIAMTX_*): os mesmos nomes em .env.example,
 *      .env.development e .env.production. É o contrato que useMediaMTX.ts lê.
 *   B) SUPABASE (VITE_SUPABASE_*): presentes em .env.production e .env.example
 *      (o build de produção não sobe sem eles; dev usa .env.local).
 *   C) CÓDIGO↔CONTRATO: todo `import.meta.env.VITE_MEDIAMTX_*`/`VITE_SUPABASE_*`
 *      lido em src/ tem de estar no contrato — e todo nome do contrato de
 *      streaming tem de ser efetivamente consumido (sem órfãos).
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src';

// ── Contrato declarado ────────────────────────────────────────────────────
// Cada grupo lista as vars e em quais .env elas SÃO OBRIGATÓRIAS.
const CONTRACT = [
  {
    group: 'streaming',
    prefix: /^VITE_MEDIAMTX_/,
    vars: ['VITE_MEDIAMTX_HLS_URL', 'VITE_MEDIAMTX_WEBRTC_URL', 'VITE_MEDIAMTX_RTSP_URL'],
    requiredIn: ['.env.example', '.env.development', '.env.production'],
    mustBeUsed: true, // cada var precisa ser lida em src/ (sem órfão)
    governCode: true, // src só pode ler VITE_MEDIAMTX_* que estejam no contrato
  },
  {
    group: 'supabase',
    prefix: /^VITE_SUPABASE_/,
    vars: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PROJECT_ID'],
    requiredIn: ['.env.example', '.env.production'],
    mustBeUsed: false, // client Supabase pode ler via wrapper; não força uso direto
    governCode: true, // após remover o legado VITE_SUPABASE_ANON_KEY, src só lê nomes do contrato
  },
];

// Prefixos cujas LEITURAS de código são governadas (todo read do prefixo tem de estar no contrato).
const GOVERNED = CONTRACT.filter((c) => c.governCode).map((c) => c.prefix);

// ── Parsing dos .env ──────────────────────────────────────────────────────
/** Extrai o conjunto de chaves VITE_ declaradas em um arquivo .env. */
function declaredKeys(file) {
  if (!existsSync(file)) return null; // arquivo ausente é tratado à parte
  const keys = new Set();
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=/);
    if (m && m[1].startsWith('VITE_')) keys.add(m[1]);
  }
  return keys;
}

// ── Scan de src/ para import.meta.env.VITE_* ──────────────────────────────
/** Coleta todos os nomes VITE_ lidos via import.meta.env em src/. */
function scanUsedVars(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) scanUsedVars(p, out);
    else if (/\.(?:tsx?|jsx?)$/.test(name)) {
      const src = readFileSync(p, 'utf8');
      const re = /import\.meta\.env\.(VITE_[A-Z0-9_]+)/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        if (!out.has(m[1])) out.set(m[1], p);
      }
    }
  }
}

// ── Execução ───────────────────────────────────────────────────────────────
const errors = [];
const notes = [];

// Carrega chaves declaradas de todos os arquivos referenciados pelo contrato.
const allFiles = [...new Set(CONTRACT.flatMap((c) => c.requiredIn))];
const declared = {};
for (const f of allFiles) {
  const keys = declaredKeys(f);
  if (keys === null) {
    errors.push(`Arquivo de ambiente ausente: ${f} (exigido pelo contrato).`);
    declared[f] = new Set();
  } else {
    declared[f] = keys;
  }
}

// A + B) Cada var do contrato presente em cada arquivo exigido.
for (const c of CONTRACT) {
  for (const file of c.requiredIn) {
    for (const v of c.vars) {
      if (!declared[file].has(v)) {
        errors.push(`[${c.group}] ${v} ausente em ${file} (contrato exige presença).`);
      }
    }
  }
}

// A) Correção de nomes em TODOS os .env* do repo (não só os exigidos pelo contrato):
// qualquer arquivo que declare uma var de um prefixo governado tem de usar só nomes do
// contrato. Trava drift em exemplos/test (ex.: VITE_MEDIAMTX_URL no lugar do trio real,
// ou VITE_SUPABASE_ANON_KEY legado).
const envFiles = readdirSync('.').filter((f) => /^\.env(\.|$)/.test(f));
for (const file of envFiles) {
  const keys = declared[file] ?? declaredKeys(file) ?? new Set();
  for (const c of CONTRACT) {
    for (const key of keys) {
      if (c.prefix.test(key) && !c.vars.includes(key)) {
        errors.push(
          `[${c.group}] ${file} declara ${key}, fora do contrato ${c.group}. ` +
            `Use apenas: ${c.vars.join(', ')} (ou atualize o contrato em scripts/check-env-contract.mjs).`
        );
      }
    }
  }
}

// C) Código ↔ contrato.
const used = new Map();
if (existsSync(SRC)) {
  scanUsedVars(SRC, used);
} else {
  notes.push(`(aviso) diretório ${SRC}/ não encontrado; scan de código pulado.`);
}

// Toda var governada lida em src/ tem de pertencer a algum grupo do contrato.
const contractVars = new Set(CONTRACT.flatMap((c) => c.vars));
for (const [v, file] of used) {
  if (GOVERNED.some((rx) => rx.test(v)) && !contractVars.has(v)) {
    errors.push(`[código] ${file} lê ${v}, que não está no contrato. Declare-a nos .env e no contrato.`);
  }
}

// Streaming: cada var do contrato tem de ser efetivamente consumida (sem órfão).
// Só verifica órfãos se src/ existe (sem src/ nao ha como saber se a var e consumida).
if (existsSync(SRC)) for (const c of CONTRACT) {
  if (!c.mustBeUsed) continue;
  for (const v of c.vars) {
    if (!used.has(v)) {
      errors.push(`[${c.group}] ${v} está declarada mas nunca é lida em src/ (órfã). Remova-a ou use-a.`);
    }
  }
}

// ── Relatório ──────────────────────────────────────────────────────────────
if (errors.length) {
  console.error('❌ check-env-contract: contrato de variáveis violado:\n');
  errors.forEach((e) => console.error('  -', e));
  console.error(
    '\nPor que isto existe: o build de produção já saiu com localhost:8888 cravado por\n' +
      'divergência de VITE_MEDIAMTX_* entre dev e prod. Este gate impede a regressão.'
  );
  process.exit(1);
}

notes.forEach((n) => console.log(n));
const streamingCount = CONTRACT.find((c) => c.group === 'streaming').vars.length;
console.log(
  `✅ check-env-contract: contrato ok — streaming (${streamingCount} vars) paritário em ` +
    'example/development/production e consumido por src/; supabase presente em production/example.'
);
