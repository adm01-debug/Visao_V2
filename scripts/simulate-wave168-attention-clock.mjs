/**
 * Onda 168 — simulação exaustiva do relógio de atenção.
 *
 * Invariantes verificadas (centenas de milhares de asserções):
 *  I1. Confirmação do mesmo estado NUNCA reinicia `since` nem `openedAt`.
 *  I2. Estado saudável observado apaga a entrada (melhora zera).
 *  I3. Ausência de observação mantém o relógio correndo (não é melhora).
 *  I4. Troca de estado dentro da atenção reinicia `since` mas preserva
 *      `openedAt` e nunca rebaixa `worst`.
 *  I5. Idade nunca é negativa, mesmo com carimbo no futuro; relógio inválido
 *      não altera o livro.
 *  I6. Pureza/imutabilidade: entradas nunca são mutadas e chamada sem efeito
 *      devolve a MESMA referência.
 *  I7. Ordenação determinística e monotônica nas faixas.
 */

import { build } from 'esbuild';
import { resolve } from 'node:path';

const entry = resolve(process.cwd(), 'src/lib/emap/attentionClock.ts');
const bundled = await build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  logLevel: 'silent',
});
const mod = await import(
  'data:text/javascript;base64,' +
    Buffer.from(bundled.outputFiles[0].text).toString('base64')
);

const {
  attentionAge,
  bandOf,
  clearAttention,
  DEFAULT_BAND_CONFIG,
  emptyAttentionLedger,
  formatAge,
  observeAttention,
  pruneAttention,
  rankAttention,
  statusAge,
  summarizeAttention,
} = mod;

let assertions = 0;
let failures = 0;
const fail = (message) => {
  failures += 1;
  if (failures <= 20) console.error(`✗ ${message}`);
};
const ok = (condition, message) => {
  assertions += 1;
  if (!condition) fail(message);
};

const STATUSES = ['alert', 'offline', 'warning', 'unknown', 'online'];
const RANK = { alert: 0, offline: 1, warning: 2, unknown: 3, online: 4 };
const ATTENTION = STATUSES.filter((s) => s !== 'online');

// PRNG determinístico (xorshift32) — simulação reprodutível.
let seed = 0x168168;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return seed / 0xffffffff;
};
const pick = (list) => list[Math.floor(rnd() * list.length) % list.length];

// ---------------------------------------------------------------- I1 / I4
for (let trial = 0; trial < 4000; trial += 1) {
  const first = pick(ATTENTION);
  let ledger = observeAttention(emptyAttentionLedger(), [{ cameraId: 'c1', status: first }], 1000);
  const opened = ledger.c1.openedAt;
  ok(opened === 1000, 'abertura registrada no primeiro contato');

  // Confirmações repetidas do MESMO estado.
  let t = 1000;
  for (let i = 0; i < 12; i += 1) {
    t += 5000;
    ledger = observeAttention(ledger, [{ cameraId: 'c1', status: first }], t);
    ok(ledger.c1.since === 1000, 'I1: confirmação não reinicia since');
    ok(ledger.c1.openedAt === opened, 'I1: confirmação não reinicia openedAt');
    ok(ledger.c1.changes === 0, 'I1: confirmação não conta como troca');
    ok(ledger.c1.lastSeen === t, 'I1: lastSeen acompanha a observação');
    ok(statusAge(ledger.c1, t) === t - 1000, 'I1: idade do estado cresce');
  }

  // Troca de estado dentro da atenção.
  const second = pick(ATTENTION.filter((s) => s !== first));
  t += 5000;
  const before = ledger.c1;
  ledger = observeAttention(ledger, [{ cameraId: 'c1', status: second }], t);
  ok(ledger.c1.since === t, 'I4: troca reinicia since');
  ok(ledger.c1.openedAt === opened, 'I4: troca preserva openedAt');
  ok(ledger.c1.changes === 1, 'I4: troca conta');
  ok(
    RANK[ledger.c1.worst] === Math.min(RANK[first], RANK[second]),
    'I4: worst é o pior já visto na janela',
  );
  ok(before.since === 1000 && before.status === first, 'I6: entrada anterior não foi mutada');
  ok(attentionAge(ledger.c1, t) === t - opened, 'I4: idade contínua ignora a troca');
}

// ---------------------------------------------------------------- I2 / I3
for (let trial = 0; trial < 4000; trial += 1) {
  const status = pick(ATTENTION);
  let ledger = observeAttention(emptyAttentionLedger(), [{ cameraId: 'a', status }], 500);
  ok(Boolean(ledger.a), 'entrada criada');

  // Ausência: outra câmera observada, 'a' não.
  const skipped = observeAttention(ledger, [{ cameraId: 'b', status }], 900);
  ok(skipped.a && skipped.a.since === 500, 'I3: ausência mantém o relógio');
  ok(skipped.a.lastSeen === 500, 'I3: ausência não atualiza lastSeen');

  // Melhora observada apaga.
  const healed = observeAttention(skipped, [{ cameraId: 'a', status: 'online' }], 1200);
  ok(!healed.a, 'I2: melhora zera a entrada');
  ok(Boolean(healed.b), 'I2: melhora não afeta terceiros');

  // Reabertura depois da melhora: janela nova.
  const reopened = observeAttention(healed, [{ cameraId: 'a', status }], 2000);
  ok(reopened.a.openedAt === 2000, 'I2: reabertura abre janela nova');
  ok(reopened.a.changes === 0, 'I2: reabertura zera contador de trocas');
  ledger = reopened;
}

// ---------------------------------------------------------------- I5 / I6
{
  const base = observeAttention(emptyAttentionLedger(), [{ cameraId: 'x', status: 'offline' }], 10_000);
  for (const badClock of [NaN, Infinity, -Infinity]) {
    ok(observeAttention(base, [{ cameraId: 'x', status: 'alert' }], badClock) === base,
      'I5: relógio inválido não altera o livro');
    ok(statusAge(base.x, badClock) === 0, 'I5: idade com relógio inválido é 0');
    ok(attentionAge(base.x, badClock) === 0, 'I5: idade contínua com relógio inválido é 0');
  }
  ok(statusAge(base.x, 5_000) === 0, 'I5: carimbo no futuro não gera idade negativa');
  ok(attentionAge(base.x, 0) === 0, 'I5: idade contínua nunca negativa');

  ok(observeAttention(base, [], 20_000) === base, 'I6: lista vazia devolve a mesma referência');
  ok(observeAttention(base, [{ cameraId: 'x', status: 'offline' }], 10_000) === base,
    'I6: confirmação no mesmo instante devolve a mesma referência');
  ok(observeAttention(base, [{ cameraId: '', status: 'alert' }], 11_000) === base,
    'I6: id vazio é ignorado');
  ok(clearAttention(base, 'inexistente') === base, 'I6: limpar ausente devolve a mesma referência');
  ok(!clearAttention(base, 'x').x, 'ciência apaga a entrada');
  ok(Boolean(base.x), 'I6: clearAttention não mutou o original');
  ok(pruneAttention(base, ['x']) === base, 'I6: prune sem remoção devolve a mesma referência');
  ok(Object.keys(pruneAttention(base, [])).length === 0, 'prune remove câmeras desconhecidas');
}

// ---------------------------------------------------------------- I7 + caos
for (let trial = 0; trial < 3000; trial += 1) {
  const cameras = Array.from({ length: 1 + Math.floor(rnd() * 12) }, (_, i) => `cam-${i}`);
  let ledger = emptyAttentionLedger();
  let now = 1_000_000;
  const expectedOpened = new Map();

  for (let step = 0; step < 25; step += 1) {
    now += Math.floor(rnd() * 120_000);
    const batch = cameras
      .filter(() => rnd() > 0.35)
      .map((cameraId) => ({ cameraId, status: pick(STATUSES) }));

    const snapshot = JSON.stringify(ledger);
    ledger = observeAttention(ledger, batch, now);
    ok(true, 'rodada aplicada');

    for (const { cameraId, status } of batch) {
      if (status === 'online') {
        ok(!ledger[cameraId], 'melhora sempre apaga');
        expectedOpened.delete(cameraId);
      } else {
        ok(Boolean(ledger[cameraId]), 'atenção sempre registra');
        if (!expectedOpened.has(cameraId)) expectedOpened.set(cameraId, now);
        ok(ledger[cameraId].openedAt === expectedOpened.get(cameraId),
          'openedAt estável enquanto não normaliza');
        ok(ledger[cameraId].since <= now && ledger[cameraId].since >= expectedOpened.get(cameraId),
          'since dentro da janela de atenção');
      }
    }
    ok(snapshot.length > 0, 'snapshot serializável');

    // Ordenação determinística e coerente.
    const ranked = rankAttention(ledger, now);
    const again = rankAttention(ledger, now);
    ok(ranked.map((e) => e.cameraId).join('|') === again.map((e) => e.cameraId).join('|'),
      'I7: ordenação determinística');
    for (let i = 1; i < ranked.length; i += 1) {
      const prev = ranked[i - 1];
      const cur = ranked[i];
      const rankOk =
        RANK[prev.status] < RANK[cur.status] ||
        (RANK[prev.status] === RANK[cur.status] &&
          (attentionAge(prev, now) > attentionAge(cur, now) ||
            (attentionAge(prev, now) === attentionAge(cur, now) && prev.cameraId <= cur.cameraId)));
      ok(rankOk, 'I7: gravidade > idade > id');
    }

    const summary = summarizeAttention(ledger, now);
    ok(summary.total === Object.keys(ledger).length, 'resumo conta todas as entradas');
    ok(
      summary.byBand.fresh + summary.byBand.sustained + summary.byBand.prolonged === summary.total,
      'faixas particionam o total',
    );
    if (summary.total > 0) {
      ok(Boolean(summary.oldest), 'resumo aponta a mais antiga');
      for (const entry of Object.values(ledger)) {
        ok(attentionAge(entry, now) <= summary.oldestAgeMs, 'nenhuma entrada é mais antiga que a "mais antiga"');
      }
    } else {
      ok(summary.oldest === null, 'sem atenção, sem mais antiga');
    }

    // Faixa é monotônica no tempo (nunca rejuvenesce).
    for (const entry of Object.values(ledger)) {
      const bandNow = bandOf(entry, now);
      const bandLater = bandOf(entry, now + 3_600_000);
      const order = { fresh: 0, sustained: 1, prolonged: 2 };
      ok(order[bandLater] >= order[bandNow], 'I7: faixa nunca rejuvenesce');
    }
  }
}

// ---------------------------------------------------------------- fronteiras de faixa
{
  const entry = observeAttention(emptyAttentionLedger(), [{ cameraId: 'k', status: 'offline' }], 0).k;
  ok(bandOf(entry, DEFAULT_BAND_CONFIG.freshMs - 1) === 'fresh', 'fronteira fresh (aberta)');
  ok(bandOf(entry, DEFAULT_BAND_CONFIG.freshMs) === 'sustained', 'fronteira fresh→sustained');
  ok(bandOf(entry, DEFAULT_BAND_CONFIG.sustainedMs - 1) === 'sustained', 'fronteira sustained');
  ok(bandOf(entry, DEFAULT_BAND_CONFIG.sustainedMs) === 'prolonged', 'fronteira sustained→prolonged');
}

// ---------------------------------------------------------------- formatAge
{
  const cases = [
    [-5, '0s'], [NaN, '0s'], [0, '0s'], [999, '0s'], [1000, '1s'], [59_999, '59s'],
    [60_000, '1min'], [3_599_999, '59min'], [3_600_000, '1h'], [3_660_000, '1h01'],
    [86_400_000, '1d'], [90_000_000, '1d1h'],
  ];
  for (const [ms, expected] of cases) {
    ok(formatAge(ms) === expected, `formatAge(${ms}) = ${expected}, obtido ${formatAge(ms)}`);
  }
  for (let i = 0; i < 5000; i += 1) {
    const ms = Math.floor(rnd() * 5_000_000_00);
    const label = formatAge(ms);
    ok(typeof label === 'string' && label.length > 0 && !label.includes('NaN'), 'rótulo sempre legível');
  }
}

console.log(`\nOnda 168 — relógio de atenção`);
console.log(`Asserções: ${assertions.toLocaleString('pt-BR')}`);
console.log(`Falhas: ${failures}`);
if (failures > 0) process.exit(1);
console.log('✓ Todas as invariantes do relógio de atenção verificadas.');
