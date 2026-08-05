#!/usr/bin/env node
/**
 * Onda 166 — simulação adversarial da navegação entre plantas (multi-andar).
 *
 * O módulo importa geometria, então em vez de descascar tipos por regex nós
 * empacotamos com esbuild: mais fiel ao que a aplicação realmente executa.
 *
 * Exercita:
 *   - ordem estável (atalho nunca troca de andar entre renders)
 *   - numeração 1..9 e ausência de atalho a partir da décima planta
 *   - pior estado por planta (nunca média), planta vazia = desconhecida
 *   - deduplicação de plantas e de câmeras
 *   - ativo inválido/ausente resolvido para a primeira planta
 *   - passo circular next/previous (ida e volta é identidade)
 *   - alvo de digitação nunca sequestra atalho
 *   - pureza: entrada congelada jamais é mutada
 */
import { build } from 'esbuild';
import { resolve } from 'node:path';

const entry = resolve(process.cwd(), 'src/lib/emap/planNavigator.ts');
const bundled = await build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  logLevel: 'silent',
});
const code = bundled.outputFiles[0].text;
const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

const {
  buildPlanNavigation,
  resolveShortcutTarget,
  stepPlan,
  isEditableTarget,
  describePlanStatus,
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

const STATUSES = ['alert', 'offline', 'warning', 'online', 'unknown'];
const SEVERITY = { alert: 0, offline: 1, warning: 2, unknown: 3, online: 4 };

// ---------------------------------------------------------------- casos fixos
{
  const plans = [
    { id: 'p1', name: 'Térreo', isDefault: true },
    { id: 'p2', name: 'Primeiro andar' },
    { id: 'p1', name: 'Duplicata proibida' },
    { id: '   ', name: 'Sem id' },
    null,
  ];
  const nav = buildPlanNavigation({
    plans,
    roster: { p1: ['c1', 'c2', 'c1'], p2: [] },
    statusOf: (id) => (id === 'c1' ? 'alert' : 'online'),
    activePlanId: 'p2',
  });
  check(nav.items.length === 2, 'plantas inválidas e duplicadas são descartadas');
  check(nav.items[0].shortcut === 1 && nav.items[1].shortcut === 2, 'numeração começa em 1');
  check(nav.items[0].cameraCount === 2, 'câmera repetida conta uma vez');
  check(nav.items[0].worst === 'alert', 'pior estado vence a maioria online');
  check(nav.items[0].attention === 1, 'atenção conta alarme');
  check(nav.items[1].worst === 'unknown', 'planta sem câmera é desconhecida');
  check(nav.resolvedActiveId === 'p2' && nav.items[1].isActive, 'ativo respeitado');
  check(describePlanStatus(nav.items[1]) === 'sem câmeras posicionadas', 'rótulo de planta vazia');
}

{
  const plans = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, name: `Andar ${i}` }));
  const nav = buildPlanNavigation({ plans, activePlanId: 'inexistente' });
  for (let i = 0; i < 12; i += 1) {
    check(nav.items[i].shortcut === (i < 9 ? i + 1 : null), `atalho correto na posição ${i}`);
  }
  check(nav.resolvedActiveId === 'p0', 'ativo inválido cai na primeira planta');
  check(resolveShortcutTarget(nav.items, '9') === 'p8', 'tecla 9 resolve');
  check(resolveShortcutTarget(nav.items, '0') === null, 'tecla 0 não navega');
  check(resolveShortcutTarget(nav.items, 'a') === null, 'letra não navega');
  check(resolveShortcutTarget(nav.items, 9) === null, 'número cru não navega');
}

check(buildPlanNavigation({ plans: null }).resolvedActiveId === null, 'sem plantas, sem ativo');
check(buildPlanNavigation({}).items.length === 0, 'entrada vazia é inerte');
check(stepPlan([], 'x', 'next') === null, 'passo sem plantas é nulo');
check(isEditableTarget({ tagName: 'INPUT' }), 'input é alvo editável');
check(isEditableTarget({ isContentEditable: true }), 'contenteditable é alvo editável');
check(!isEditableTarget({ tagName: 'DIV' }), 'div não é alvo editável');
check(!isEditableTarget(null), 'nulo não é alvo editável');

// --------------------------------------------------------------------- fuzz
for (let seed = 1; seed <= 500; seed += 1) {
  const rand = rng(seed);
  const planCount = 1 + Math.floor(rand() * 14);
  const plans = Object.freeze(
    Array.from({ length: planCount }, (_, i) =>
      Object.freeze({ id: `p${i}`, name: `Andar ${i}`, isDefault: i === 0 })
    )
  );
  const roster = {};
  const statusById = {};
  for (let i = 0; i < planCount; i += 1) {
    const cams = Math.floor(rand() * 6);
    const ids = [];
    for (let c = 0; c < cams; c += 1) {
      const id = `p${i}c${c}`;
      ids.push(id);
      statusById[id] = STATUSES[Math.floor(rand() * STATUSES.length)];
    }
    roster[`p${i}`] = Object.freeze(ids);
  }
  Object.freeze(roster);

  const activePlanId = rand() < 0.2 ? 'fantasma' : `p${Math.floor(rand() * planCount)}`;
  const nav = buildPlanNavigation({
    plans,
    roster,
    statusOf: (id) => statusById[id],
    activePlanId,
  });

  check(nav.items.length === planCount, `seed ${seed}: todas as plantas listadas`);
  check(
    nav.items.every((item, i) => item.planId === `p${i}`),
    `seed ${seed}: ordem preservada`
  );
  check(
    nav.items.filter((item) => item.isActive).length === 1,
    `seed ${seed}: exatamente uma planta ativa`
  );

  for (const item of nav.items) {
    const cams = roster[item.planId];
    const statuses = cams.map((id) => statusById[id] ?? 'unknown');
    const expected =
      statuses.length === 0
        ? 'unknown'
        : statuses.slice().sort((a, b) => SEVERITY[a] - SEVERITY[b])[0];
    check(item.worst === expected, `seed ${seed}: pior estado de ${item.planId}`);
    check(item.cameraCount === cams.length, `seed ${seed}: contagem de ${item.planId}`);
    check(
      item.attention === statuses.filter((s) => s === 'alert' || s === 'offline').length,
      `seed ${seed}: atenção de ${item.planId}`
    );
    check(item.worstCount <= item.cameraCount, `seed ${seed}: worstCount coerente`);
    check(typeof describePlanStatus(item) === 'string', `seed ${seed}: rótulo textual`);
  }

  // Ida e volta é identidade; varredura completa retorna ao ponto de partida.
  const start = nav.resolvedActiveId;
  check(
    stepPlan(nav.items, stepPlan(nav.items, start, 'next'), 'previous') === start,
    `seed ${seed}: next+previous é identidade`
  );
  let cursor = start;
  for (let i = 0; i < planCount; i += 1) cursor = stepPlan(nav.items, cursor, 'next');
  check(cursor === start, `seed ${seed}: volta circular completa`);

  // Pureza: nada da entrada congelada foi tocado.
  check(Object.isFrozen(plans) && plans.length === planCount, `seed ${seed}: entrada intacta`);
}

console.log(`\nOnda 166 — navegação entre plantas`);
console.log(`  asserções: ${assertions}`);
console.log(`  falhas:    ${failures}`);
if (failures > 0) process.exit(1);
console.log('  ✓ todos os cenários passaram');
