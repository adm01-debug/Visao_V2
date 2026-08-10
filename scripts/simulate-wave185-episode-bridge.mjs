#!/usr/bin/env node
/**
 * Onda 185 — simulação exaustiva do vigia da ponte de episódios.
 *
 * Invariantes verificadas:
 *   I1. "Não sei" nunca é "saudável": com menos de MIN_SAMPLES o veredito é
 *       sempre `insufficient_data` e a severidade é nula.
 *   I2. Drenagem nunca alarma abaixo do patamar absoluto — alarmar durante a
 *       recuperação treina o operador a ignorar o alarme.
 *   I3. Monotonicidade no agravamento: aumentar a última leitura nunca torna o
 *       veredito mais brando nem reduz a severidade.
 *   I4. Teto absoluto é soberano: ≥ ABSOLUTE_CRITICAL_FLOOR é sempre crítico,
 *       inclusive drenando (400 → 399 segue emergência).
 *   I5. Ordem estável e determinística: reembaralhar as amostras não muda o
 *       veredito (a rotina ordena por carimbo, não confia na entrada).
 *   I6. Sujeira nunca vira sinal: leitura no futuro, negativa, fracionária ou
 *       com carimbo ilegível é descartada e jamais serve de base.
 *   I7. Severidade coerente com o veredito, sempre, em todo o espaço.
 *   I8. Janela é recorte, não filtro parcial: amostra fora das 72h não pode
 *       influenciar base nem contagem.
 */

import {
  ABSOLUTE_CRITICAL_FLOOR,
  CRITICAL_GROWTH,
  MIN_SAMPLES,
  NOISE_FLOOR,
  TREND_WINDOW_HOURS,
  WARN_GROWTH,
  assessEpisodeBridge,
} from '../src/lib/retention/episodeBridgeWatch.ts';

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);

let assertions = 0;
const failures = [];
const ok = (condition, message) => {
  assertions += 1;
  if (!condition) failures.push(message);
};

let seed = 0x1f83d9ab;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};

const SEVERITY_OF = {
  insufficient_data: null,
  healthy: null,
  tolerated: null,
  draining: null,
  growing: 'warning',
  stuck: 'critical',
};
const RANK = { insufficient_data: 0, healthy: 0, tolerated: 1, draining: 1, growing: 2, stuck: 3 };

const sample = (hoursAgo, count) => ({ executedAt: NOW - hoursAgo * HOUR, abandonedOpen: count });

// --- I1: amostra insuficiente ------------------------------------------------------
for (let i = 0; i < 5_000; i += 1) {
  const n = Math.floor(rnd() * MIN_SAMPLES); // 0 .. MIN_SAMPLES-1
  const rows = Array.from({ length: n }, () =>
    sample(rnd() * TREND_WINDOW_HOURS, Math.floor(rnd() * 500))
  );
  const a = assessEpisodeBridge(rows, NOW);
  ok(a.verdict === 'insufficient_data', `I1: ${n} amostra(s) produziu '${a.verdict}'`);
  ok(a.severity === null, 'I1: ignorância gerou severidade');
}

// --- I2, I4, I7: espaço amplo de séries -------------------------------------------
for (let i = 0; i < 40_000; i += 1) {
  const n = MIN_SAMPLES + Math.floor(rnd() * 12);
  const start = Math.floor(rnd() * 300);
  const drift = Math.floor(rnd() * 61) - 30; // −30 .. +30 por passo
  const rows = Array.from({ length: n }, (_, k) =>
    sample(
      TREND_WINDOW_HOURS - 1 - (k * (TREND_WINDOW_HOURS - 2)) / n,
      Math.max(0, start + drift * k)
    )
  );
  const a = assessEpisodeBridge(rows, NOW);

  ok(SEVERITY_OF[a.verdict] === a.severity, `I7: severidade incoerente com '${a.verdict}'`);

  if (a.latest >= ABSOLUTE_CRITICAL_FLOOR) {
    ok(a.verdict === 'stuck', `I4: ${a.latest} abandonados não foi crítico (${a.verdict})`);
  }
  if (a.growth <= 0 && a.latest < ABSOLUTE_CRITICAL_FLOOR && a.latest > 0) {
    ok(
      a.severity === null,
      `I2: drenagem alarmou (${a.verdict}, base ${a.baseline} → ${a.latest})`
    );
  }
  if (a.latest === 0) {
    ok(a.verdict === 'healthy', `I7: fila zerada virou '${a.verdict}'`);
  }

  // I5: reembaralhar a entrada não pode mudar nada.
  const shuffled = rows.slice().sort(() => rnd() - 0.5);
  const b = assessEpisodeBridge(shuffled, NOW);
  ok(
    b.verdict === a.verdict && b.growth === a.growth && b.latest === a.latest,
    `I5: veredito dependeu da ordem de entrada ('${a.verdict}' vs '${b.verdict}')`
  );
}

// --- I3: monotonicidade no agravamento ---------------------------------------------
for (let i = 0; i < 20_000; i += 1) {
  const base = Math.floor(rnd() * 90);
  const latest = Math.floor(rnd() * 90);
  const rows = [sample(70, base), sample(40, Math.floor((base + latest) / 2)), sample(1, latest)];
  const a = assessEpisodeBridge(rows, NOW);
  const bump = Math.floor(rnd() * 40) + 1;
  const worse = [rows[0], rows[1], sample(1, latest + bump)];
  const b = assessEpisodeBridge(worse, NOW);
  ok(
    RANK[b.verdict] >= RANK[a.verdict],
    `I3: piorar de ${latest} para ${latest + bump} abrandou o veredito ('${a.verdict}' → '${b.verdict}')`
  );
  ok(b.growth > a.growth, 'I3: crescimento não aumentou ao piorar a última leitura');
}

// --- I6: sujeira nunca vira sinal ----------------------------------------------------
const clean = [sample(70, 4), sample(40, 7), sample(1, 10)];
const expected = assessEpisodeBridge(clean, NOW);
ok(expected.verdict === 'growing', 'I6: cenário de controle mudou de veredito');

const dirt = [
  { executedAt: NOW + 5 * HOUR, abandonedOpen: 0 }, // futuro
  { executedAt: NOW - 10 * HOUR, abandonedOpen: -3 }, // negativo
  { executedAt: NOW - 10 * HOUR, abandonedOpen: 2.5 }, // fracionário
  { executedAt: Number.NaN, abandonedOpen: 900 },
  { executedAt: NOW - 10 * HOUR, abandonedOpen: Number.NaN },
  { executedAt: Number.POSITIVE_INFINITY, abandonedOpen: 900 },
];
for (const bad of dirt) {
  const a = assessEpisodeBridge([bad, ...clean], NOW);
  ok(
    a.verdict === expected.verdict &&
      a.baseline === expected.baseline &&
      a.latest === expected.latest,
    `I6: leitura suja (${JSON.stringify(bad)}) contaminou o veredito → ${a.verdict} base=${a.baseline} latest=${a.latest}`
  );
}
// Relógio de referência ilegível: nada é avaliável.
for (const badNow of [Number.NaN, Number.POSITIVE_INFINITY]) {
  const a = assessEpisodeBridge(clean, badNow);
  ok(a.verdict === 'insufficient_data', `I6: now=${badNow} produziu veredito '${a.verdict}'`);
}

// --- I8: janela é recorte estrito ------------------------------------------------------
for (let i = 0; i < 10_000; i += 1) {
  const old = sample(TREND_WINDOW_HOURS + 1 + rnd() * 500, Math.floor(rnd() * 500));
  const a = assessEpisodeBridge([old, ...clean], NOW);
  ok(
    a.samples === expected.samples && a.baseline === expected.baseline,
    `I8: amostra fora da janela influenciou (samples=${a.samples}, base=${a.baseline})`
  );
}

// --- Fronteiras exatas dos limiares -------------------------------------------------
const series = (base, latest) => [sample(70, base), sample(40, base), sample(1, latest)];
ok(
  assessEpisodeBridge(series(0, WARN_GROWTH), NOW).verdict === 'growing',
  'fronteira: WARN_GROWTH deveria alertar'
);
ok(
  assessEpisodeBridge(series(0, WARN_GROWTH - 1), NOW).verdict === 'tolerated',
  'fronteira: abaixo de WARN_GROWTH deveria tolerar'
);
ok(
  assessEpisodeBridge(series(0, CRITICAL_GROWTH), NOW).verdict === 'stuck',
  'fronteira: CRITICAL_GROWTH deveria ser crítico'
);
ok(
  assessEpisodeBridge(series(0, CRITICAL_GROWTH - 1), NOW).verdict === 'growing',
  'fronteira: abaixo de CRITICAL_GROWTH deveria ser atenção'
);
ok(
  assessEpisodeBridge(series(0, NOISE_FLOOR - 1), NOW).verdict === 'tolerated',
  'fronteira: sob o piso de ruído deveria tolerar'
);
ok(
  assessEpisodeBridge(series(ABSOLUTE_CRITICAL_FLOOR + 10, ABSOLUTE_CRITICAL_FLOOR), NOW)
    .verdict === 'stuck',
  'fronteira: patamar absoluto drenando ainda é crítico'
);
ok(
  assessEpisodeBridge(series(ABSOLUTE_CRITICAL_FLOOR, ABSOLUTE_CRITICAL_FLOOR - 1), NOW).verdict ===
    'draining',
  'fronteira: logo abaixo do patamar, drenando não alarma'
);

// --- Veredito ----------------------------------------------------------------------------
if (failures.length > 0) {
  console.error(`❌ Onda 185 reprovada: ${failures.length} falha(s) em ${assertions} asserções.`);
  for (const failure of failures.slice(0, 20)) console.error(`   • ${failure}`);
  process.exit(1);
}
console.log(
  `✅ Onda 185 — vigia da ponte de episódios: ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`
);
