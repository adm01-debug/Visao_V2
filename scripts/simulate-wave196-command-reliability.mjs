#!/usr/bin/env node
/**
 * Onda 196 — simulação da reputação de obediência ao comando.
 *
 * Não confere "a função roda": confere as invariantes que precisam continuar
 * verdadeiras quando a série de ordens muda de forma imprevisível.
 *
 * Rodar: bun scripts/simulate-wave196-command-reliability.mjs
 */

import {
  classifyCommandReliability,
  classifyFleetReliability,
  compareReliability,
  DEAF_THRESHOLD,
  HYSTERESIS,
  MIN_SAMPLE,
  SUSPECT_THRESHOLD,
  summarizeReliability,
  wilsonLowerBound,
} from '../src/lib/devices/commandReliability.ts';

let assertions = 0;
const failures = [];
const check = (cond, label) => {
  assertions += 1;
  if (!cond) failures.push(label);
};

// PRNG determinístico (xorshift32): mesma semente, mesma bateria, sempre.
let seed = 0x196c0de;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];

const COMMANDS = ['device.reboot', 'osd.write', 'config.read'];
const TERMINAL = ['completed', 'failed', 'expired', 'cancelled'];
const LIVE = ['queued', 'awaiting_presence', 'delivered'];

const row = (over = {}) => ({
  registrationId: 'r1',
  command: 'config.read',
  status: 'completed',
  settledBy: 'device',
  settledAt: 1_000,
  ...over,
});

// --- 1. Wilson: propriedades matemáticas -----------------------------------
for (let n = 0; n <= 200; n += 1) {
  for (let k = 0; k <= n; k += Math.max(1, Math.floor(n / 7))) {
    const lb = wilsonLowerBound(k, n);
    check(lb >= 0 && lb <= 1, `Wilson fora de [0,1] em ${k}/${n}`);
    check(lb <= (n === 0 ? 1 : k / n) + 1e-9, `piso acima da proporção em ${k}/${n}`);
    if (n > 0 && k > 0) {
      check(
        wilsonLowerBound(k, n) <= wilsonLowerBound(k + 1, n + 1) + 1e-9,
        `piso não monotônico em ${k}/${n}`,
      );
    }
  }
}
check(wilsonLowerBound(0, 0) === 0, 'amostra vazia deveria dar piso zero');
check(wilsonLowerBound(3, 3) < 1, 'certeza absoluta com n=3 é ilusão estatística');

// --- 2. Amostra pequena nunca é saúde --------------------------------------
for (let n = 0; n < MIN_SAMPLE; n += 1) {
  for (let silent = 0; silent <= n; silent += 1) {
    const rows = Array.from({ length: n }, (_, i) =>
      row({
        status: i < silent ? 'expired' : 'completed',
        settledBy: i < silent ? 'sweep' : 'device',
      }),
    );
    const v = classifyCommandReliability('r1', rows);
    check(v.state === 'insufficient_evidence', `n=${n} silent=${silent} deveria ser "não sei"`);
    check(v.severity === null, 'evidência insuficiente não pode gerar chamado');
    check(v.sample === n, 'amostra declarada diferente da olhada');
  }
}

// --- 3. Ordem viva jamais entra na conta -----------------------------------
for (const status of LIVE) {
  const rows = [...Array.from({ length: 20 }, () => row({ status })), row()];
  const v = classifyCommandReliability('r1', rows);
  check(v.sample === 1, `estado vivo "${status}" vazou para a amostra`);
}

// --- 4. Retrato incompleto e outro dono são descartados --------------------
check(
  classifyCommandReliability('r1', [row({ settledAt: null }), row()]).sample === 1,
  'ordem sem carimbo de encerramento entrou na conta',
);
check(
  classifyCommandReliability('r1', [row({ registrationId: 'r2' }), row()]).sample === 1,
  'ordem de outro equipamento entrou na conta',
);

// --- 5. Janela: nada anterior ao corte pode contar -------------------------
for (let since = 0; since <= 2_000; since += 250) {
  const rows = Array.from({ length: 12 }, (_, i) => row({ settledAt: i * 200 }));
  const v = classifyCommandReliability('r1', rows, { since });
  const expected = rows.filter((r) => r.settledAt >= since).length;
  check(v.sample === expected, `janela since=${since} contou ${v.sample}, esperado ${expected}`);
}

// --- 6. Silêncio nunca é tratado como falha declarada ----------------------
{
  const silentAll = Array.from({ length: 12 }, () =>
    row({ status: 'expired', settledBy: 'sweep' }),
  );
  const failedAll = Array.from({ length: 12 }, () =>
    row({ status: 'failed', settledBy: 'device' }),
  );
  const s = classifyCommandReliability('r1', silentAll);
  const f = classifyCommandReliability('r1', failedAll);
  check(s.state === 'deaf', 'silêncio total deveria ser surdez');
  check(f.state === 'failing', 'falha declarada total deveria ser "falhando", não surdez');
  check(f.silent === 0, 'laudo de falha contou como silêncio');
  check(
    s.severity === 'critical' && f.severity === 'warning',
    'quem responde honestamente não pode ser punido igual a quem some',
  );
}

// --- 7. Monotonicidade: mais silêncio nunca melhora o veredito -------------
const RANK = { deaf: 0, suspect: 1, failing: 2, healthy: 3, insufficient_evidence: 4 };
for (let n = MIN_SAMPLE; n <= 60; n += 1) {
  let prevRank = 5;
  for (let silent = 0; silent <= n; silent += 1) {
    const rows = Array.from({ length: n }, (_, i) =>
      row({
        status: i < silent ? 'expired' : 'completed',
        settledBy: i < silent ? 'sweep' : 'device',
      }),
    );
    const v = classifyCommandReliability('r1', rows);
    check(RANK[v.state] <= prevRank, `n=${n}: ${silent} silêncios melhorou o veredito`);
    check(
      v.silentLowerBound >= 0 && v.silentLowerBound <= v.silentRate + 1e-9,
      'piso acima da taxa observada',
    );
    prevRank = RANK[v.state];
  }
}

// --- 8. Histerese: não oscila, mas agravamento sempre passa ----------------
for (let n = MIN_SAMPLE; n <= 40; n += 1) {
  for (let silent = 0; silent <= n; silent += 1) {
    const rows = Array.from({ length: n }, (_, i) =>
      row({
        status: i < silent ? 'expired' : 'completed',
        settledBy: i < silent ? 'sweep' : 'device',
      }),
    );
    const fresh = classifyCommandReliability('r1', rows);
    const fromDeaf = classifyCommandReliability('r1', rows, { previous: 'deaf' });
    const fromHealthy = classifyCommandReliability('r1', rows, { previous: 'healthy' });
    check(
      RANK[fromDeaf.state] <= RANK[fresh.state],
      'histerese deveria segurar a melhora, não acelerá-la',
    );
    check(
      RANK[fromHealthy.state] >= RANK[fresh.state],
      'partir de saudável não pode piorar mais que a leitura crua',
    );
    if (fresh.silentLowerBound >= DEAF_THRESHOLD) {
      check(fromHealthy.state === 'deaf', 'agravamento acima do corte tem de passar a histerese');
    }
    if (fresh.silentLowerBound < SUSPECT_THRESHOLD - HYSTERESIS) {
      check(fromDeaf.state !== 'deaf', 'histerese não pode prender o equipamento curado');
    }
  }
}

// --- 9. Ato físico sem destino só eleva ------------------------------------
for (const command of COMMANDS) {
  const rows = [
    ...Array.from({ length: 9 }, () => row({ status: 'completed', settledBy: 'device' })),
    row({ status: 'expired', settledBy: 'sweep', command }),
  ];
  const v = classifyCommandReliability('r1', rows);
  const effectful = command !== 'config.read';
  check(
    effectful ? v.severity === 'warning' : v.severity === null,
    `ato físico "${command}" com destino desconhecido classificou errado`,
  );
  check(v.state === 'healthy', 'um silêncio isolado não pode condenar a série');
}

// --- 10. Fuzz determinístico: invariantes globais --------------------------
for (let iter = 0; iter < 30_000; iter += 1) {
  const devices = 1 + Math.floor(rnd() * 4);
  const rows = [];
  for (let i = 0; i < 1 + Math.floor(rnd() * 25); i += 1) {
    const terminal = rnd() < 0.8;
    const bySweep = rnd() < 0.35;
    rows.push({
      registrationId: `r${Math.floor(rnd() * devices)}`,
      command: pick(COMMANDS),
      status: terminal ? (bySweep ? pick(['expired', 'failed']) : pick(TERMINAL)) : pick(LIVE),
      settledBy: terminal ? (bySweep ? 'sweep' : 'device') : null,
      settledAt: terminal ? Math.floor(rnd() * 10_000) : null,
    });
  }
  const verdicts = classifyFleetReliability(rows);
  const summary = summarizeReliability(verdicts);

  check(
    summary.total ===
      summary.deaf + summary.suspect + summary.failing + summary.healthy + summary.unknown,
    'resumo não fecha com os vereditos',
  );
  check(
    summary.actionable >= summary.deaf + summary.suspect + summary.failing,
    'acionável menor que a soma dos estados que exigem ação',
  );

  for (let i = 1; i < verdicts.length; i += 1) {
    check(compareReliability(verdicts[i - 1], verdicts[i]) <= 0, 'ordenação não é urgência-first');
  }

  for (const v of verdicts) {
    check(
      v.silent + v.declaredFailures + v.completed <= v.sample,
      'partes maiores que o todo na amostra',
    );
    check(v.unresolvedEffectful <= v.silent, 'ato físico sem destino maior que o silêncio total');
    check(
      v.state !== 'healthy' || v.silentLowerBound < SUSPECT_THRESHOLD,
      'saudável acima do corte de suspeita',
    );
    check(
      v.state !== 'insufficient_evidence' || v.sample < MIN_SAMPLE,
      'amostra suficiente rotulada como "não sei"',
    );
    check(v.severity === null || v.state !== 'insufficient_evidence', '"não sei" gerou chamado');
  }
}

// --- 11. Determinismo: mesma entrada, mesmo veredito -----------------------
{
  const rows = Array.from({ length: 40 }, (_, i) =>
    row({
      registrationId: `r${i % 3}`,
      command: COMMANDS[i % 3],
      status: i % 4 === 0 ? 'expired' : 'completed',
      settledBy: i % 4 === 0 ? 'sweep' : 'device',
      settledAt: i * 97,
    }),
  );
  const a = JSON.stringify(classifyFleetReliability(rows));
  for (let i = 0; i < 200; i += 1) {
    check(JSON.stringify(classifyFleetReliability(rows)) === a, 'veredito não é determinístico');
  }
}

if (failures.length > 0) {
  const unique = [...new Set(failures)];
  console.error(unique.slice(0, 20).map((f) => `✗ ${f}`).join('\n'));
  console.error(`\n❌ Onda 196 — ${failures.length} falhas em ${assertions} asserções.`);
  process.exit(1);
}

console.log(
  `\n✅ Onda 196 — reputação de obediência ao comando: ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`,
);
