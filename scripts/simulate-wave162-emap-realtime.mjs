#!/usr/bin/env node
/**
 * Onda 162 — simulação do tempo real do mapa de situação.
 *
 * Não testa "se compila": testa as invariantes que impedem o mapa de mentir
 * para quem está de plantão. Cenários gerados com semente fixa (determinístico)
 * incluem chegada fora de ordem, reentrega duplicada, empate de relógio,
 * estados desconhecidos e câmeras que não estão na planta.
 */
import { createJiti } from 'jiti';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const jiti = createJiti(here, { alias: { '@': path.resolve(here, '..', 'src') } });

const {
  toMarkerStatus,
  applyStatusEvent,
  applyStatusEvents,
  ledgerFromSnapshot,
  reconcilePlacements,
  diffLedgers,
} = await jiti.import(path.resolve(here, '..', 'src/lib/emap/markerStatusStream.ts'));

let assertions = 0;
const failures = [];

function check(condition, message) {
  assertions += 1;
  if (!condition) failures.push(message);
}

/** Gerador determinístico (xorshift32) — mesma semente, mesmos cenários. */
function rng(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

const RAW_STATUSES = ['online', 'offline', 'alert', 'warning', null, undefined, '', 'ONLINE', 'degraded', 42];
const KNOWN = ['online', 'offline', 'alert', 'warning', 'unknown'];
const SEVERITY = ['alert', 'offline', 'warning', 'unknown', 'online'];
const rank = (s) => SEVERITY.indexOf(s);

console.log('\nOnda 162 — simulação do tempo real do E-Map\n');

// ---------------------------------------------------------------- tradução
for (const raw of RAW_STATUSES) {
  const translated = toMarkerStatus(raw);
  check(KNOWN.includes(translated), `T1 tradução fora do vocabulário: ${String(raw)}`);
  if (!['online', 'offline', 'alert', 'warning'].includes(raw)) {
    check(
      translated === 'unknown',
      `T2 valor não reconhecido virou "${translated}" em vez de desconhecido: ${String(raw)}`,
    );
  }
  // A regra de ouro: desconhecido JAMAIS é traduzido para "tudo bem".
  check(
    raw === 'online' || translated !== 'online',
    `T3 valor "${String(raw)}" foi promovido indevidamente a online`,
  );
}

// -------------------------------------------------- eventos malformados
const malformed = [
  { cameraId: '', status: 'alert', observedAt: 1 },
  { cameraId: 'cam-1', status: 'alert', observedAt: Number.NaN },
  { cameraId: 'cam-1', status: 'alert', observedAt: Number.POSITIVE_INFINITY },
  { cameraId: undefined, status: 'alert', observedAt: 1 },
  { cameraId: 7, status: 'alert', observedAt: 1 },
  {},
];
for (const event of malformed) {
  const { ledger, outcome } = applyStatusEvent({}, event);
  check(outcome === 'invalid', `M1 evento malformado aceito: ${JSON.stringify(event)}`);
  check(Object.keys(ledger).length === 0, 'M2 evento malformado criou entrada no livro');
}

// ------------------------------------------------- cenários aleatórios
const SCENARIOS = 600;
const random = rng(20260727);

for (let scenario = 0; scenario < SCENARIOS; scenario += 1) {
  const cameraCount = 1 + Math.floor(random() * 6);
  const cameras = Array.from({ length: cameraCount }, (_, index) => `cam-${index}`);
  const eventCount = 1 + Math.floor(random() * 25);

  const events = Array.from({ length: eventCount }, () => ({
    cameraId: cameras[Math.floor(random() * cameras.length)],
    status: RAW_STATUSES[Math.floor(random() * RAW_STATUSES.length)],
    // Poucos carimbos distintos: força empates e chegada fora de ordem.
    observedAt: 1000 + Math.floor(random() * 5) * 10,
  }));

  const inOrder = applyStatusEvents({}, [...events].sort((a, b) => a.observedAt - b.observedAt));
  const asArrived = applyStatusEvents({}, events);
  const reversed = applyStatusEvents({}, [...events].reverse());
  const shuffled = applyStatusEvents(
    {},
    [...events].sort(() => (random() < 0.5 ? -1 : 1)),
  );

  // I1 — comutatividade: a ordem de chegada não muda o estado final.
  for (const [label, candidate] of [
    ['chegada real', asArrived],
    ['ordem invertida', reversed],
    ['ordem embaralhada', shuffled],
  ]) {
    check(
      JSON.stringify(candidate) === JSON.stringify(inOrder),
      `I1 (cenário ${scenario}) ordem "${label}" produziu estado diferente da ordem cronológica`,
    );
  }

  // I2 — idempotência: reentregar tudo de novo não muda nada.
  check(
    JSON.stringify(applyStatusEvents(inOrder, events)) === JSON.stringify(inOrder),
    `I2 (cenário ${scenario}) reentrega alterou o estado final`,
  );

  // I3 — evento antigo nunca sobrescreve o mais recente.
  for (const cameraId of cameras) {
    const entry = inOrder[cameraId];
    if (!entry) continue;
    const stale = applyStatusEvent(inOrder, {
      cameraId,
      status: 'online',
      observedAt: entry.observedAt - 1,
    });
    check(stale.outcome === 'stale', `I3 (cenário ${scenario}) evento atrasado foi aceito`);
    check(
      stale.ledger[cameraId].status === entry.status,
      `I3b (cenário ${scenario}) evento atrasado alterou o estado de ${cameraId}`,
    );
  }

  // I4 — empate de relógio nunca rebaixa o estado.
  for (const cameraId of cameras) {
    const entry = inOrder[cameraId];
    if (!entry) continue;
    for (const rival of ['online', 'warning', 'offline', 'alert']) {
      const tie = applyStatusEvent(inOrder, { cameraId, status: rival, observedAt: entry.observedAt });
      const resulting = tie.ledger[cameraId].status;
      check(
        rank(resulting) <= Math.min(rank(entry.status), rank(rival)),
        `I4 (cenário ${scenario}) empate rebaixou ${cameraId}: ${entry.status} vs ${rival} => ${resulting}`,
      );
    }
  }

  // I5 — o carimbo do livro nunca anda para trás.
  const monotonic = applyStatusEvents(inOrder, events);
  for (const cameraId of Object.keys(inOrder)) {
    check(
      monotonic[cameraId].observedAt >= inOrder[cameraId].observedAt,
      `I5 (cenário ${scenario}) carimbo retrocedeu para ${cameraId}`,
    );
  }

  // I6 — projeção nos marcadores preserva quantidade, ordem e geometria.
  const placements = cameras.map((cameraId, index) => ({
    id: `p-${index}`,
    cameraId,
    label: cameraId,
    position: { x: (index + 1) / (cameraCount + 1), y: 0.5 },
    headingDeg: 0,
    fovDeg: 90,
    status: 'online',
  }));
  // Um marcador órfão: câmera que não recebeu nenhum evento.
  placements.push({
    id: 'p-orphan',
    cameraId: 'cam-fantasma',
    label: 'fantasma',
    position: { x: 0.5, y: 0.9 },
    headingDeg: 10,
    fovDeg: 0,
    status: 'online',
  });

  const projected = reconcilePlacements(placements, inOrder);
  check(projected.length === placements.length, `I6 (cenário ${scenario}) marcador sumiu do mapa`);
  projected.forEach((placement, index) => {
    const original = placements[index];
    check(placement.id === original.id, `I6b (cenário ${scenario}) ordem dos marcadores mudou`);
    check(
      placement.position.x === original.position.x && placement.position.y === original.position.y,
      `I6c (cenário ${scenario}) tempo real moveu marcador ${placement.id}`,
    );
    check(
      placement.headingDeg === original.headingDeg && placement.fovDeg === original.fovDeg,
      `I6d (cenário ${scenario}) tempo real alterou a mira de ${placement.id}`,
    );
    check(KNOWN.includes(placement.status), `I6e (cenário ${scenario}) estado inválido projetado`);
  });

  // I7 — câmera sem notícia nenhuma é "desconhecida", nunca "operando".
  const orphan = projected.find((placement) => placement.cameraId === 'cam-fantasma');
  check(
    orphan.status === 'unknown',
    `I7 (cenário ${scenario}) câmera sem evento apareceu como "${orphan.status}"`,
  );

  // I8 — a diferença só marca "piorou" quando de fato piorou.
  const transitions = diffLedgers({}, inOrder);
  for (const transition of transitions) {
    check(
      transition.worsened === rank(transition.to) < rank(transition.from),
      `I8 (cenário ${scenario}) classificação errada de piora em ${transition.cameraId}`,
    );
  }
  check(
    diffLedgers(inOrder, inOrder).length === 0,
    `I8b (cenário ${scenario}) diferença acusou mudança sem mudança`,
  );
}

// ------------------------------------------------ carga inicial do banco
const snapshot = ledgerFromSnapshot(
  [
    { id: 'cam-a', status: 'alert' },
    { id: 'cam-b', status: null },
    { id: 'cam-c', status: 'online', observedAt: 50 },
  ],
  100,
);
check(snapshot['cam-a'].status === 'alert', 'S1 carga inicial perdeu o alarme');
check(snapshot['cam-b'].status === 'unknown', 'S2 estado nulo virou algo diferente de desconhecido');
check(snapshot['cam-c'].observedAt === 50, 'S3 carimbo próprio da linha foi ignorado');
check(snapshot['cam-a'].observedAt === 100, 'S4 carimbo de reserva não foi aplicado');

// Um evento posterior à carga precisa entrar; um anterior, não.
check(
  applyStatusEvent(snapshot, { cameraId: 'cam-a', status: 'online', observedAt: 200 }).outcome ===
    'applied',
  'S5 evento posterior à carga foi recusado',
);
check(
  applyStatusEvent(snapshot, { cameraId: 'cam-a', status: 'online', observedAt: 99 }).outcome ===
    'stale',
  'S6 evento anterior à carga foi aceito',
);

console.log(`${assertions} asserções, ${failures.length} falha(s).`);
if (failures.length > 0) {
  for (const failure of failures.slice(0, 20)) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log('✓ Onda 162 — tempo real do mapa aprovado.\n');
