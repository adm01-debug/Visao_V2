#!/usr/bin/env node
/**
 * Onda 179 — simulação exaustiva da reincidência de alarme.
 *
 * Alvo: src/lib/alarms/alarmRecurrence.ts. Verifica as 8 regras invioláveis
 * contra cenários enumerados e milhares de sequências aleatórias longas,
 * checando invariantes a cada passo (monotonicidade, crítico nunca resumido,
 * acumulado nunca decrementa, teto de memória respeitado).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'wave179-'));
const entry = join(dir, 'entry.mjs');
writeFileSync(
  entry,
  `export * from ${JSON.stringify(join(process.cwd(), 'src/lib/alarms/alarmRecurrence.ts'))};`,
);
execFileSync(
  'npx',
  ['esbuild', entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${join(dir, 'b.mjs')}`],
  { stdio: 'pipe' },
);
const M = await import(join(dir, 'b.mjs'));

let asserts = 0;
const failures = [];
const check = (cond, label) => {
  asserts += 1;
  if (!cond) failures.push(failures.length < 40 ? label : '…');
};

let seed = 0x9e3779b9;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];

const SEVS = ['low', 'medium', 'high', 'critical'];
const CFG = M.DEFAULT_RECURRENCE_CONFIG;

// ---------------------------------------------------------------------------
// 1. Livro vazio e saneamento de configuração
// ---------------------------------------------------------------------------
{
  const L = M.emptyRecurrenceLedger('r1:a');
  check(L.totalEpisodes === 0 && L.openIndex === null, 'livro vazio');
  const a = M.assessRecurrence(L, 1_000_000);
  check(a.klass === 'isolated' && a.mode === 'notify', 'vazio nao reincide');
  check(a.episodesInWindow === 0 && a.collapsedCount === 0, 'vazio sem contagem');
  check(M.recurrenceSummaryText(a).includes('Sem ocorrências'), 'texto vazio');

  const bad = M.resolveRecurrenceConfig({
    windowMs: -1,
    recurrentThreshold: 0,
    chronicThreshold: 1,
    chatterMaxMs: -5,
    chatterThreshold: 0,
    maxHistory: 0,
  });
  check(bad.windowMs === CFG.windowMs, 'janela invalida saneada');
  check(bad.chronicThreshold > bad.recurrentThreshold, 'escada de limiares preservada');
  check(bad.maxHistory >= 1 && bad.chatterMaxMs >= 0, 'tetos saneados');

  // Crônico abaixo de reincidente é corrigido para manter a escada (regra 6).
  for (let r = 2; r <= 10; r += 1) {
    for (let c = 2; c <= 10; c += 1) {
      const n = M.resolveRecurrenceConfig({ recurrentThreshold: r, chronicThreshold: c });
      check(n.chronicThreshold > n.recurrentThreshold, `escada r=${r} c=${c}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Regra 3 — episódio aberto não tem duração e nunca é chatter
// ---------------------------------------------------------------------------
{
  let L = M.emptyRecurrenceLedger('k');
  L = M.openEpisode(L, { at: 0, severity: 'high' }).ledger;
  check(L.episodes[0].durationMs === null && L.episodes[0].closedAt === null, 'aberto sem duracao');
  const a = M.assessRecurrence(L, 1_000);
  check(a.chatterInWindow === 0, 'aberto nao conta chatter');
  check(a.open === true, 'sinaliza aberto');
  // Reabrir sem fechar é ignorado.
  const again = M.openEpisode(L, { at: 10, severity: 'high' });
  check(again.ignored === 'already_open' && again.ledger === L, 'reabertura ignorada');
  // Fechar duas vezes.
  const closed = M.closeEpisode(L, { at: 5_000 });
  check(closed.ignored === null && closed.ledger.openIndex === null, 'fechou');
  check(closed.ledger.episodes[0].durationMs === 5_000, 'duracao registrada');
  check(M.closeEpisode(closed.ledger, { at: 6_000 }).ignored === 'not_open', 'fechar sem aberto');
}

// ---------------------------------------------------------------------------
// 3. Regra 5 — carimbo retrocedido e duração negativa são recusados
// ---------------------------------------------------------------------------
{
  let L = M.emptyRecurrenceLedger('k');
  L = M.openEpisode(L, { at: 100_000, severity: 'low' }).ledger;
  L = M.closeEpisode(L, { at: 200_000 }).ledger;
  const stale = M.openEpisode(L, { at: 150_000, severity: 'low' });
  check(stale.ignored === 'stale_record' && stale.ledger.totalEpisodes === 1, 'abertura retroativa recusada');
  let L2 = M.openEpisode(L, { at: 300_000, severity: 'low' }).ledger;
  const neg = M.closeEpisode(L2, { at: 250_000 });
  check(neg.ignored === 'stale_record' || neg.ignored === 'negative_duration', 'fechamento retroativo recusado');
  check(neg.ledger.episodes[neg.ledger.episodes.length - 1].closedAt === null, 'episodio segue aberto');
  for (const bad of [null, undefined, {}, { at: NaN, severity: 'low' }, { at: 1, severity: 'x' }]) {
    check(M.openEpisode(L, bad).ignored === 'invalid_input', 'entrada invalida na abertura');
  }
  check(M.closeEpisode(L2, { at: Infinity }).ignored === 'invalid_input', 'fechamento invalido');
}

// ---------------------------------------------------------------------------
// 4. Escada de classificação por contagem
// ---------------------------------------------------------------------------
{
  for (let n = 0; n <= 12; n += 1) {
    let L = M.emptyRecurrenceLedger('k');
    let t = 0;
    for (let i = 0; i < n; i += 1) {
      L = M.openEpisode(L, { at: t, severity: 'medium' }).ledger;
      t += 120_000; // 2 min: longo o bastante para não ser chatter
      L = M.closeEpisode(L, { at: t }).ledger;
      t += 60_000;
    }
    const a = M.assessRecurrence(L, t, { windowMs: 86_400_000 });
    const expected = n >= CFG.chronicThreshold ? 'chronic' : n >= CFG.recurrentThreshold ? 'recurrent' : 'isolated';
    check(a.klass === expected, `classe para n=${n}`);
    check(a.episodesInWindow === n, `contagem n=${n}`);
    const expectedMode = expected === 'chronic' ? 'escalate' : expected === 'recurrent' ? 'summarize' : 'notify';
    check(a.mode === expectedMode, `modo n=${n}`);
    if (a.mode === 'summarize') check(a.collapsedCount === n - 1, `agrupados n=${n}`);
    else check(a.collapsedCount === 0, `sem agrupamento n=${n}`);
  }
}

// ---------------------------------------------------------------------------
// 5. Regra 2 — crítico nunca é resumido
// ---------------------------------------------------------------------------
{
  for (let n = 1; n <= 15; n += 1) {
    let L = M.emptyRecurrenceLedger('k');
    let t = 0;
    for (let i = 0; i < n; i += 1) {
      L = M.openEpisode(L, { at: t, severity: i === 0 ? 'critical' : 'low' }).ledger;
      t += 120_000;
      L = M.closeEpisode(L, { at: t }).ledger;
      t += 30_000;
    }
    const a = M.assessRecurrence(L, t, { windowMs: 86_400_000 });
    check(a.mode !== 'summarize', `critico nao resumido n=${n}`);
    check(a.peakSeverity === 'critical', `pico critico n=${n}`);
    check(M.noticeModeRank(a.mode) >= M.noticeModeRank('notify'), `modo minimo n=${n}`);
  }
}

// ---------------------------------------------------------------------------
// 6. Oscilação (chatter) promove a série
// ---------------------------------------------------------------------------
{
  let L = M.emptyRecurrenceLedger('k');
  let t = 0;
  for (let i = 0; i < CFG.chatterThreshold; i += 1) {
    L = M.openEpisode(L, { at: t, severity: 'low' }).ledger;
    t += 1_000; // 1s: chatter
    L = M.closeEpisode(L, { at: t }).ledger;
    t += 1_000;
  }
  const a = M.assessRecurrence(L, t);
  check(a.flapping === true, 'oscilacao detectada');
  check(M.recurrenceClassRank(a.klass) >= M.recurrenceClassRank('recurrent'), 'oscilacao promove classe');
  check(M.recurrenceSummaryText(a).includes('oscilação'), 'texto de oscilacao');
  check(L.totalChatter === CFG.chatterThreshold, 'acumulado de chatter');
}

// ---------------------------------------------------------------------------
// 7. Regra 4 — janela esquece, acumulado não
// ---------------------------------------------------------------------------
{
  let L = M.emptyRecurrenceLedger('k');
  let t = 0;
  for (let i = 0; i < 8; i += 1) {
    L = M.openEpisode(L, { at: t, severity: 'medium' }).ledger;
    t += 60_000;
    L = M.closeEpisode(L, { at: t }).ledger;
    t += 60_000;
  }
  const total = L.totalEpisodes;
  const far = t + 10 * CFG.windowMs;
  const a = M.assessRecurrence(L, far);
  check(a.episodesInWindow === 0, 'janela esqueceu');
  check(a.klass === 'isolated' && a.mode === 'notify', 'sem reincidencia fora da janela');
  check(L.totalEpisodes === total && total === 8, 'acumulado preservado');
  // Episódio aberto atravessa qualquer janela.
  let L2 = M.openEpisode(M.emptyRecurrenceLedger('k'), { at: 0, severity: 'high' }).ledger;
  const a2 = M.assessRecurrence(L2, 50 * CFG.windowMs);
  check(a2.episodesInWindow === 1 && a2.open, 'episodio aberto sempre na janela');
}

// ---------------------------------------------------------------------------
// 8. Regra 7 — teto de memória
// ---------------------------------------------------------------------------
{
  let L = M.emptyRecurrenceLedger('k');
  let t = 0;
  const cfg = { maxHistory: 10 };
  for (let i = 0; i < 60; i += 1) {
    L = M.openEpisode(L, { at: t, severity: 'low' }, cfg).ledger;
    t += 60_000;
    L = M.closeEpisode(L, { at: t }, cfg).ledger;
    t += 1_000;
    check(L.episodes.length <= 10, `teto no passo ${i}`);
  }
  check(L.totalEpisodes === 60, 'acumulado ignora o teto');
  // Com episódio aberto na hora do corte, o índice acompanha o deslocamento.
  L = M.openEpisode(L, { at: t + 1_000, severity: 'low' }, cfg).ledger;
  check(L.openIndex !== null && L.episodes[L.openIndex].closedAt === null, 'indice aberto sobreviveu ao corte');
}

// ---------------------------------------------------------------------------
// 9. Sequências aleatórias com invariantes a cada passo (regras 1, 2, 4, 6, 8)
// ---------------------------------------------------------------------------
for (let run = 0; run < 4_000; run += 1) {
  let L = M.emptyRecurrenceLedger(`r${run}`);
  let clock = 1_700_000_000_000 + Math.floor(rnd() * 1_000_000);
  const cfg = {
    windowMs: pick([600_000, 3_600_000, 86_400_000]),
    recurrentThreshold: 2 + Math.floor(rnd() * 4),
    chronicThreshold: 2 + Math.floor(rnd() * 8),
    chatterMaxMs: pick([5_000, 30_000, 120_000]),
    chatterThreshold: 1 + Math.floor(rnd() * 4),
    maxHistory: pick([5, 25, 200]),
  };
  const frozen = JSON.stringify(L);

  for (let step = 0; step < 40; step += 1) {
    const before = L;
    const beforeAssess = M.assessRecurrence(before, clock, cfg);
    clock += Math.floor(rnd() * 400_000);

    const action = rnd();
    let res;
    if (action < 0.45) res = M.openEpisode(L, { at: clock, severity: pick(SEVS) }, cfg);
    else if (action < 0.9) res = M.closeEpisode(L, { at: clock }, cfg);
    else res = M.openEpisode(L, pick([null, {}, { at: NaN, severity: 'low' }]), cfg);
    L = res.ledger;

    // Imutabilidade da entrada.
    if (res.ignored !== null) check(L === before, 'livro mutado apos ignorar');
    // Acumulados nunca decrementam (regra 4).
    check(L.totalEpisodes >= before.totalEpisodes, 'acumulado decrementou');
    check(L.totalChatter >= before.totalChatter, 'chatter decrementou');
    // Teto de memória (regra 7).
    check(L.episodes.length <= cfg.maxHistory, 'teto de memoria estourado');
    // No máximo um aberto e ele é o registro apontado.
    const openCount = L.episodes.filter((e) => e.closedAt === null).length;
    check(openCount <= 1, 'mais de um episodio aberto');
    check((L.openIndex === null) === (openCount === 0), 'indice aberto inconsistente');
    // Nenhuma duração negativa nem aberto com duração (regra 3).
    for (const e of L.episodes) {
      check(e.closedAt === null ? e.durationMs === null : e.durationMs >= 0, 'duracao invalida');
    }
    // Relógio aceito monotônico (regra 5).
    if (L.lastAcceptedAt !== null && before.lastAcceptedAt !== null) {
      check(L.lastAcceptedAt >= before.lastAcceptedAt, 'relogio aceito retrocedeu');
    }

    // Monotonicidade para o mesmo `now` (regra 6): reavaliar o estado
    // anterior e o novo no mesmo instante nunca rebaixa.
    const sameNow = Math.max(clock, before.lastAcceptedAt ?? clock);
    const a0 = M.assessRecurrence(before, sameNow, cfg);
    const a1 = M.assessRecurrence(L, sameNow, cfg);
    if (res.ignored === null && a1.episodesInWindow >= a0.episodesInWindow) {
      check(M.recurrenceClassRank(a1.klass) >= M.recurrenceClassRank(a0.klass), 'classe rebaixou na janela');
    }
    // Regra 1: nunca existe modo que suprima.
    check(['notify', 'summarize', 'escalate'].includes(a1.mode), 'modo desconhecido');
    // Regra 2: crítico jamais resumido.
    if (a1.peakSeverity === 'critical') check(a1.mode !== 'summarize', 'critico resumido');
    // Coerência classe × modo.
    if (a1.klass === 'chronic') check(a1.mode === 'escalate', 'cronico sem escalada');
    if (a1.klass === 'isolated') check(a1.mode === 'notify', 'isolado com modo diferente');
    // Contagens coerentes.
    check(a1.chatterInWindow <= a1.episodesInWindow, 'chatter maior que episodios');
    check(a1.episodesInWindow <= L.episodes.length, 'janela maior que historico');
    check(typeof M.recurrenceSummaryText(a1) === 'string', 'texto sempre string');
    // beforeAssess é apenas referência de leitura pura.
    check(typeof beforeAssess.klass === 'string', 'avaliacao anterior valida');
  }
  check(JSON.stringify(M.emptyRecurrenceLedger(`r${run}`)) === frozen, 'livro vazio deixou de ser puro');
}

// ---------------------------------------------------------------------------
// 10. Rótulos
// ---------------------------------------------------------------------------
for (const c of ['isolated', 'recurrent', 'chronic']) {
  check(typeof M.recurrenceClassLabel(c) === 'string' && M.recurrenceClassLabel(c).length > 0, `rotulo classe ${c}`);
}
for (const m of ['notify', 'summarize', 'escalate']) {
  check(typeof M.noticeModeLabel(m) === 'string' && M.noticeModeLabel(m).length > 0, `rotulo modo ${m}`);
}
for (const r of ['invalid_input', 'already_open', 'not_open', 'stale_record', 'negative_duration']) {
  check(M.recurrenceIgnoreReasonLabel(r).length > 0, `rotulo motivo ${r}`);
}

console.log(`Onda 179 — asserções: ${asserts.toLocaleString('pt-BR')}, falhas: ${failures.length}`);
if (failures.length > 0) {
  for (const f of failures.slice(0, 40)) console.error(' ✗', f);
  process.exit(1);
}
console.log('✅ Reincidência, oscilação e política de aviso aprovadas.');
