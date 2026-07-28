#!/usr/bin/env node
/**
 * Onda 184 — simulação exaustiva da retenção dos episódios de reincidência.
 *
 * O gate prova que a rotina roda no banco. Esta simulação prova que a REGRA
 * é sã sob combinações que o banco de teste nunca teria: relógio adiantado,
 * carimbos ilegíveis, fronteiras exatas do prazo, episódios eternos e frotas
 * inteiras vencendo no mesmo instante.
 *
 * Invariantes verificadas:
 *   I1. Episódio aberto JAMAIS é purgável, qualquer que seja a idade.
 *   I2. Monotonicidade no tempo: o que é purgável agora continua purgável
 *       depois. A faxina nunca "desfaz".
 *   I3. Fronteira exclusiva: exatamente no limite ainda se guarda.
 *   I4. Dado ilegível nunca é apagado (fail-safe: na dúvida, preserva).
 *   I5. Purgável e abandonado são mutuamente exclusivos — nenhuma linha pode
 *       ser contada nas duas colunas do relatório.
 *   I6. Conservação: apagados + pendentes ≤ elegíveis no início da execução.
 *   I7. Classificação: truncado tem precedência sobre abandono, e execução
 *       limpa exige fila vazia E nenhum abandono.
 */

import {
  ABANDONED_OPEN_DAYS,
  CLOSED_RETENTION_DAYS,
  MAX_DELETE_PER_RUN,
  classifyPurgeOutcome,
  describePurgeOutcome,
  isAbandonedOpen,
  isPurgeable,
} from '../src/lib/retention/alarmRecurrenceRetention.ts';

const DAY = 86_400_000;
let assertions = 0;
const failures = [];
const ok = (condition, message) => {
  assertions += 1;
  if (!condition) failures.push(message);
};

// Gerador determinístico — a simulação precisa ser reproduzível.
let seed = 0x9e3779b9;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};

const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);
const RETENTION_MS = CLOSED_RETENTION_DAYS * DAY;
const ABANDON_MS = ABANDONED_OPEN_DAYS * DAY;

// --- I1 + I5: aberto nunca é purgável, e as duas contagens não se cruzam -------
for (let i = 0; i < 20_000; i += 1) {
  const ageDays = rnd() * 4000;
  const openedAt = NOW - ageDays * DAY;
  const episode = { openedAt, closedAt: null };
  ok(!isPurgeable(episode, NOW), `I1: episódio aberto há ${ageDays.toFixed(1)}d foi dado como purgável`);
  const abandoned = isAbandonedOpen(episode, NOW);
  ok(
    abandoned === ageDays * DAY > ABANDON_MS,
    `I1: abandono mal classificado em ${ageDays.toFixed(1)}d`,
  );
  ok(!(abandoned && isPurgeable(episode, NOW)), 'I5: linha contada como abandonada E purgável');
}

// --- I2 + I3: monotonicidade e fronteira exclusiva -----------------------------
for (let i = 0; i < 20_000; i += 1) {
  const closedAt = NOW - rnd() * 3000 * DAY;
  const episode = { openedAt: closedAt - DAY, closedAt };
  const nowA = NOW;
  const nowB = NOW + rnd() * 500 * DAY;
  if (isPurgeable(episode, nowA)) {
    ok(isPurgeable(episode, nowB), 'I2: episódio purgável deixou de ser purgável com o tempo');
  }
  ok(!(!isPurgeable(episode, nowB) && isPurgeable(episode, nowA)), 'I2: violação de monotonicidade');
}

// Fronteira exata: `closedAt === now - retenção` ainda é guardado.
const boundary = { openedAt: NOW - RETENTION_MS - DAY, closedAt: NOW - RETENTION_MS };
ok(!isPurgeable(boundary, NOW), 'I3: fronteira exata deveria ser guardada');
ok(isPurgeable({ ...boundary, closedAt: NOW - RETENTION_MS - 1 }, NOW), 'I3: 1ms além da fronteira deveria sair');
const abandonBoundary = { openedAt: NOW - ABANDON_MS, closedAt: null };
ok(!isAbandonedOpen(abandonBoundary, NOW), 'I3: fronteira exata de abandono não deveria disparar');
ok(isAbandonedOpen({ openedAt: NOW - ABANDON_MS - 1, closedAt: null }, NOW), 'I3: 1ms além do abandono deveria contar');

// --- I4: dado ilegível é preservado ---------------------------------------------
const garbage = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
for (const value of garbage) {
  ok(!isPurgeable({ closedAt: value }, NOW), `I4: closedAt=${value} foi dado como purgável`);
  ok(!isPurgeable({ closedAt: NOW - 5000 * DAY }, value), `I4: now=${value} liberou expurgo`);
  ok(!isAbandonedOpen({ openedAt: value, closedAt: null }, NOW), `I4: openedAt=${value} contou como abandono`);
}
// Relógio adiantado: carimbo no futuro nunca é purgável.
ok(!isPurgeable({ closedAt: NOW + 1000 * DAY }, NOW), 'I4: carimbo no futuro foi purgado');

// --- I6 + I7: execução de lote e classificação ----------------------------------
/** Executa uma rodada da rotina sobre um universo em memória. */
const runPurge = (episodes, now) => {
  const eligible = episodes.filter((e) => isPurgeable(e, now));
  const deleted = eligible
    .slice()
    .sort((a, b) => a.closedAt - b.closedAt)
    .slice(0, MAX_DELETE_PER_RUN);
  const survivors = episodes.filter((e) => !deleted.includes(e));
  const pending = survivors.filter((e) => isPurgeable(e, now)).length;
  return {
    survivors,
    run: {
      deletedEpisodes: deleted.length,
      pendingEpisodes: pending,
      abandonedOpen: survivors.filter((e) => isAbandonedOpen(e, now)).length,
      truncated: pending > 0,
    },
    eligibleBefore: eligible.length,
  };
};

for (let scenario = 0; scenario < 300; scenario += 1) {
  const size = Math.floor(rnd() * 12_000);
  let episodes = Array.from({ length: size }, () => {
    const openedAt = NOW - rnd() * 3000 * DAY;
    const isOpen = rnd() < 0.15;
    return {
      openedAt,
      closedAt: isOpen ? null : openedAt + rnd() * 400 * DAY,
    };
  });

  // Converge em no máximo ceil(n / teto) + 1 rodadas — se não convergir, a
  // rotina estaria apagando e reintroduzindo trabalho.
  const maxRounds = Math.ceil(size / MAX_DELETE_PER_RUN) + 2;
  let rounds = 0;
  for (;;) {
    const before = episodes.length;
    const { survivors, run, eligibleBefore } = runPurge(episodes, NOW);
    ok(
      run.deletedEpisodes + run.pendingEpisodes === eligibleBefore,
      `I6: conservação quebrada (${run.deletedEpisodes}+${run.pendingEpisodes} ≠ ${eligibleBefore})`,
    );
    ok(run.deletedEpisodes <= MAX_DELETE_PER_RUN, 'I6: teto por execução ultrapassado');
    ok(survivors.length === before - run.deletedEpisodes, 'I6: contagem de sobreviventes inconsistente');
    ok(
      survivors.every((e) => e.closedAt !== null || true) &&
        survivors.filter((e) => e.closedAt === null).length ===
          episodes.filter((e) => e.closedAt === null).length,
      'I1: um episódio aberto desapareceu no expurgo',
    );

    const outcome = classifyPurgeOutcome(run);
    if (run.truncated || run.pendingEpisodes > 0) {
      ok(outcome === 'truncated', 'I7: execução com resto não classificada como truncada');
    } else if (run.abandonedOpen > 0) {
      ok(outcome === 'abandoned_backlog', 'I7: abandono não reportado em execução sem resto');
    } else {
      ok(outcome === 'clean', 'I7: execução limpa mal classificada');
    }
    ok(describePurgeOutcome(run).length > 0, 'I7: descrição vazia');

    episodes = survivors;
    rounds += 1;
    if (run.deletedEpisodes === 0) break;
    ok(rounds <= maxRounds, `I6: expurgo não convergiu em ${maxRounds} rodadas`);
    if (rounds > maxRounds) break;
  }

  // Estado final: nada mais elegível, e todos os abertos preservados.
  ok(episodes.every((e) => !isPurgeable(e, NOW)), 'I6: sobrou linha elegível após convergência');
}

// --- Veredito --------------------------------------------------------------------
if (failures.length > 0) {
  console.error(`❌ Onda 184 reprovada: ${failures.length} falha(s) em ${assertions} asserções.`);
  for (const failure of failures.slice(0, 20)) console.error(`   • ${failure}`);
  process.exit(1);
}
console.log(`✅ Onda 184 — retenção da reincidência: ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`);
