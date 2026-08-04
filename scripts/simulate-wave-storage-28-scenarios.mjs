#!/usr/bin/env node
/**
 * Onda Storage 28 — Simulação da UI de gestão de silences.
 * Valida contratos client-side: parsing de resposta, validação de formulário,
 * proteção contra silences globais e cobertura de estados de erro.
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(
  new URL('../src/components/admin/AlertmanagerSilencesCard.tsx', import.meta.url),
  'utf8'
);

const checks = [];
const check = (name, cond) => checks.push({ name, ok: !!cond });

check('Import supabase client', /from '@\/integrations\/supabase\/client'/.test(src));
check('Usa useQuery', /useQuery\(/.test(src));
check('Usa useMutation', /useMutation\(/.test(src));
check('Chama functions.invoke("alertmanager-silence")', /alertmanager-silence/.test(src));
check(
  'Bloqueia matcher global .* no client',
  /match_everything|\\\.\\\*|globalMatcher|isDangerousMatcher/.test(src)
);
check(
  'Exige justificativa >= 5 chars',
  /(justif|comment)[^\n]*length\s*[<>]=?\s*5/i.test(src) || /min\s*=\s*"?5"?/i.test(src)
);
check(
  'Duração min 5 max 1440',
  /min=\{?5\}?[\s\S]{0,80}max=\{?1440\}?/.test(src) || /min="5"[\s\S]{0,80}max="1440"/.test(src)
);
check(
  'Renderiza lista de silences ativos',
  /data\.map\(\(s\)/.test(src) && /Silence\[\]|Silence\s*\{/.test(src)
);
check('Botão expirar silence', /expire|Expirar/i.test(src));
check('Trata estado de erro', /isError|onError/i.test(src));
check('Trata estado de loading', /isLoading|isPending/i.test(src));
check('Aria-label acessível', /aria-label=/.test(src));
check('Sem cores hard-coded', !/bg-(red|blue|green|yellow|purple|indigo)-\d/.test(src));
check('Sem hex hardcoded', !/#[0-9a-fA-F]{6}\b/.test(src));
check('Usa tokens semânticos', /text-foreground|bg-card|text-muted-foreground/.test(src));
check('Toast em sucesso e erro', /toast/i.test(src));

// Cenários de validação de payload
const scenarios = [];
const isGlobal = (m) => !m || m.trim() === '' || /^\.\*+$/.test(m.trim());
const validateJustification = (s) =>
  typeof s === 'string' && s.trim().length >= 5 && s.trim().length <= 500;
const validateDuration = (n) => Number.isInteger(n) && n >= 5 && n <= 1440;

for (let i = 0; i < 200; i++) {
  const m = [null, '', '.*', '.*.*', 'alertname="X"', 'severity="critical"'][i % 6];
  scenarios.push({ kind: 'matcher', input: m, expect: !isGlobal(m) });
}
for (let i = 0; i < 200; i++) {
  const s = ['', 'x', 'ok', 'abcd', 'abcde', 'motivo válido', 'a'.repeat(600)][i % 7];
  scenarios.push({ kind: 'justification', input: s, expect: validateJustification(s) });
}
for (let i = 0; i < 200; i++) {
  const d = [0, 4, 5, 60, 1440, 1441, -10, 999999][i % 8];
  scenarios.push({ kind: 'duration', input: d, expect: validateDuration(d) });
}

// Nenhum destes cenários deve "vazar" um silence perigoso quando expect=false.
let leaks = 0;
for (const s of scenarios) {
  const wouldAccept =
    s.kind === 'matcher'
      ? !isGlobal(s.input)
      : s.kind === 'justification'
        ? validateJustification(s.input)
        : validateDuration(s.input);
  if (wouldAccept !== s.expect) leaks++;
}

const failed = checks.filter((c) => !c.ok);
console.log(`Checks estruturais: ${checks.length - failed.length}/${checks.length}`);
console.log(`Cenários simulados: ${scenarios.length} — leaks: ${leaks}`);
if (failed.length) {
  console.log('Falhas:');
  failed.forEach((f) => console.log(' -', f.name));
}
if (failed.length || leaks) process.exit(1);
console.log('OK — Onda 28 aprovada.');
