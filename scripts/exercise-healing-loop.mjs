#!/usr/bin/env node
/**
 * Onda 141 — Exercício do laço completo de `heal_local_agents()`.
 *
 * Ponto cego que este exercício fecha: os gates existentes (Ondas 115/118/123)
 * inspecionam a rotina *estaticamente* — assinatura, privilégios, constantes,
 * constraints. Nenhum deles a executa. Uma rotina pode passar em todos eles e
 * mesmo assim nunca sair do primeiro `IF`: bastaria um `CONTINUE` mal colocado.
 * "A migração aplicou" não prova que a rotina decide.
 *
 * Estratégia de segurança, em três camadas:
 *   1. TRANSAÇÃO REVERTIDA — `scripts/sql/healing-loop-exercise.sql` abre uma
 *      transação e termina em `ROLLBACK`. `heal_local_agents()` varre a frota
 *      inteira, inclusive agentes reais: sem o rollback, o exercício
 *      enfileiraria reinícios de produção.
 *   2. AUSÊNCIA DE COMMIT VERIFICADA — este script lê o SQL e recusa executá-lo
 *      se encontrar `COMMIT`. A garantia não pode depender de revisão humana.
 *   3. USUÁRIO DEDICADO — todos os fixtures pertencem ao usuário de CI
 *      (`scripts/seed-healing-ci-user.mjs`), nunca a um dono real.
 *
 * Falha (exit 1) quando qualquer degrau da escada deixa de ser alcançado:
 *   S1 agente em carência é ignorado (nascer não é adoecer);
 *   S2 heartbeat atrasado ⇒ `nudge`;
 *   S3 silêncio crítico com tentativa gasta ⇒ `restart` (ou contenção coerente);
 *   S4 tentativas esgotadas ⇒ `escalate` + alerta no barramento;
 *   S5 heartbeat saudável com reentrega ruim ⇒ `observe` (árbitro, R3);
 *   S6 causa raiz externa em aberto ⇒ `observe` no lugar do reinício (R1).
 *
 * Uso: `npm run db:exercise:healing-loop`
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(here, 'sql', 'healing-loop-exercise.sql');
const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const uid = process.env.HEALING_CI_USER_ID;

const errors = [];
const notes = [];

if (!uid) {
  console.error(
    '[healing-loop] ❌ HEALING_CI_USER_ID ausente. Rode `npm run seed:healing-ci-user` e exporte o id impresso.'
  );
  process.exit(1);
}

if (!/^[0-9a-f-]{36}$/i.test(uid)) {
  console.error(`[healing-loop] ❌ HEALING_CI_USER_ID não parece um UUID: ${uid}`);
  process.exit(1);
}

// Camada 2 — o SQL não pode conter COMMIT.
const sql = readFileSync(sqlPath, 'utf8');
const commitLine = sql
  .split('\n')
  .findIndex((line) => /^\s*COMMIT\s*;/i.test(line) || /;\s*COMMIT\s*;/i.test(line));
if (commitLine >= 0) {
  console.error(
    `[healing-loop] ❌ ABORTADO: ${sqlPath}:${commitLine + 1} contém COMMIT. ` +
      'Este exercício só é seguro se a transação for descartada por inteiro.'
  );
  process.exit(1);
}
if (!/^\s*ROLLBACK\s*;/im.test(sql)) {
  console.error('[healing-loop] ❌ ABORTADO: o SQL não termina em ROLLBACK.');
  process.exit(1);
}

console.log('[healing-loop] 🔒 SQL sem COMMIT e com ROLLBACK — execução autorizada.');
console.log(`[healing-loop] ▶️ Exercitando heal_local_agents() sob o usuário ${uid}…`);

let raw;
try {
  raw = execFileSync(
    'psql',
    [
      ...(conn ? [conn] : []),
      '-X',
      '-q',
      '-v',
      'ON_ERROR_STOP=1',
      '-v',
      `uid=${uid}`,
      '-f',
      sqlPath,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
} catch (err) {
  console.error('[healing-loop] ❌ Execução falhou (transação descartada pelo servidor):');
  console.error(err.stderr || err.stdout || err.message);
  process.exit(1);
}

/** @type {Map<string, {action: string, severity: string, reason: string}>} */
const results = new Map();
const runs = [];
const tasks = new Map();
let healingAlerts = 0;

for (const line of raw.split('\n')) {
  const parts = line.split('|');
  if (parts[0] === 'RESULT') {
    const [, pass, scenario, action, severity, ...reasonParts] = parts;
    results.set(`${pass}:${scenario}`, {
      action,
      severity,
      reason: reasonParts.join('|'),
    });
  } else if (parts[0] === 'RUN') {
    try {
      runs.push({ pass: Number(parts[1]), summary: JSON.parse(parts.slice(2).join('|')) });
    } catch {
      notes.push(`resumo da varredura ${parts[1]} não é JSON legível`);
    }
  } else if (parts[0] === 'TASK') {
    tasks.set(parts[1], Number(parts[2]));
  } else if (parts[0] === 'ALERT') {
    healingAlerts = Number(parts[1]);
  }
}

if (results.size === 0) {
  console.error(
    '[healing-loop] ❌ Nenhum resultado retornado — o SQL não produziu saída esperada.'
  );
  console.error(raw);
  process.exit(1);
}

// A rotina engole exceções e devolve `ok:false` — foi exatamente assim que ela
// ficou inerte por várias ondas sem que nenhum gate estático percebesse.
for (const run of runs) {
  if (run.summary.ok === false) {
    errors.push(`varredura ${run.pass} abortou (ok=false): ${run.summary.error ?? 'sem detalhe'}`);
  }
}

const get = (pass, scenario) => results.get(`${pass}:${scenario}`);

/** @param {string} key @param {string[]} allowed */
function expect(pass, scenario, allowed, label) {
  const row = get(pass, scenario);
  if (!row) {
    errors.push(`${label}: cenário '${scenario}' não apareceu no resultado do passe ${pass}`);
    return null;
  }
  if (!allowed.includes(row.action)) {
    errors.push(
      `${label}: esperava ${allowed.join('|')} para '${scenario}', obtive '${row.action}' — motivo: ${row.reason}`
    );
  }
  return row;
}

// S1 — carência. `none` aqui significa "nenhuma ação registrada", que é o acerto.
expect(1, 'ci-healing-grace', ['none'], 'S1 carência');

// S2 — heartbeat atrasado vira sondagem, nunca reinício.
expect(1, 'ci-healing-nudge', ['nudge'], 'S2 sondagem');

// S3 — reinício, ou contenção coerente. A frota real do ambiente compartilha o
// orçamento e o disjuntor: exigir `restart` cegamente tornaria o gate instável
// em um dia de incidente real. Exigimos que a contenção seja EXPLICADA.
const s3 = expect(1, 'ci-healing-restart', ['restart', 'defer', 'suppress'], 'S3 reinício');
if (s3 && s3.action !== 'restart') {
  const run1 = runs.find((r) => r.pass === 1)?.summary ?? {};
  const contained =
    run1.breaker_tripped === true ||
    (typeof run1.restarts_deferred === 'number' && run1.restarts_deferred > 0) ||
    (typeof run1.restarts_suppressed === 'number' && run1.restarts_suppressed > 0);
  if (!contained) {
    errors.push(
      `S3: reinício virou '${s3.action}' sem que a varredura registrasse disjuntor ou orçamento esgotado`
    );
  } else {
    notes.push(`S3 contido por política (${s3.action}) — coerente com o resumo da varredura`);
  }
}

// S4 — tentativas esgotadas ⇒ caso humano.
expect(1, 'ci-healing-escalate', ['escalate'], 'S4 escalonamento');
if (healingAlerts < 1) {
  errors.push(
    'S4: escalonamento não gerou alerta `local_agent_healing` — detectar sem notificar é não detectar'
  );
}

// S5 — degradação que só a estatística de reentrega enxerga.
const s5 = expect(1, 'ci-healing-observe', ['observe'], 'S5 observação');
if (s5 && !s5.reason.includes('reentrega')) {
  errors.push(`S5: motivo não menciona reentrega — rastro insuficiente: ${s5.reason}`);
}

// S6 — causa raiz externa veta o reinício.
const s6 = expect(2, 'ci-healing-veto', ['observe'], 'S6 veto por causa externa');
if (s6 && !s6.reason.includes('causa raiz externa')) {
  errors.push(`S6: veto sem menção à causa raiz externa no rastro: ${s6.reason}`);
}

// A fila precisa ter recebido tarefa de verdade — decisão sem entrega é teatro.
if ((tasks.get('self_heal_ping') ?? 0) < 1) {
  errors.push('nenhuma tarefa `self_heal_ping` foi enfileirada: a cura não chega ao agente');
}

// Relatório.
console.log('\n[healing-loop] Resultado por cenário:');
for (const [key, row] of [...results.entries()].sort()) {
  const [pass, scenario] = key.split(':');
  console.log(`  passe ${pass} · ${scenario.padEnd(22)} → ${row.action}`);
}
for (const run of runs) {
  const s = run.summary;
  console.log(
    `[healing-loop] varredura ${run.pass}: total=${s.agents_total ?? '?'} crit=${s.agents_critical ?? '?'} ` +
      `esc=${s.agents_escalated ?? '?'} obs=${s.agents_observed ?? '?'} ` +
      `restart(req/adm/def/sup)=${s.restarts_requested ?? '?'}/${s.restarts_admitted ?? '?'}/` +
      `${s.restarts_deferred ?? '?'}/${s.restarts_suppressed ?? '?'} disjuntor=${s.breaker_tripped ?? '?'}`
  );
}
console.log(
  `[healing-loop] tarefas enfileiradas: ${[...tasks].map(([k, v]) => `${k}=${v}`).join(', ') || 'nenhuma'}`
);
console.log('[healing-loop] 🧹 Transação revertida — nada persistiu no banco.');

for (const note of notes) console.log(`[healing-loop] ℹ️ ${note}`);

if (errors.length > 0) {
  console.error(`\n[healing-loop] ❌ ${errors.length} falha(s):`);
  for (const e of errors) console.error(`  · ${e}`);
  process.exit(1);
}

console.log('\n[healing-loop] ✅ Laço completo exercitado: escada, orçamento, árbitro e fila.');
