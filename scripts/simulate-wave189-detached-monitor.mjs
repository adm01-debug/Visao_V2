#!/usr/bin/env node
/**
 * Onda 189 — Simulação exaustiva do multimonitor destacado.
 *
 * Centenas de milhares de cenários com relógio adversário, janelas mortas,
 * batidas fora de ordem, janelas órfãs e disputa de teto. Nenhuma invariante
 * do livro de janelas pode cair.
 */
import {
  HEARTBEAT_TIMEOUT_MS,
  MAX_DETACHED_WINDOWS,
  applyClosed,
  applyHeartbeat,
  heartbeatAge,
  isAlive,
  liveCount,
  planDetach,
  reconcileHeartbeats,
} from '../src/lib/views/detachedMonitor.ts';

let assertions = 0;
const failures = [];
const ok = (label, cond, detail) => {
  assertions += 1;
  if (!cond) failures.push(`${label}: ${detail ?? 'invariante violada'}`);
};

// PRNG determinístico (mulberry32) — simulação reproduzível.
let seed = 0x9e3779b9;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const CAMERAS = Array.from({ length: 12 }, (_, i) => `cam-${i}`);

// ─────────────────────────────────────────────────────────────
// 1) Invariante 1 — uma câmera nunca abre duas janelas
// ─────────────────────────────────────────────────────────────
for (let i = 0; i < 5000; i += 1) {
  const now = 1_000 + Math.floor(rnd() * 1_000_000);
  const cam = pick(CAMERAS);
  const first = planDetach({ registry: {}, cameraId: cam, now });
  ok('1a primeira abre', first.decision === 'open', first.decision);
  const gap = Math.floor(rnd() * HEARTBEAT_TIMEOUT_MS);
  const second = planDetach({ registry: first.registry, cameraId: cam, now: now + gap });
  ok('1b segunda foca', second.decision === 'focus_existing', second.decision);
  ok('1c mesma janela', second.windowName === first.windowName, 'identidade mudou');
  ok('1d sem duplicata', Object.keys(second.registry).length === 1, 'livro duplicou câmera');
}

// ─────────────────────────────────────────────────────────────
// 2) Invariante 2 e 6 — silêncio longo perde a janela; reabrir é abrir
// ─────────────────────────────────────────────────────────────
for (let i = 0; i < 5000; i += 1) {
  const now = 10_000 + Math.floor(rnd() * 100_000);
  const cam = pick(CAMERAS);
  const opened = planDetach({ registry: {}, cameraId: cam, now });
  const silence = HEARTBEAT_TIMEOUT_MS + 1 + Math.floor(rnd() * 60_000);
  const later = now + silence;
  const { registry: cleaned, lost } = reconcileHeartbeats(opened.registry, later);
  ok('2a janela perdida some', Object.keys(cleaned).length === 0, 'janela morta permaneceu');
  ok('2b perda é nomeada', lost.length === 1 && lost[0] === cam, JSON.stringify(lost));

  const again = planDetach({ registry: opened.registry, cameraId: cam, now: later });
  ok('2c reabertura declarada', again.decision === 'reopen_stale', again.decision);
  ok('2d nova identidade', again.windowName !== opened.windowName, 'identidade reciclada');
  ok('2e novo openedAt', again.registry[cam].openedAt === later, 'openedAt não reiniciou');
}

// ─────────────────────────────────────────────────────────────
// 3) Batida renova e NUNCA rebaixa (ordem fora de sequência)
// ─────────────────────────────────────────────────────────────
for (let i = 0; i < 20000; i += 1) {
  const now = 50_000 + Math.floor(rnd() * 10_000);
  const cam = pick(CAMERAS);
  let reg = planDetach({ registry: {}, cameraId: cam, now }).registry;
  const name = reg[cam].windowName;
  const beats = Array.from({ length: 5 }, () => now + Math.floor(rnd() * HEARTBEAT_TIMEOUT_MS));
  let maxBeat = now;
  for (const at of beats) {
    reg = applyHeartbeat(reg, { cameraId: cam, windowName: name, at });
    maxBeat = Math.max(maxBeat, at);
    ok('3a nunca rebaixa', reg[cam].lastHeartbeatAt === maxBeat, `${reg[cam].lastHeartbeatAt} != ${maxBeat}`);
    ok('3b openedAt preservado', reg[cam].openedAt === now, 'openedAt foi reescrito');
  }
  ok('3c segue viva', isAlive(reg[cam], maxBeat), 'janela viva foi dada como morta');
}

// ─────────────────────────────────────────────────────────────
// 4) Janela órfã não sequestra o registro da janela vigente
// ─────────────────────────────────────────────────────────────
for (let i = 0; i < 5000; i += 1) {
  const now = 200_000 + Math.floor(rnd() * 10_000);
  const cam = pick(CAMERAS);
  const reg = planDetach({ registry: {}, cameraId: cam, now }).registry;
  const vigente = reg[cam].windowName;
  const after = applyHeartbeat(reg, {
    cameraId: cam,
    windowName: 'janela-orfa-antiga',
    at: now + 1_000,
  });
  ok('4a titular mantida', after[cam].windowName === vigente, 'órfã assumiu a titularidade');
  ok('4b batida órfã ignorada', after[cam].lastHeartbeatAt === now, 'órfã renovou o relógio');
}

// ─────────────────────────────────────────────────────────────
// 5) Invariante 3 — relógio para trás nunca mata janela
// ─────────────────────────────────────────────────────────────
for (let i = 0; i < 20000; i += 1) {
  const now = 300_000 + Math.floor(rnd() * 10_000);
  const cam = pick(CAMERAS);
  const reg = planDetach({ registry: {}, cameraId: cam, now }).registry;
  const backwards = now - Math.floor(rnd() * 500_000);
  ok('5a idade nunca negativa', heartbeatAge(reg[cam], backwards) >= 0, 'idade negativa');
  ok('5b viva com relógio atrasado', isAlive(reg[cam], backwards), 'relógio atrasado matou janela');
  const plan = planDetach({ registry: reg, cameraId: cam, now: backwards });
  ok('5c foca, não reabre', plan.decision === 'focus_existing', plan.decision);
}

// ─────────────────────────────────────────────────────────────
// 6) Invariante 4 — teto é recusa declarada, nunca despejo
// ─────────────────────────────────────────────────────────────
for (let i = 0; i < 3000; i += 1) {
  const now = 400_000 + Math.floor(rnd() * 1_000);
  let reg = {};
  for (let k = 0; k < MAX_DETACHED_WINDOWS; k += 1) {
    const plan = planDetach({ registry: reg, cameraId: `cam-${k}`, now });
    ok('6a abre até o teto', plan.decision === 'open', plan.decision);
    reg = plan.registry;
  }
  const extra = planDetach({ registry: reg, cameraId: 'cam-extra', now });
  ok('6b recusa no teto', extra.decision === 'refused_quota', extra.decision);
  ok('6c recusa não abre janela', extra.windowName === null, 'nome emitido em recusa');
  ok('6d nenhuma janela viva despejada', Object.keys(extra.registry).length === MAX_DETACHED_WINDOWS, 'despejo silencioso');
  ok('6e recusa explica', /Limite de/.test(extra.message), extra.message);

  // Uma vaga liberada por morte de janela abre espaço — sem despejar viva.
  const dead = now + HEARTBEAT_TIMEOUT_MS + 1;
  let alive = reg;
  alive = applyHeartbeat(alive, { cameraId: 'cam-0', windowName: reg['cam-0'].windowName, at: dead });
  const afterDeath = planDetach({ registry: alive, cameraId: 'cam-extra', now: dead });
  ok('6f vaga por morte libera', afterDeath.decision === 'open', afterDeath.decision);
  ok('6g viva sobreviveu', Boolean(afterDeath.registry['cam-0']), 'janela viva foi removida');
}

// ─────────────────────────────────────────────────────────────
// 7) Invariante 5 — fechar é idempotente e inerte no desconhecido
// ─────────────────────────────────────────────────────────────
for (let i = 0; i < 10000; i += 1) {
  const now = 500_000 + Math.floor(rnd() * 1_000);
  const cam = pick(CAMERAS);
  const reg = planDetach({ registry: {}, cameraId: cam, now }).registry;
  const once = applyClosed(reg, cam);
  const twice = applyClosed(once, cam);
  ok('7a fecha', once[cam] === undefined, 'janela permaneceu no livro');
  ok('7b idempotente', twice === once, 'segundo fechamento alterou o livro');
  const unknown = applyClosed(reg, 'cam-inexistente');
  ok('7c desconhecido inerte', unknown === reg, 'fechamento fantasma alterou o livro');
}

// ─────────────────────────────────────────────────────────────
// 8) Entrada inválida nunca é silenciada
// ─────────────────────────────────────────────────────────────
for (const bad of ['', '   ', null, undefined, 42, {}, []]) {
  const plan = planDetach({ registry: {}, cameraId: bad, now: 1_000 });
  ok('8a recusa inválida', plan.decision === 'refused_invalid', `${String(bad)} → ${plan.decision}`);
  ok('8b livro intocado', Object.keys(plan.registry).length === 0, 'livro alterado por entrada inválida');
}

// ─────────────────────────────────────────────────────────────
// 9) Caos: 60k passos aleatórios com todas as operações misturadas
// ─────────────────────────────────────────────────────────────
{
  let reg = {};
  let clock = 1_000_000;
  for (let step = 0; step < 60000; step += 1) {
    clock += Math.floor(rnd() * 6_000) - 1_000; // relógio pode andar para trás
    const cam = pick(CAMERAS);
    const op = pick(['detach', 'detach', 'beat', 'close', 'reconcile']);
    if (op === 'detach') {
      const plan = planDetach({ registry: reg, cameraId: cam, now: clock });
      reg = plan.registry;
      ok('9a teto respeitado', Object.keys(reg).length <= MAX_DETACHED_WINDOWS, `${Object.keys(reg).length} janelas`);
      ok(
        '9b decisão coerente',
        ['open', 'reopen_stale', 'focus_existing', 'refused_quota'].includes(plan.decision),
        plan.decision,
      );
    } else if (op === 'beat' && reg[cam]) {
      reg = applyHeartbeat(reg, { cameraId: cam, windowName: reg[cam].windowName, at: clock });
    } else if (op === 'close') {
      reg = applyClosed(reg, cam);
    } else {
      reg = reconcileHeartbeats(reg, clock).registry;
    }
    // Invariante estrutural permanente: chave do livro == cameraId da entrada.
    for (const [key, entry] of Object.entries(reg)) {
      ok('9c chave coerente', key === entry.cameraId, `${key} != ${entry.cameraId}`);
      ok('9d openedAt <= batida', entry.openedAt <= entry.lastHeartbeatAt, 'batida anterior à abertura');
    }
    ok('9e vivas ≤ total', liveCount(reg, clock) <= Object.keys(reg).length, 'contagem incoerente');
  }
}

if (failures.length > 0) {
  console.error(`\n❌ Onda 189 — multimonitor destacado: ${failures.length} falhas em ${assertions} asserções`);
  for (const f of failures.slice(0, 20)) console.error(`   • ${f}`);
  process.exit(1);
}
console.log(
  `✅ Onda 189 — multimonitor destacado: ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`,
);
