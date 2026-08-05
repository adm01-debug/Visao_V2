#!/usr/bin/env node
/**
 * Onda 167 — simulação adversarial do guia de atenção entre andares.
 *
 * Exercita, sobre o TypeScript real (via esbuild):
 *   - só convida andar ESTRITAMENTE mais grave que o ativo
 *   - `unknown`, `warning` e `online` nunca viram convite de salto
 *   - o próprio andar ativo jamais é alvo
 *   - ordem determinística: gravidade > contagem em atenção > ordem original
 *   - dispensa cobre o estado dispensado e reabre quando PIORA (gravidade ou
 *     contagem), nunca quando melhora
 *   - dispensa é uma entrada por planta (não cresce sem limite)
 *   - poda remove dispensa de planta que sumiu
 *   - pureza: entradas congeladas jamais são mutadas
 */
import { build } from 'esbuild';
import { resolve } from 'node:path';

const entry = resolve(process.cwd(), 'src/lib/emap/attentionRouter.ts');
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

const {
  adviseCrossFloorAttention,
  isDismissed,
  recordDismissal,
  pruneDismissals,
  describeAttentionAdvice,
} = mod;

let assertions = 0;
let failures = 0;
const check = (condition, message) => {
  assertions += 1;
  if (!condition) {
    failures += 1;
    if (failures <= 20) console.error(`  ✗ ${message}`);
  }
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STATUSES = ['alert', 'offline', 'warning', 'unknown', 'online'];
const RANK = { alert: 0, offline: 1, warning: 2, unknown: 3, online: 4 };
const ROUTABLE = new Set(['alert', 'offline']);

const makeItem = (index, worst, attention, activeId) => ({
  planId: `p${index}`,
  name: `Andar ${index}`,
  isDefault: index === 0,
  shortcut: index < 9 ? index + 1 : null,
  cameraCount: Math.max(attention, 1),
  worst,
  worstCount: Math.max(attention, 1),
  attention,
  isActive: `p${index}` === activeId,
});

console.log('Onda 167 — guia de atenção entre andares\n');

/* ---------- 1. casos canônicos ---------- */
{
  const items = [
    makeItem(0, 'online', 0, 'p0'),
    makeItem(1, 'alert', 3, 'p0'),
    makeItem(2, 'offline', 5, 'p0'),
  ];
  const advice = adviseCrossFloorAttention({ items, activePlanId: 'p0' });
  check(advice.target?.planId === 'p1', 'alarme vence offline mesmo com menos câmeras');
  check(advice.candidates.length === 2, 'os dois andares graves entram como candidatos');
  check(describeAttentionAdvice(advice).includes('+1 andar'), 'frase indica andar extra');

  const onAlert = adviseCrossFloorAttention({ items, activePlanId: 'p1' });
  check(onAlert.target === null, 'operador já no pior andar não recebe convite');

  const onOffline = adviseCrossFloorAttention({ items, activePlanId: 'p2' });
  check(onOffline.target?.planId === 'p1', 'de offline convida para alarme');
}

/* ---------- 2. estados que nunca convidam ---------- */
for (const worst of ['warning', 'unknown', 'online']) {
  const items = [makeItem(0, 'online', 0, 'p0'), makeItem(1, worst, 4, 'p0')];
  const advice = adviseCrossFloorAttention({ items, activePlanId: 'p0' });
  check(advice.target === null, `${worst} nunca gera convite de salto`);
}

/* ---------- 3. dispensa: só piora reavisa ---------- */
{
  const base = makeItem(1, 'offline', 2, 'p0');
  const ledger = recordDismissal([], base);
  check(isDismissed(ledger, base) === true, 'estado idêntico continua dispensado');
  check(isDismissed(ledger, { ...base, attention: 1 }) === true, 'melhora não reabre');
  check(isDismissed(ledger, { ...base, attention: 3 }) === false, 'mais câmeras reabre');
  check(isDismissed(ledger, { ...base, worst: 'alert' }) === false, 'piora de gravidade reabre');
  check(
    isDismissed(ledger, { ...base, worst: 'warning' }) === true,
    'melhora de gravidade não reabre'
  );
  check(recordDismissal(ledger, { ...base, attention: 9 }).length === 1, 'uma entrada por planta');
  check(pruneDismissals(ledger, []).length === 0, 'poda remove planta inexistente');
  check(pruneDismissals(ledger, [base]).length === 1, 'poda preserva planta viva');
}

/* ---------- 4. fuzz determinístico ---------- */
const random = rng(0x167167);
for (let iteration = 0; iteration < 40000; iteration += 1) {
  const count = 1 + Math.floor(random() * 9);
  const activeIndex = Math.floor(random() * (count + 1)); // pode não existir
  const activeId = `p${activeIndex}`;
  const items = Array.from({ length: count }, (_, index) => {
    const worst = STATUSES[Math.floor(random() * STATUSES.length)];
    const attention = ROUTABLE.has(worst) ? Math.floor(random() * 6) : 0;
    return makeItem(index, worst, attention, activeId);
  });
  const frozen = Object.freeze(items.map((item) => Object.freeze({ ...item })));
  const snapshot = JSON.stringify(frozen);

  const dismissals = Object.freeze(
    items
      .filter(() => random() < 0.25)
      .map((item) =>
        Object.freeze({
          planId: item.planId,
          severity: STATUSES[Math.floor(random() * STATUSES.length)],
          attention: Math.floor(random() * 6),
        })
      )
  );

  const advice = adviseCrossFloorAttention({
    items: frozen,
    activePlanId: activeId,
    dismissals,
  });

  check(JSON.stringify(frozen) === snapshot, 'entrada nunca é mutada');

  const active = items.find((item) => item.planId === activeId);
  const activeRank = RANK[active ? active.worst : 'unknown'];

  for (const candidate of [...advice.candidates, ...advice.dismissed]) {
    check(candidate.planId !== activeId, 'andar ativo nunca é candidato');
    check(ROUTABLE.has(candidate.worst), 'candidato é alarme ou offline');
    check(candidate.attention > 0, 'candidato tem câmera em atenção');
    check(RANK[candidate.worst] < activeRank, 'candidato é estritamente mais grave');
  }

  for (let i = 1; i < advice.candidates.length; i += 1) {
    const previous = advice.candidates[i - 1];
    const current = advice.candidates[i];
    const ok =
      RANK[previous.worst] < RANK[current.worst] ||
      (RANK[previous.worst] === RANK[current.worst] &&
        (previous.attention > current.attention ||
          (previous.attention === current.attention &&
            Number(previous.planId.slice(1)) < Number(current.planId.slice(1)))));
    check(ok, 'ordem determinística de candidatos');
  }

  check(
    advice.target === null || advice.target.planId === advice.candidates[0]?.planId,
    'alvo é sempre o primeiro candidato visível'
  );
  check(
    advice.dismissed.every((item) => isDismissed(dismissals, item)),
    'suprimido só sai por dispensa válida'
  );
  check(
    advice.candidates.every((item) => !isDismissed(dismissals, item)),
    'visível nunca está dispensado'
  );
  check(
    (advice.target === null) === (describeAttentionAdvice(advice) === null),
    'frase existe se e somente se há alvo'
  );

  // Idempotência: dispensar o alvo o remove, e nada pior surge do nada.
  if (advice.target) {
    const after = adviseCrossFloorAttention({
      items: frozen,
      activePlanId: activeId,
      dismissals: recordDismissal(dismissals, advice.target),
    });
    check(after.target?.planId !== advice.target.planId, 'dispensar o alvo tira o alvo da vez');
    check(
      after.target === null || RANK[after.target.worst] >= RANK[advice.target.worst],
      'o próximo convite nunca é mais grave que o dispensado'
    );
  }
}

/* ---------- 5. entradas degeneradas ---------- */
{
  const empty = adviseCrossFloorAttention({});
  check(empty.target === null && empty.candidates.length === 0, 'entrada vazia é inerte');
  check(empty.activeSeverity === 'unknown', 'sem ativo a referência é desconhecida');
  check(
    adviseCrossFloorAttention({ items: [null, undefined], activePlanId: null }).target === null,
    'itens inválidos são descartados'
  );
  check(isDismissed(null, makeItem(0, 'alert', 1, 'x')) === false, 'livro nulo não dispensa');
  check(pruneDismissals(null, null).length === 0, 'poda com nulos é segura');
}

console.log(`\n${assertions.toLocaleString('pt-BR')} asserções · ${failures} falhas`);
if (failures > 0) process.exit(1);
console.log('✓ Onda 167 aprovada');
