#!/usr/bin/env node
/**
 * Onda 163 — simulação adversarial da política de aviso do mapa.
 *
 * O módulo em teste decide quem incomoda o operador. Os defeitos que ele existe
 * para impedir são todos "silêncios errados" — por isso a simulação insiste em
 * tentar fazer um agravamento desaparecer.
 *
 * Roda sem dependências: o TypeScript é transpilado por remoção de tipos.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { transformSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

let passed = 0;
const failures = [];
const check = (label, condition) => {
  if (condition) passed += 1;
  else failures.push(label);
};

/** Gerador determinístico — reproduzir uma falha não pode depender de sorte. */
function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const SEVERITY = ['alert', 'offline', 'warning', 'unknown', 'online'];
const rank = (status) => SEVERITY.indexOf(status);

const mod = await import(pathToFileURL(resolve(root, '.wave163/statusAlertPolicy.mjs')).href);
const {
  DEFAULT_ALERT_POLICY,
  emptyNoticeState,
  primeNoticeState,
  evaluateNotices,
  describeNotice,
} = mod;

const transition = (cameraId, from, to) => ({
  cameraId,
  from,
  to,
  worsened: rank(to) < rank(from),
});

const canonical = (value) => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]]))
    : item,
);

// ---------------------------------------------------------------------------
// 1. Carga inicial nunca avisa
// ---------------------------------------------------------------------------
{
  const state = emptyNoticeState();
  for (let i = 0; i < 200; i += 1) {
    const result = evaluateNotices(state, [transition(`cam-${i}`, 'online', 'alert')], 1000 + i);
    check(`carga inicial silenciosa #${i}`, result.notices.length === 0);
    check(
      `carga inicial marca motivo #${i}`,
      result.suppressed.every((item) => item.reason === 'not_primed'),
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Melhora nunca vira aviso
// ---------------------------------------------------------------------------
{
  let state = primeNoticeState(emptyNoticeState(), ['cam-a']);
  let clock = 0;
  for (const [from, to] of [
    ['alert', 'online'],
    ['offline', 'warning'],
    ['warning', 'online'],
    ['unknown', 'online'],
    ['alert', 'warning'],
  ]) {
    clock += 10_000_000; // longe o bastante para não contar como oscilação
    const result = evaluateNotices(state, [transition('cam-a', from, to)], clock);
    state = result.state;
    check(`melhora ${from}->${to} sem aviso`, result.notices.length === 0);
    check(
      `melhora ${from}->${to} registrada`,
      result.suppressed.some((item) => item.reason === 'improved'),
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Silêncio por repetição — e a escalada que precisa furá-lo
// ---------------------------------------------------------------------------
{
  let state = primeNoticeState(emptyNoticeState(), ['cam-a']);
  let result = evaluateNotices(state, [transition('cam-a', 'online', 'warning')], 0);
  state = result.state;
  check('primeiro agravamento avisa', result.notices.length === 1);

  result = evaluateNotices(state, [transition('cam-a', 'online', 'warning')], 5_000);
  state = result.state;
  check('repetição dentro do silêncio é engolida', result.notices.length === 0);
  check(
    'motivo do silêncio é o correto',
    result.suppressed.some((item) => item.reason === 'cooldown'),
  );

  result = evaluateNotices(state, [transition('cam-a', 'warning', 'alert')], 6_000);
  state = result.state;
  check('escalada fura o silêncio', result.notices.length === 1);
  check('escalada é sinalizada', result.notices[0].escalated === true);
}

// ---------------------------------------------------------------------------
// 4. Oscilação: um aviso, não um por pulso — e a escalada ainda passa
// ---------------------------------------------------------------------------
{
  let state = primeNoticeState(emptyNoticeState(), ['cam-a']);
  let clock = 0;
  let flapNotices = 0;
  for (let i = 0; i < 12; i += 1) {
    clock += 2_000;
    const pair = i % 2 === 0 ? ['online', 'offline'] : ['offline', 'online'];
    const result = evaluateNotices(state, [transition('cam-a', pair[0], pair[1])], clock);
    state = result.state;
    flapNotices += result.notices.filter((n) => n.kind === 'flapping').length;
  }
  check('oscilação gera no máximo um aviso de instabilidade', flapNotices === 1);

  clock += 1_000;
  const escalate = evaluateNotices(state, [transition('cam-a', 'online', 'alert')], clock);
  state = escalate.state;
  check(
    'agravamento não é engolido pelo modo instável',
    escalate.notices.some((n) => n.kind === 'worsened' && n.status === 'alert'),
  );
}

// ---------------------------------------------------------------------------
// 5. Rajada vira resumo único
// ---------------------------------------------------------------------------
{
  const ids = Array.from({ length: 30 }, (_v, i) => `cam-${i}`);
  const state = primeNoticeState(emptyNoticeState(), ids);
  const result = evaluateNotices(
    state,
    ids.map((id) => transition(id, 'online', 'offline')),
    0,
  );
  check('rajada emite um único aviso', result.notices.length === 1);
  check('rajada é do tipo resumo', result.notices[0].kind === 'burst');
  check('resumo carrega todas as câmeras', result.notices[0].cameraIds.length === 30);
  check(
    'nenhuma câmera da rajada fica sem registro',
    ids.every((id) => result.suppressed.some((s) => s.cameraId === id)),
  );

  const small = evaluateNotices(
    primeNoticeState(emptyNoticeState(), ids),
    ids.slice(0, DEFAULT_ALERT_POLICY.maxIndividualPerBatch).map((id) => transition(id, 'online', 'offline')),
    0,
  );
  check(
    'leva pequena continua individual',
    small.notices.length === DEFAULT_ALERT_POLICY.maxIndividualPerBatch &&
      small.notices.every((n) => n.kind === 'worsened'),
  );
}

// ---------------------------------------------------------------------------
// 6. Ordenação: o pior sempre é lido primeiro, e é estável
// ---------------------------------------------------------------------------
{
  const ids = ['cam-z', 'cam-a', 'cam-m'];
  const state = primeNoticeState(emptyNoticeState(), ids);
  const result = evaluateNotices(
    state,
    [
      transition('cam-z', 'online', 'warning'),
      transition('cam-a', 'online', 'alert'),
      transition('cam-m', 'online', 'offline'),
    ],
    0,
  );
  check('pior primeiro', result.notices[0].status === 'alert');
  check('segundo é o offline', result.notices[1].status === 'offline');
  check('terceiro é o warning', result.notices[2].status === 'warning');
}

// ---------------------------------------------------------------------------
// 7. Fuzz determinístico — invariantes sob milhares de sequências
// ---------------------------------------------------------------------------
{
  const statuses = ['online', 'warning', 'offline', 'alert', 'unknown'];
  for (let seed = 1; seed <= 400; seed += 1) {
    const rand = makeRandom(seed);
    const cameraCount = 1 + Math.floor(rand() * 6);
    const ids = Array.from({ length: cameraCount }, (_v, i) => `cam-${i}`);
    let state = primeNoticeState(emptyNoticeState(), ids);
    const current = Object.fromEntries(ids.map((id) => [id, 'online']));
    let clock = 0;
    let lastNotified = Object.fromEntries(ids.map((id) => [id, -1]));

    for (let step = 0; step < 25; step += 1) {
      clock += Math.floor(rand() * 90_000);
      const batchSize = 1 + Math.floor(rand() * cameraCount);
      const chosen = new Set();
      while (chosen.size < batchSize) chosen.add(ids[Math.floor(rand() * ids.length)]);
      const batch = [...chosen].map((id) => {
        const to = statuses[Math.floor(rand() * statuses.length)];
        const from = current[id];
        current[id] = to;
        return transition(id, from, to);
      }).filter((t) => t.from !== t.to);

      const before = canonical(state);
      const result = evaluateNotices(state, batch, clock);
      // Pureza: avaliar não pode mutar o estado recebido.
      check(`seed ${seed} passo ${step}: entrada intacta`, canonical(state) === before);

      // Determinismo: repetir a mesma avaliação dá exatamente o mesmo resultado.
      const twin = evaluateNotices(state, batch, clock);
      check(
        `seed ${seed} passo ${step}: determinístico`,
        canonical(result) === canonical(twin),
      );

      state = result.state;

      // Nenhum aviso pode falar de câmera fora da leva.
      const inBatch = new Set(batch.map((t) => t.cameraId));
      check(
        `seed ${seed} passo ${step}: avisos só da leva`,
        result.notices.every((n) => n.cameraIds.every((id) => inBatch.has(id))),
      );

      // Melhora jamais produz aviso individual.
      const worsenedIds = new Set(batch.filter((t) => t.worsened).map((t) => t.cameraId));
      check(
        `seed ${seed} passo ${step}: melhora nunca avisa`,
        result.notices
          .filter((n) => n.kind === 'worsened')
          .every((n) => worsenedIds.has(n.cameraIds[0])),
      );

      // Nenhuma câmera aparece em dois avisos da mesma leva.
      const mentioned = result.notices.flatMap((n) =>
        n.kind === 'burst' ? [] : n.cameraIds,
      );
      check(
        `seed ${seed} passo ${step}: sem aviso duplicado`,
        new Set(mentioned).size === mentioned.length,
      );

      // Teto de avisos individuais respeitado.
      check(
        `seed ${seed} passo ${step}: teto da leva`,
        result.notices.filter((n) => n.kind === 'worsened').length <=
          DEFAULT_ALERT_POLICY.maxIndividualPerBatch,
      );

      // O carimbo do último aviso nunca anda para trás.
      for (const id of ids) {
        const stamp = state.cameras[id]?.lastNotifiedAt ?? -1;
        check(
          `seed ${seed} passo ${step}: carimbo monotônico ${id}`,
          stamp === -1 || stamp >= lastNotified[id],
        );
        lastNotified[id] = stamp;
      }

      // Todo texto gerado é legível e não vaza identificador cru sem nome.
      for (const notice of result.notices) {
        const text = describeNotice(notice, (id) => `Câmera ${id.slice(4)}`);
        check(
          `seed ${seed} passo ${step}: texto não vazio`,
          typeof text === 'string' && text.length > 10 && !text.includes('undefined'),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 8. Agravamento NUNCA é silenciado — a invariante que mais importa
// ---------------------------------------------------------------------------
{
  for (let seed = 1; seed <= 300; seed += 1) {
    const rand = makeRandom(seed * 977);
    let state = primeNoticeState(emptyNoticeState(), ['cam-a']);
    let clock = 0;
    // Leva a câmera a um estado avisado qualquer, com ruído antes.
    const noise = 1 + Math.floor(rand() * 6);
    let currentStatus = 'online';
    for (let i = 0; i < noise; i += 1) {
      clock += Math.floor(rand() * 20_000);
      const to = ['warning', 'online', 'unknown'][Math.floor(rand() * 3)];
      if (to === currentStatus) continue;
      state = evaluateNotices(state, [transition('cam-a', currentStatus, to)], clock).state;
      currentStatus = to;
    }
    clock += Math.floor(rand() * 5_000);
    const result = evaluateNotices(state, [transition('cam-a', currentStatus, 'alert')], clock);
    const notified = result.notices.some(
      (n) => n.status === 'alert' && n.cameraIds.includes('cam-a'),
    );
    const alreadyAtAlert = currentStatus === 'alert';
    check(`seed ${seed}: alarme sempre chega ao operador`, notified || alreadyAtAlert);
  }
}

// ---------------------------------------------------------------------------
// 9. Entradas malformadas não derrubam nem inventam aviso
// ---------------------------------------------------------------------------
{
  const state = primeNoticeState(emptyNoticeState(), ['cam-a']);
  const junk = [
    null,
    undefined,
    {},
    { cameraId: '', from: 'online', to: 'alert', worsened: true },
    { cameraId: 'cam-a', from: 'online', to: 'nao-existe', worsened: true },
  ];
  for (const [index, item] of junk.entries()) {
    const result = evaluateNotices(state, [item], 1_000);
    check(`lixo #${index} não quebra`, Array.isArray(result.notices));
    check(
      `lixo #${index} não inventa câmera vazia`,
      result.notices.every((n) => n.cameraIds.every((id) => typeof id === 'string' && id.length > 0)),
    );
  }
  check(
    'relógio inválido é inerte',
    evaluateNotices(state, [transition('cam-a', 'online', 'alert')], Number.NaN).notices.length === 0,
  );
}

console.log(`${passed} asserções, ${failures.length} falha(s).`);
if (failures.length > 0) {
  for (const failure of failures.slice(0, 20)) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log('✓ Onda 163 — política de aviso do mapa aprovada.');
