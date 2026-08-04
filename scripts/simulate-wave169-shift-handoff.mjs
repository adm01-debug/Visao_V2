/**
 * Onda 169 — simulação exaustiva da passagem de turno.
 *
 * Invariantes verificadas:
 *  I1. Reconhecer NUNCA vira "normalizado": o motivo do fechamento é
 *      preservado bit a bit e as contagens não se misturam.
 *  I2. Item aberto antes do início do turno é SEMPRE herdado; nunca entra em
 *      "surgido no turno" — e a soma herdado+surgido é o total aberto.
 *  I3. Remoção do escopo fecha como `removed`, jamais como `normalized`.
 *  I4. O teto de detalhe nunca corrompe as contagens absolutas: totals é
 *      igual ao número real de fechamentos, mesmo com `dropped > 0`.
 *  I5. Idempotência: regravar o mesmo lote (StrictMode) não duplica história.
 *  I6. Pureza/imutabilidade: diário anterior nunca é mutado; chamada sem
 *      efeito devolve a MESMA referência.
 *  I7. Determinismo: ordenação estável de abertos (gravidade → idade → id) e
 *      de fechamentos (mais recente → id).
 *  I8. Robustez: relógio inválido, id vazio e carimbo no futuro não criam
 *      registros mentirosos; idade nunca é negativa.
 *  I9. O relatório de texto nunca afirma resolução para item reconhecido e
 *      sempre declara o total real quando há detalhe omitido.
 */

import { build } from 'esbuild';
import { resolve } from 'node:path';

const entry = resolve(process.cwd(), 'src/lib/emap/shiftHandoff.ts');
const bundled = await build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  logLevel: 'silent',
});
const mod = await import(
  'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
);

const { buildHandoff, closureOf, diffClosures, formatHandoffReport, openShift, recordClosures } =
  mod;

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

const ATTENTION = ['alert', 'offline', 'warning', 'unknown'];
const RANK = { alert: 0, offline: 1, warning: 2, unknown: 3, online: 4 };
const REASONS = ['normalized', 'acknowledged', 'removed'];

let seed = 0x169169;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return seed / 0xffffffff;
};
const pick = (list) => list[Math.floor(rnd() * list.length) % list.length];

const entryOf = (cameraId, status, openedAt, changes = 0) => ({
  cameraId,
  status,
  since: openedAt,
  openedAt,
  worst: status,
  changes,
  lastSeen: openedAt,
});

const ledgerOf = (entries) => Object.fromEntries(entries.map((e) => [e.cameraId, e]));

// ------------------------------------------------------------------ I1/I3
for (let trial = 0; trial < 3000; trial += 1) {
  const reason = pick(REASONS);
  const openedAt = 1_000 + Math.floor(rnd() * 10_000);
  const closedAt = openedAt + 1 + Math.floor(rnd() * 10_000);
  const entry = entryOf('cam-a', pick(ATTENTION), openedAt);
  const closure = closureOf(entry, closedAt, reason);
  ok(closure.reason === reason, 'I1/I3: motivo do fechamento é preservado');

  const journal = recordClosures(openShift(0), [closure]);
  for (const other of REASONS) {
    ok(
      journal.totals[other] === (other === reason ? 1 : 0),
      'I1/I3: contadores não se contaminam entre motivos'
    );
  }
  const handoff = buildHandoff(journal, {}, closedAt + 1);
  ok(handoff.closed[reason].length === 1, 'I1/I3: fechamento aparece no grupo certo');
  for (const other of REASONS) {
    if (other === reason) continue;
    ok(handoff.closed[other].length === 0, 'I1/I3: nenhum vazamento entre grupos');
  }
}

// --------------------------------------------------------------------- I2
for (let trial = 0; trial < 3000; trial += 1) {
  const startedAt = 100_000;
  const count = 1 + Math.floor(rnd() * 8);
  const entries = [];
  let expectedInherited = 0;
  for (let i = 0; i < count; i += 1) {
    const inherited = rnd() < 0.5;
    if (inherited) expectedInherited += 1;
    const openedAt = inherited
      ? startedAt - 1 - Math.floor(rnd() * 50_000)
      : startedAt + Math.floor(rnd() * 50_000);
    entries.push(entryOf(`cam-${i}`, pick(ATTENTION), openedAt));
  }
  const now = startedAt + 100_000;
  const handoff = buildHandoff(openShift(startedAt), ledgerOf(entries), now);
  ok(handoff.open.length === count, 'I2: todos os abertos são listados');
  ok(
    handoff.inheritedCount === expectedInherited,
    'I2: herança contada pelo relógio, não pelo palpite'
  );
  ok(
    handoff.inheritedCount + handoff.arisenCount === handoff.open.length,
    'I2: herdado + surgido = total aberto'
  );
  for (const item of handoff.open) {
    ok(item.inherited === item.openedAt < startedAt, 'I2: herança é openedAt < startedAt');
    ok(item.ageMs >= 0, 'I8: idade nunca negativa');
    ok(item.ageMs === now - item.openedAt, 'I2: idade medida da abertura contínua');
  }
  // I7 — ordenação estável.
  for (let i = 1; i < handoff.open.length; i += 1) {
    const a = handoff.open[i - 1];
    const b = handoff.open[i];
    const ra = RANK[a.status];
    const rb = RANK[b.status];
    ok(
      ra < rb ||
        (ra === rb && (a.ageMs > b.ageMs || (a.ageMs === b.ageMs && a.cameraId <= b.cameraId))),
      'I7: abertos ordenados por gravidade → idade → id'
    );
  }
  if (handoff.oldest) {
    for (const item of handoff.open) {
      ok(handoff.oldest.ageMs >= item.ageMs, 'I2: `oldest` é realmente o mais antigo');
    }
  }
}

// --------------------------------------------------------------------- I4
for (let trial = 0; trial < 400; trial += 1) {
  const max = 3 + Math.floor(rnd() * 6);
  const total = max + 1 + Math.floor(rnd() * 40);
  let journal = openShift(0);
  const expected = { normalized: 0, acknowledged: 0, removed: 0 };
  for (let i = 0; i < total; i += 1) {
    const reason = pick(REASONS);
    expected[reason] += 1;
    const closure = closureOf(entryOf(`cam-${i}`, pick(ATTENTION), i * 10), i * 10 + 5, reason);
    journal = recordClosures(journal, [closure], { maxClosures: max });
  }
  ok(journal.closures.length === max, 'I4: teto de detalhe respeitado');
  ok(journal.dropped === total - max, 'I4: descartes contabilizados');
  for (const reason of REASONS) {
    ok(journal.totals[reason] === expected[reason], 'I4: contagem absoluta imune ao teto');
  }
  const sum = REASONS.reduce((acc, r) => acc + journal.totals[r], 0);
  ok(sum === total, 'I4: soma dos totais = fechamentos reais');
  // I7 — detalhe do mais recente para o mais antigo.
  for (let i = 1; i < journal.closures.length; i += 1) {
    ok(
      journal.closures[i - 1].closedAt >= journal.closures[i].closedAt,
      'I7: fechamentos em ordem decrescente de instante'
    );
  }
}

// --------------------------------------------------------------------- I5
for (let trial = 0; trial < 2000; trial += 1) {
  const reason = pick(REASONS);
  const closure = closureOf(entryOf('cam-x', pick(ATTENTION), 500), 900, reason);
  const once = recordClosures(openShift(0), [closure]);
  const twice = recordClosures(once, [closure]);
  const thrice = recordClosures(twice, [closure, closure]);
  ok(twice === once, 'I5/I6: regravar o mesmo fechamento devolve a mesma referência');
  ok(thrice === once, 'I5: lote com duplicata interna não duplica história');
  ok(once.totals[reason] === 1, 'I5: contador não infla com repetição');
  ok(recordClosures(once, []) === once, 'I6: lote vazio devolve a mesma referência');
}

// ------------------------------------------------------------------ I6/I8
for (let trial = 0; trial < 2000; trial += 1) {
  const previous = ledgerOf([
    entryOf('a', 'offline', 100),
    entryOf('b', 'alert', 200),
    entryOf('c', 'warning', 300),
  ]);
  const snapshot = JSON.stringify(previous);
  const next = { b: previous.b };
  const closures = diffClosures(previous, next, 1000, 'normalized');
  ok(closures.length === 2, 'I6: fechou exatamente quem saiu do livro');
  ok(
    closures.every((c) => c.cameraId !== 'b'),
    'I6: quem continua aberto não fecha'
  );
  ok(JSON.stringify(previous) === snapshot, 'I6: livro anterior nunca é mutado');

  ok(
    diffClosures(previous, next, Number.NaN, 'normalized').length === 0,
    'I8: relógio inválido não fecha nada'
  );
  ok(diffClosures(previous, next, Infinity, 'removed').length === 0, 'I8: infinito não fecha nada');

  // Carimbo no passado não produz duração negativa.
  const past = closureOf(entryOf('z', 'offline', 5_000), 1_000, 'normalized');
  ok(past.closedAt >= past.openedAt, 'I8: fechamento nunca antecede a abertura');

  const badId = recordClosures(openShift(0), [{ ...past, cameraId: '' }]);
  ok(badId.closures.length === 0, 'I8: id vazio é descartado');
  const badClock = recordClosures(openShift(0), [{ ...past, closedAt: Number.NaN }]);
  ok(badClock.closures.length === 0, 'I8: carimbo inválido é descartado');
}

// --------------------------------------------------------------------- I9
for (let trial = 0; trial < 800; trial += 1) {
  const startedAt = 0;
  let journal = openShift(startedAt);
  const ackCount = 1 + Math.floor(rnd() * 4);
  for (let i = 0; i < ackCount; i += 1) {
    journal = recordClosures(journal, [
      closureOf(entryOf(`ack-${i}`, 'offline', i * 100), i * 100 + 50, 'acknowledged'),
    ]);
  }
  const flapper = entryOf('flap', 'alert', 10, 5);
  const handoff = buildHandoff(journal, ledgerOf([flapper]), 60_000);
  const text = formatHandoffReport(handoff, (id) => `Câmera ${id}`);

  ok(text.includes('PASSAGEM DE TURNO'), 'I9: cabeçalho presente');
  ok(
    text.includes(`reconhecidas sem normalizar: ${ackCount}`),
    'I9: reconhecidas declaradas como não normalizadas'
  );
  ok(text.includes('normalizadas: 0'), 'I9: reconhecimento não vira normalização no texto');
  ok(text.includes('"reconhecida" NÃO significa resolvida'), 'I9: ressalva sempre impressa');
  ok(text.includes('Câmera flap'), 'I9: aberto aparece na passagem');
  ok(handoff.flapping.includes('flap'), 'I9: oscilação detectada (≥3 trocas)');

  const truncated = buildHandoff({ ...journal, dropped: 7 }, ledgerOf([flapper]), 60_000);
  const truncatedText = formatHandoffReport(truncated, (id) => id);
  ok(truncatedText.includes('contagens acima são completas'), 'I9: omissão de detalhe é declarada');
}

// ---------------------------------------------------- ciclo completo (E2E)
for (let trial = 0; trial < 600; trial += 1) {
  const startedAt = 1_000_000;
  let journal = openShift(startedAt);
  let ledger = ledgerOf([
    entryOf('porta', 'offline', startedAt - 3_600_000), // herdada
    entryOf('doca', 'warning', startedAt + 5_000),
  ]);
  // Normaliza a doca.
  let next = { porta: ledger.porta };
  journal = recordClosures(journal, diffClosures(ledger, next, startedAt + 60_000, 'normalized'));
  ledger = next;
  // Operador dá ciência da portaria (não resolveu!).
  next = {};
  journal = recordClosures(journal, diffClosures(ledger, next, startedAt + 90_000, 'acknowledged'));
  ledger = next;

  const handoff = buildHandoff(journal, ledger, startedAt + 120_000);
  ok(handoff.open.length === 0, 'E2E: fila vazia após fechar tudo');
  ok(handoff.totals.normalized === 1, 'E2E: uma normalização real');
  ok(handoff.totals.acknowledged === 1, 'E2E: uma pendência reconhecida');
  ok(handoff.totals.removed === 0, 'E2E: nada saiu do escopo');
  const acked = handoff.closed.acknowledged[0];
  ok(acked.cameraId === 'porta', 'E2E: a portaria continua na passagem mesmo "ciente"');
  ok(acked.closedAt - acked.openedAt >= 3_600_000, 'E2E: duração herdada preservada');
  ok(handoff.durationMs === 120_000, 'E2E: duração do turno medida do início real');
}

console.log(
  `\nOnda 169 — passagem de turno: ${assertions.toLocaleString('pt-BR')} asserções, ${failures} falha(s).`
);
if (failures > 0) process.exit(1);
