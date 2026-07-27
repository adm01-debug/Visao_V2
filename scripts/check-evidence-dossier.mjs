#!/usr/bin/env node
/**
 * Gate Onda 160 — dossiê portátil de custódia.
 *
 * O que este porteiro impede de regredir:
 *   G1. A regra do dossiê é pura: sem rede, sem supabase, sem relógio próprio.
 *       Um empacotador que busca dados sozinho pode empacotar o que quiser.
 *   G2. A emissão (quem/quando) nunca entra no bloco selado.
 *   G3. A conferência reavalia o veredito (assessCustody), e não só a corrente:
 *       sem isso, um manifesto forjado e resselado passaria como íntegro.
 *   G4. A edge function preenche autoria e relógio da emissão no SERVIDOR, e
 *       recusa emitir dossiê de exportação cujo selo já não confere.
 *   G5. O aviso de limite (evidente a adulteração ≠ à prova de falsificação)
 *       continua no arquivo entregue.
 */
import { readFileSync } from 'node:fs';

const RULE = 'src/lib/evidence/custodyDossier.ts';
const EDGE = 'supabase/functions/evidence-seal/index.ts';

let failures = 0;
const check = (label, cond, detail) => {
  if (cond) {
    console.log(`  ${label.padEnd(28)}: OK`);
  } else {
    failures += 1;
    console.error(`  ${label.padEnd(28)}: FALHOU — ${detail}`);
  }
};

console.log('Gate Onda 160 — dossiê portátil de custódia');

const rule = readFileSync(RULE, 'utf8');
const edge = readFileSync(EDGE, 'utf8');

// G1 — pureza
const forbidden = ['@/integrations/supabase', 'fetch(', 'Date.now(', 'new Date()', 'localStorage'];
const dirty = forbidden.filter((token) => rule.includes(token));
check('G1 regra pura', dirty.length === 0, `tokens proibidos: ${dirty.join(', ')}`);

// G2 — emissão fora do selo
check(
  'G2 selo sem emissão',
  /sealed:\s*manifest,/.test(rule) && !/\bsealed:\s*\{/.test(rule),
  'o manifesto precisa entrar verbatim em `sealed`',
);
check(
  'G2 bloco unsealed rotulado',
  rule.includes('unsealed:') && rule.includes('DOSSIER_DISCLOSURE'),
  'o bloco não selado precisa existir e ser rotulado',
);

// G3 — conferência reavalia o veredito
check(
  'G3 reavalia veredito',
  rule.includes('assessCustody(') && rule.includes('inconsistent_verdict'),
  'verifyDossier precisa recomputar a avaliação, não só a corrente',
);
check(
  'G3 adulteração tem precedência',
  rule.indexOf('!chain.intact') < rule.indexOf('declaredLevel !== recomputedLevel'),
  'a checagem de corrente deve vir antes da de veredito',
);

// G4 — servidor é dono da procedência
check(
  'G4 verbo dossier',
  /action === "dossier"/.test(edge),
  'a edge function precisa expor o verbo dossier',
);
check(
  'G4 autoria do servidor',
  /issued_by:\s*user\.email\s*\?\?\s*user\.id/.test(edge) &&
    /issued_at_utc:\s*new Date\(\)\.toISOString\(\)/.test(edge),
  'autoria e relógio da emissão não podem vir do corpo da requisição',
);
check(
  'G4 recusa selo quebrado',
  edge.includes('"seal_broken"'),
  'emitir cópia portátil de selo quebrado distribuiria prova falsa com cara de documento',
);

// G5 — aviso honesto
check(
  'G5 aviso de limite',
  rule.includes('não à prova de falsificação'),
  'o arquivo precisa declarar o que o hash não prova',
);

console.log(failures === 0 ? '✅ Onda 160: dossiê portátil íntegro.' : `❌ ${failures} falha(s).`);
process.exit(failures === 0 ? 0 : 1);
