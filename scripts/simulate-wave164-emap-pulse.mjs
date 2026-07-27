#!/usr/bin/env node
/**
 * Onda 164 — simulação do pulso visual do marcador (E-Map).
 *
 * Invariantes provadas aqui:
 *   1. Melhora nunca acende pulso; sempre apaga o pulso em curso.
 *   2. Renovar nunca rebaixa a gravidade do pulso.
 *   3. `expirePulses` é idempotente e monotônico no tempo.
 *   4. Pureza: nenhuma entrada é mutada; sem mudança, mesma referência.
 *   5. Entradas malformadas (relógio NaN, estado desconhecido, id vazio)
 *      não derrubam nem criam pulso eterno.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('ts-node/esm', pathToFileURL('./'));

const mod = await import('../src/lib/emap/markerPulse.ts');
const {
  DEFAULT_PULSE_CONFIG,
  activePulses,
  clearPulse,
  emptyPulseLedger,
  expirePulses,
  isPulsing,
  nextExpiry,
  pulsingCameraIds,
  registerPulses,
} = mod;

let assertions = 0;
let failures = 0;
const fail = (msg) => {
  failures += 1;
  if (failures <= 20) console.error(`✗ ${msg}`);
};
const ok = (cond, msg) => {
  assertions += 1;
  if (!cond) fail(msg);
};

const SEVERITY = ['alert', 'offline', 'warning', 'unknown', 'online'];
const rank = (s) => {
  const i = SEVERITY.indexOf(s);
  return i === -1 ? SEVERITY.indexOf('unknown') : i;
};
const worse = (a, b) => rank(a) < rank(b);

// PRNG determinístico (mulberry32).
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 1. Casos canônicos ----------
{
  const t0 = 1_000_000;
  let ledger = emptyPulseLedger();
  ledger = registerPulses(ledger, [{ cameraId: 'a', from: 'online', to: 'alert', worsened: true }], t0);
  ok(isPulsing(ledger, 'a', t0), 'agravamento acende pulso');
  ok(ledger.a.status === 'alert', 'pulso guarda o estado grave');
  ok(ledger.a.hits === 1, 'primeiro acerto conta 1');

  // Melhora apaga.
  const improved = registerPulses(ledger, [{ cameraId: 'a', from: 'alert', to: 'online', worsened: false }], t0 + 10);
  ok(!isPulsing(improved, 'a', t0 + 10), 'melhora apaga pulso');

  // "worsened" mentiroso não acende.
  const lying = registerPulses(emptyPulseLedger(), [{ cameraId: 'z', from: 'alert', to: 'online', worsened: true }], t0);
  ok(!isPulsing(lying, 'z', t0), 'flag worsened mentirosa é ignorada');

  // Renovação não rebaixa.
  let l2 = registerPulses(emptyPulseLedger(), [{ cameraId: 'b', from: 'online', to: 'alert', worsened: true }], t0);
  l2 = registerPulses(l2, [{ cameraId: 'b', from: 'online', to: 'warning', worsened: true }], t0 + 50);
  ok(l2.b.status === 'alert', 'renovação nunca rebaixa gravidade');
  ok(l2.b.startedAt === t0, 'início preservado na renovação');
  ok(l2.b.expiresAt === t0 + 50 + DEFAULT_PULSE_CONFIG.ttlMs, 'renovação estende prazo');
  ok(l2.b.hits === 2, 'renovação conta acerto');

  // Expiração.
  ok(expirePulses(l2, t0 + 50 + DEFAULT_PULSE_CONFIG.ttlMs).b === undefined, 'pulso vence no prazo');
  ok(expirePulses(l2, t0) === l2, 'sem vencimento devolve mesma referência');
  ok(registerPulses(l2, [], t0) === l2, 'leva vazia devolve mesma referência');
  ok(clearPulse(l2, 'inexistente') === l2, 'clear de ausente devolve mesma referência');
  ok(!isPulsing(clearPulse(l2, 'b'), 'b', t0), 'ciência apaga pulso');
  ok(nextExpiry(emptyPulseLedger(), t0) === null, 'livro vazio não tem vencimento');
}

// ---------- 2. Malformados ----------
{
  const bad = [
    { cameraId: '', from: 'online', to: 'alert', worsened: true },
    { cameraId: 'x', from: 'banana', to: 'alert', worsened: true },
    { cameraId: 'y', from: 'online', to: 'banana', worsened: true },
    { cameraId: 'w', from: 'online', to: 'alert', worsened: true },
  ];
  const l = registerPulses(emptyPulseLedger(), bad, Number.NaN);
  ok(!('' in l), 'id vazio é descartado');
  ok(isPulsing(l, 'x', 0), 'estado de origem inválido vira unknown e ainda agrava');
  ok(!isPulsing(l, 'y', 0), 'destino inválido (unknown) não agrava a partir de online');
  ok(l.w.expiresAt === DEFAULT_PULSE_CONFIG.ttlMs, 'relógio NaN vira 0, prazo é finito');
  ok(expirePulses(l, DEFAULT_PULSE_CONFIG.ttlMs).w === undefined, 'pulso de relógio inválido vence');
  const zeroTtl = registerPulses(emptyPulseLedger(), [bad[3]], 100, { ttlMs: 0 });
  ok(zeroTtl.w.expiresAt === 100 + DEFAULT_PULSE_CONFIG.ttlMs, 'ttl inválido cai no padrão');
}

// ---------- 3. Fuzz determinístico ----------
const CAMERAS = Array.from({ length: 24 }, (_, i) => `cam-${i}`);
for (let seed = 1; seed <= 400; seed += 1) {
  const rand = rng(seed);
  let ledger = emptyPulseLedger();
  const truth = new Map(); // cameraId -> status corrente
  const expectPulse = new Map(); // cameraId -> {status, expiresAt}
  let now = 500_000 + seed;

  for (let step = 0; step < 40; step += 1) {
    now += Math.floor(rand() * 6000);
    const batchSize = 1 + Math.floor(rand() * 4);
    const transitions = [];
    for (let b = 0; b < batchSize; b += 1) {
      const cam = CAMERAS[Math.floor(rand() * CAMERAS.length)];
      const from = truth.get(cam) ?? 'online';
      const to = SEVERITY[Math.floor(rand() * SEVERITY.length)];
      if (to === from) continue;
      truth.set(cam, to);
      transitions.push({ cameraId: cam, from, to, worsened: rand() < 0.5 });
    }

    const frozen = JSON.parse(JSON.stringify(ledger));
    const before = ledger;
    ledger = registerPulses(ledger, transitions, now);
    ok(JSON.stringify(before) === JSON.stringify(frozen), `pureza: entrada não mutada (seed ${seed})`);

    // Espelho independente da regra.
    for (const t of transitions) {
      const existing = expectPulse.get(t.cameraId);
      if (worse(t.to, t.from)) {
        expectPulse.set(t.cameraId, {
          status: existing && worse(existing.status, t.to) ? existing.status : t.to,
          expiresAt: now + DEFAULT_PULSE_CONFIG.ttlMs,
        });
      } else {
        expectPulse.delete(t.cameraId);
      }
    }

    ledger = expirePulses(ledger, now);
    for (const [cam, exp] of [...expectPulse]) if (exp.expiresAt <= now) expectPulse.delete(cam);

    ok(expirePulses(ledger, now) === ledger, `expiração idempotente (seed ${seed})`);

    const active = activePulses(ledger, now);
    ok(active.length === expectPulse.size, `contagem de pulsos bate (seed ${seed} passo ${step})`);
    for (const pulse of active) {
      const exp = expectPulse.get(pulse.cameraId);
      ok(exp !== undefined, `pulso ${pulse.cameraId} previsto (seed ${seed})`);
      if (exp) {
        ok(pulse.status === exp.status, `estado do pulso bate (seed ${seed} ${pulse.cameraId})`);
        ok(pulse.expiresAt === exp.expiresAt, `prazo do pulso bate (seed ${seed} ${pulse.cameraId})`);
      }
      ok(worse(pulse.status, 'online') || pulse.status !== 'online', 'pulso nunca é online');
    }

    // Ordenação: pior primeiro, empate estável.
    for (let i = 1; i < active.length; i += 1) {
      const prev = active[i - 1];
      const cur = active[i];
      const okOrder =
        rank(prev.status) < rank(cur.status) ||
        (rank(prev.status) === rank(cur.status) &&
          (prev.startedAt < cur.startedAt ||
            (prev.startedAt === cur.startedAt && prev.cameraId.localeCompare(cur.cameraId) <= 0)));
      ok(okOrder, `ordenação por gravidade (seed ${seed} passo ${step})`);
    }

    // Conjunto e consulta pontual concordam.
    const ids = pulsingCameraIds(ledger, now);
    ok(ids.size === active.length, 'conjunto e lista concordam em tamanho');
    for (const cam of CAMERAS) {
      ok(ids.has(cam) === isPulsing(ledger, cam, now), `isPulsing concorda com conjunto (${cam})`);
    }

    // Monotonicidade: avançar o relógio nunca cria pulso.
    const later = expirePulses(ledger, now + 10 * DEFAULT_PULSE_CONFIG.ttlMs);
    ok(Object.keys(later).length <= Object.keys(ledger).length, 'tempo só remove pulsos');
    const ne = nextExpiry(ledger, now);
    ok(ne === null || ne > now, 'próximo vencimento é futuro');
  }
}

console.log(`\nOnda 164 — pulso do marcador: ${assertions} asserções, ${failures} falhas.`);
process.exit(failures === 0 ? 0 : 1);
