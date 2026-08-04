#!/usr/bin/env node
/**
 * Onda 178 — simulação exaustiva da agregação de alarme multi-origem.
 *
 * Alvo: src/lib/alarms/alarmAggregation.ts. Verifica as 8 regras invioláveis
 * contra cenários enumerados (agenda, consistência, ordem de eventos) e
 * milhares de sequências aleatórias longas com verificação de invariantes
 * a cada passo.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'wave178-'));
const entry = join(dir, 'entry.mjs');
writeFileSync(
  entry,
  `export * from ${JSON.stringify(join(process.cwd(), 'src/lib/alarms/alarmAggregation.ts'))};`
);
execFileSync(
  'npx',
  [
    'esbuild',
    entry,
    '--bundle',
    '--format=esm',
    '--platform=node',
    `--outfile=${join(dir, 'b.mjs')}`,
  ],
  { stdio: 'pipe' }
);
const M = await import(join(dir, 'b.mjs'));

let asserts = 0;
const failures = [];
const check = (cond, label) => {
  asserts += 1;
  if (!cond && failures.length < 40) failures.push(label);
  else if (!cond) failures.push('…');
};

// Gerador determinístico (mulberry32) — a simulação precisa ser reproduzível.
let seed = 0x9e3779b9;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const rule = (over = {}) => ({
  id: 'r1',
  enabled: true,
  sourceIds: ['a', 'b', 'c'],
  ...over,
});

// ---------------------------------------------------------------------------
// 1. Agenda: validação, normalização, teto de 6, travessia de meia-noite
// ---------------------------------------------------------------------------
check(M.isValidPeriod({ startMin: 0, endMin: 1440 }), 'periodo dia inteiro valido');
check(!M.isValidPeriod({ startMin: 60, endMin: 60 }), 'periodo degenerado invalido');
check(!M.isValidPeriod({ startMin: -1, endMin: 100 }), 'inicio negativo invalido');
check(!M.isValidPeriod({ startMin: 10, endMin: 1441 }), 'fim alem do dia invalido');
check(!M.isValidPeriod({ startMin: 1.5, endMin: 100 }), 'minuto fracionario invalido');
check(!M.isValidPeriod(null), 'nulo invalido');

{
  const day = Array.from({ length: 10 }, (_, i) => ({ startMin: i * 100, endMin: i * 100 + 50 }));
  const norm = M.normalizeSchedule([day, [], [], [], [], [], []]);
  check(norm[0].length === M.MAX_PERIODS_PER_DAY, 'teto de 6 periodos por dia');
  check(norm.length === 7, 'agenda sempre com 7 dias');
  for (let i = 1; i < norm[0].length; i += 1) {
    check(norm[0][i - 1].startMin <= norm[0][i].startMin, 'periodos ordenados');
  }
}
check(M.isAlwaysOn(null), 'agenda ausente = 24x7');
check(M.isAlwaysOn([[], [], [], [], [], [], []]), 'agenda vazia = 24x7');
check(M.isWithinSchedule(null, Date.UTC(2026, 0, 1, 3, 0)), '24x7 sempre dentro');

{
  // Domingo 2026-01-04. Janela noturna 22:00 -> 06:00 (cruza a meia-noite).
  const night = [[{ startMin: 22 * 60, endMin: 6 * 60 }], [], [], [], [], [], []]; // domingo
  const at = (d, h, m = 0) => Date.UTC(2026, 0, d, h, m);
  check(M.isWithinSchedule(night, at(4, 23)), 'domingo 23h dentro da janela noturna');
  check(M.isWithinSchedule(night, at(5, 5, 59)), 'segunda 05:59 ainda dentro (continuacao)');
  check(!M.isWithinSchedule(night, at(5, 6)), 'segunda 06:00 fora (fim exclusivo)');
  check(!M.isWithinSchedule(night, at(4, 21, 59)), 'domingo 21:59 fora');
  check(M.isWithinSchedule(night, at(4, 22)), 'domingo 22:00 dentro (inicio inclusivo)');
}
{
  // Fuso deve mudar a decisão de forma coerente: 03:00Z = 00:00 em -180.
  const sched = [[{ startMin: 0, endMin: 60 }], [], [], [], [], [], []]; // domingo 00-01h local
  const t = Date.UTC(2026, 0, 4, 3, 30); // domingo 03:30Z = 00:30 em -180
  check(M.isWithinSchedule(sched, t, -180), 'fuso -180 coloca dentro da janela');
  check(!M.isWithinSchedule(sched, t, 0), 'mesmo instante em UTC fica fora');
}
// Varredura minuto a minuto: janela simples nunca aceita fora do intervalo.
{
  const sched = [[], [], [], [], [], [], []];
  for (let d = 0; d < 7; d += 1) sched[d] = [{ startMin: 480, endMin: 1080 }];
  for (let day = 4; day <= 10; day += 1) {
    for (let minute = 0; minute < 1440; minute += 7) {
      const inside = M.isWithinSchedule(sched, Date.UTC(2026, 0, day, 0, minute));
      check(inside === (minute >= 480 && minute < 1080), `janela 08-18 dia ${day} min ${minute}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Diagnóstico de consistência
// ---------------------------------------------------------------------------
check(M.diagnoseRule(rule()).health === 'ok', 'regra integra = ok');
check(M.diagnoseRule(rule({ enabled: false })).health === 'disabled', 'desabilitada');
check(
  M.diagnoseRule(rule({ missingSourceIds: ['a'] })).health === 'inconsistent',
  'origem removida = inconsistente'
);
check(
  M.diagnoseRule(rule({ missingSourceIds: ['a', 'b', 'c'] })).health === 'inoperative',
  'todas as origens removidas = inoperante'
);
check(
  M.diagnoseRule(rule({ sourceIds: [] })).health === 'inoperative',
  'sem origem configurada = inoperante'
);
check(
  M.diagnoseRule(rule({ missingActionIds: ['x'] })).health === 'inconsistent',
  'acao removida = inconsistente'
);
check(
  M.diagnoseRule(rule({ missingSourceIds: ['a'] })).effectiveSourceIds.join() === 'b,c',
  'origens efetivas excluem removidas'
);
check(
  M.diagnoseRule(rule({ missingSourceIds: ['a'] })).message !== null,
  'inconsistente tem mensagem'
);
// Regra 6: inconsistente ainda protege o que sobrou.
{
  const r = rule({ missingSourceIds: ['a'] });
  const res = M.applySourceReport(r, M.emptyEpisode(), {
    sourceId: 'b',
    state: 'active',
    at: 1000,
  });
  check(res.transition === 'opened', 'regra inconsistente ainda dispara pelas origens vivas');
  const dead = M.applySourceReport(r, res.state, { sourceId: 'a', state: 'active', at: 1001 });
  check(dead.ignored === 'unknown_source', 'origem removida nao dispara mais');
}

// ---------------------------------------------------------------------------
// 3. Regras 1 e 2 — OR para abrir, AND para fechar; silêncio não encerra
// ---------------------------------------------------------------------------
{
  const r = rule();
  let s = M.emptyEpisode();
  let res = M.applySourceReport(r, s, { sourceId: 'a', state: 'active', at: 100 });
  check(res.transition === 'opened', 'abre com uma origem ativa');
  s = res.state;

  res = M.applySourceReport(r, s, { sourceId: 'b', state: 'active', at: 110 });
  check(res.transition === 'sustained', 'segunda origem ativa nao reabre');
  check(res.state.openedAt === 100, 'inicio do episodio preservado');
  s = res.state;

  res = M.applySourceReport(r, s, { sourceId: 'a', state: 'clear', at: 120 });
  check(res.transition === 'sustained', 'uma origem normalizada nao encerra');
  s = res.state;

  res = M.applySourceReport(r, s, { sourceId: 'b', state: 'clear', at: 130 });
  check(res.transition === 'sustained', 'c ainda silenciosa: nao encerra (regra 2)');
  check(res.pendingSources.join() === 'c', 'c listada como pendente');
  check(M.pendingExplanation(res) !== null, 'explicacao de pendencia presente');
  s = res.state;

  res = M.applySourceReport(r, s, { sourceId: 'c', state: 'clear', at: 140 });
  check(res.transition === 'closed', 'encerra so quando TODAS negativam');
  check(res.state.openedAt === null, 'episodio fechado');
}

// ---------------------------------------------------------------------------
// 4. Regra 3 — a agenda barra abertura, nunca encerramento
// ---------------------------------------------------------------------------
{
  const sched = [[], [], [], [], [], [], []];
  for (let d = 0; d < 7; d += 1) sched[d] = [{ startMin: 480, endMin: 1080 }];
  const r = rule({ sourceIds: ['a'], schedule: sched });
  const inside = Date.UTC(2026, 0, 5, 10, 0);
  const outside = Date.UTC(2026, 0, 5, 23, 0);

  const blocked = M.applySourceReport(r, M.emptyEpisode(), {
    sourceId: 'a',
    state: 'active',
    at: outside,
  });
  check(blocked.ignored === 'out_of_schedule', 'ativo fora da janela nao abre');
  check(blocked.state.openedAt === null, 'nenhum episodio criado fora da janela');

  const open = M.applySourceReport(r, M.emptyEpisode(), {
    sourceId: 'a',
    state: 'active',
    at: inside,
  });
  check(open.transition === 'opened', 'ativo dentro da janela abre');

  const later = M.applySourceReport(r, open.state, { sourceId: 'a', state: 'active', at: outside });
  check(later.ignored === null, 'episodio aberto continua sendo alimentado fora da janela');
  check(later.state.openedAt === open.state.openedAt, 'agenda nao cancela episodio em curso');

  const closed = M.applySourceReport(r, later.state, {
    sourceId: 'a',
    state: 'clear',
    at: outside + 1,
  });
  check(closed.transition === 'closed', 'encerramento aceito fora da janela');
}

// ---------------------------------------------------------------------------
// 5. Regra 4 — rearme no primeiro contato
// ---------------------------------------------------------------------------
{
  const sched = [[], [], [], [], [], [], []];
  for (let d = 0; d < 7; d += 1) sched[d] = [{ startMin: 480, endMin: 1080 }];
  const r = rule({ sourceIds: ['a', 'b'], schedule: sched });
  const outside = Date.UTC(2026, 0, 5, 23, 0);

  const res = M.rearmOnConnect(
    r,
    M.emptyEpisode(),
    [{ sourceId: 'a', state: 'active', at: outside }],
    outside
  );
  check(res.transition === 'rearmed', 'origem ja em alarme rearma no primeiro contato');
  check(res.state.openedBy === 'rearm', 'motivo de abertura registrado como rearme');
  check(res.state.openedAt === outside, 'rearme carimba o instante da conexao');

  const calm = M.rearmOnConnect(
    r,
    M.emptyEpisode(),
    [
      { sourceId: 'a', state: 'clear', at: outside },
      { sourceId: 'b', state: 'clear', at: outside },
    ],
    outside
  );
  check(calm.transition === 'none', 'tudo normal na conexao nao inventa alarme');

  const off = M.rearmOnConnect(
    rule({ enabled: false }),
    M.emptyEpisode(),
    [{ sourceId: 'a', state: 'active', at: 1 }],
    1
  );
  check(off.ignored === 'rule_disabled', 'regra desabilitada nao rearma');
}

// ---------------------------------------------------------------------------
// 6. Regras 5, 7, 8 — congelamento, atraso, pureza
// ---------------------------------------------------------------------------
{
  const open = M.applySourceReport(rule(), M.emptyEpisode(), {
    sourceId: 'a',
    state: 'active',
    at: 10,
  });
  const frozen = M.applySourceReport(rule({ enabled: false }), open.state, {
    sourceId: 'a',
    state: 'clear',
    at: 20,
  });
  check(frozen.ignored === 'rule_disabled', 'regra desabilitada ignora reporte');
  check(frozen.state.openedAt === 10, 'regra desabilitada nao encerra episodio (regra 5)');

  const stale = M.applySourceReport(rule(), open.state, { sourceId: 'a', state: 'clear', at: 5 });
  check(stale.ignored === 'stale_report', 'reporte atrasado descartado');
  check(stale.state.openedAt === 10, 'atrasado nao encerra');

  for (const bad of [
    null,
    undefined,
    {},
    { sourceId: 'a', state: 'x', at: 1 },
    { sourceId: 'a', state: 'active', at: NaN },
    { sourceId: 5, state: 'active', at: 1 },
  ]) {
    const res = M.applySourceReport(rule(), open.state, bad);
    check(
      res.ignored === 'invalid_report' || res.ignored === 'unknown_source',
      'entrada invalida rejeitada sem lancar'
    );
    check(res.state.openedAt === 10, 'entrada invalida nao altera episodio');
  }

  const snapshot = JSON.stringify(open.state);
  M.applySourceReport(rule(), open.state, { sourceId: 'b', state: 'active', at: 99 });
  check(JSON.stringify(open.state) === snapshot, 'estado de entrada nunca mutado (regra 8)');
}

// ---------------------------------------------------------------------------
// 7. Fuzz: sequências longas com invariantes verificadas a cada passo
// ---------------------------------------------------------------------------
const SOURCES = ['a', 'b', 'c', 'd'];
for (let trial = 0; trial < 4000; trial += 1) {
  const n = 1 + Math.floor(rnd() * 4);
  const ids = SOURCES.slice(0, n);
  const missing = rnd() < 0.2 ? [pick(ids)] : [];
  const withSchedule = rnd() < 0.4;
  const sched = [[], [], [], [], [], [], []];
  if (withSchedule) for (let d = 0; d < 7; d += 1) sched[d] = [{ startMin: 480, endMin: 1080 }];
  const r = rule({
    sourceIds: ids,
    missingSourceIds: missing,
    schedule: withSchedule ? sched : null,
  });
  const diag = M.diagnoseRule(r);

  let s = M.emptyEpisode();
  let clock = Date.UTC(2026, 0, 5, 0, 0);
  let lastOpenedAt = null;

  for (let step = 0; step < 30; step += 1) {
    clock += Math.floor(rnd() * 90) * 60_000;
    const report = { sourceId: pick(SOURCES), state: rnd() < 0.5 ? 'active' : 'clear', at: clock };
    const before = s;
    const res = M.applySourceReport(r, before, report);
    s = res.state;

    // Invariante A: episódio aberto ⇒ existe origem ativa ou pendente.
    if (s.openedAt !== null) {
      check(
        res.activeSources.length + res.pendingSources.length > 0,
        'aberto exige origem ativa ou pendente'
      );
    }
    // Invariante B: nunca fecha com origem ainda ativa (regra 1).
    if (res.transition === 'closed') {
      check(res.activeSources.length === 0, 'fechou com origem ainda ativa');
      check(res.pendingSources.length === 0, 'fechou com origem silenciosa (regra 2)');
    }
    // Invariante C: enquanto aberto, openedAt é imutável.
    if (s.openedAt !== null && lastOpenedAt !== null && res.transition !== 'rearmed') {
      check(s.openedAt === lastOpenedAt, 'openedAt mudou com episodio em curso');
    }
    lastOpenedAt = s.openedAt;
    // Invariante D: evento ignorado não altera o estado.
    if (res.ignored) {
      check(JSON.stringify(s) === JSON.stringify(before), 'evento ignorado alterou estado');
    }
    // Invariante E: regra inoperante nunca abre.
    if (diag.health === 'inoperative' || diag.health === 'disabled') {
      check(s.openedAt === null, 'regra sem origem valida abriu episodio');
    }
    // Invariante F: origens listadas são sempre efetivas.
    for (const id of [...res.activeSources, ...res.pendingSources]) {
      check(diag.effectiveSourceIds.includes(id), 'origem nao efetiva listada');
    }
    // Invariante G: relógio aceito é monotônico.
    if (s.lastAcceptedAt !== null && before.lastAcceptedAt !== null) {
      check(s.lastAcceptedAt >= before.lastAcceptedAt, 'relogio aceito retrocedeu');
    }
  }

  // Fechamento forçado: todas as origens efetivas normalizam ⇒ episódio fecha.
  if (diag.health === 'ok' || diag.health === 'inconsistent') {
    for (const id of diag.effectiveSourceIds) {
      clock += 60_000;
      s = M.applySourceReport(r, s, { sourceId: id, state: 'clear', at: clock }).state;
    }
    check(s.openedAt === null, 'episodio nao fechou apos todas as origens normalizarem');
  }
}

// ---------------------------------------------------------------------------
// 8. Rótulos
// ---------------------------------------------------------------------------
for (const h of ['ok', 'inconsistent', 'inoperative', 'disabled']) {
  check(typeof M.ruleHealthLabel(h) === 'string' && M.ruleHealthLabel(h).length > 0, `rotulo ${h}`);
}
for (const r of [
  'rule_disabled',
  'rule_inoperative',
  'unknown_source',
  'out_of_schedule',
  'stale_report',
  'invalid_report',
]) {
  check(
    typeof M.ignoreReasonLabel(r) === 'string' && M.ignoreReasonLabel(r).length > 0,
    `rotulo ${r}`
  );
}

console.log(`Onda 178 — asserções: ${asserts.toLocaleString('pt-BR')}, falhas: ${failures.length}`);
if (failures.length > 0) {
  for (const f of failures.slice(0, 40)) console.error(' ✗', f);
  process.exit(1);
}
console.log('✅ Agregação multi-origem, agenda e consistência de regra aprovadas.');
