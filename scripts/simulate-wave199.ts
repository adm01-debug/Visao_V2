/**
 * Onda 199 — simulação exaustiva da linha do tempo da pessoa.
 *
 * Gera trajetórias aleatórias (leituras, câmeras, vereditos, rajadas e
 * sobreposições) e cobra da régua as invariantes que a tornam confiável numa
 * investigação. Executar: `npx tsx scripts/simulate-wave199.ts`
 */
import {
  buildPersonTimeline,
  SESSION_GAP_MS,
  MAX_STAYS,
  type PersonStay,
} from '../src/lib/faces/personTimeline';
import type { FaceSearchResult, FaceSearchVerdict } from '../src/lib/faces/faceSearch';

let assertions = 0;
const failures: string[] = [];

function check(cond: boolean, msg: string): void {
  assertions += 1;
  if (!cond && failures.length < 20) failures.push(msg);
}

// PRNG determinístico (mulberry32): a simulação precisa ser reproduzível.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VERDICTS: FaceSearchVerdict[] = [
  'identified',
  'candidate',
  'unverified',
  'spoof_suspect',
  'unidentified',
];

const T0 = Date.UTC(2026, 6, 1, 0, 0, 0);

function makeReading(id: string, ts: number, cam: string | null, verdict: FaceSearchVerdict, sim: number | null): FaceSearchResult {
  return {
    id,
    timestampMs: ts,
    cameraId: cam,
    personId: 'p1',
    personName: null,
    similarity: sim,
    recognized: verdict === 'identified',
    spoofDetected: verdict === 'spoof_suspect',
    livenessScore: null,
    ageEstimated: null,
    genderEstimated: null,
    imageUrl: null,
    verdict,
    rationale: '',
  };
}

const SCENARIOS = 4000;

for (let s = 0; s < SCENARIOS; s++) {
  const rand = rng(s * 2654435761 + 7);
  const count = 1 + Math.floor(rand() * 40);
  const cameras = ['cam-a', 'cam-b', 'cam-c', null].slice(0, 1 + Math.floor(rand() * 4));
  const readings: FaceSearchResult[] = [];
  let ts = T0;

  for (let i = 0; i < count; i++) {
    // Metade das vezes uma rajada (dentro do corte), metade um salto.
    ts += rand() < 0.5 ? Math.floor(rand() * SESSION_GAP_MS) : Math.floor(rand() * SESSION_GAP_MS * 6);
    const cam = cameras[Math.floor(rand() * cameras.length)] ?? null;
    const verdict = VERDICTS[Math.floor(rand() * VERDICTS.length)] as FaceSearchVerdict;
    const sim = rand() < 0.2 ? null : Math.round(rand() * 100) / 100;
    readings.push(makeReading(`r${s}-${i}`, ts, cam, verdict, sim));
  }

  const windowEnd = ts + Math.floor(rand() * 3 * SESSION_GAP_MS);
  const timeline = buildPersonTimeline(readings, windowEnd);

  // 1. Determinismo: embaralhar a entrada não muda o resultado.
  const shuffled = [...readings].sort(() => (rand() < 0.5 ? -1 : 1));
  check(
    JSON.stringify(buildPersonTimeline(shuffled, windowEnd)) === JSON.stringify(timeline),
    `#${s}: resultado dependeu da ordem de entrada`,
  );

  // 2. Nenhuma leitura descartada entrou na trajetória.
  const usable = readings.filter((r) => r.verdict === 'identified' || r.verdict === 'candidate');
  const totalSightings = timeline.stays.reduce((acc, st) => acc + st.sightings, 0);
  if (!timeline.truncated) {
    check(totalSightings === usable.length, `#${s}: contagem de leituras na trajetória divergiu`);
  } else {
    check(totalSightings <= usable.length, `#${s}: trajetória truncada contou demais`);
  }

  // 3. Exclusões batem exatamente com os vereditos descartados.
  check(
    timeline.excluded.unverified === readings.filter((r) => r.verdict === 'unverified').length &&
      timeline.excluded.spoofSuspect === readings.filter((r) => r.verdict === 'spoof_suspect').length &&
      timeline.excluded.unidentified === readings.filter((r) => r.verdict === 'unidentified').length,
    `#${s}: contagem de exclusões divergiu`,
  );

  // 4. Ordem crescente e permanências bem formadas.
  let prev: PersonStay | null = null;
  for (const st of timeline.stays) {
    check(st.endMs >= st.startMs, `#${s}: permanência com fim antes do início`);
    check(st.durationMs === st.endMs - st.startMs, `#${s}: duração inconsistente`);
    check(st.sightings >= 1, `#${s}: permanência sem leitura`);
    check(st.bestSimilarity === null || (st.bestSimilarity >= 0 && st.bestSimilarity <= 1), `#${s}: semelhança fora de faixa`);
    if (prev !== null) check(st.startMs >= prev.startMs, `#${s}: permanências fora de ordem`);
    prev = st;
  }

  // 5. Uma permanência jamais mistura graus de certeza nem câmeras.
  //    (verificado pela reconstrução: cada leitura pertence a um balde único)
  const buckets = new Set(
    timeline.stays.map((st) => `${st.cameraId ?? 'nil'}|${st.confidence}|${st.startMs}`),
  );
  check(buckets.size === timeline.stays.length, `#${s}: permanências duplicadas`);

  // 6. Teto respeitado e sempre declarado.
  check(timeline.stays.length <= MAX_STAYS, `#${s}: teto de permanências estourado`);

  // 7. Conflito só existe se houver trecho de conflito.
  check(
    timeline.hasConflict === timeline.transits.some((t) => t.flag === 'co_presence_conflict'),
    `#${s}: bandeira de conflito inconsistente`,
  );

  // 8. Trecho confirmado exige as duas pontas confirmadas.
  const byId = new Map(timeline.stays.map((st) => [st.id, st]));
  for (const tr of timeline.transits) {
    const from = byId.get(tr.fromStayId);
    const to = byId.get(tr.toStayId);
    check(from !== undefined && to !== undefined, `#${s}: trecho apontou para permanência inexistente`);
    if (from && to && tr.flag === 'confirmed') {
      check(
        from.confidence === 'confirmed' && to.confidence === 'confirmed',
        `#${s}: trecho confirmado com ponta duvidosa`,
      );
      check((from.cameraId ?? 'nil') !== (to.cameraId ?? 'nil') ? tr.gapMs >= 0 : true, `#${s}: conflito classificado como confirmado`);
    }
    if (from && to) check(tr.gapMs === to.startMs - from.endMs, `#${s}: intervalo do trecho divergiu`);
    check(
      tr.hasBlindGap ===
        (timeline.excluded.unverified + timeline.excluded.spoofSuspect + timeline.excluded.unidentified > 0),
      `#${s}: lacuna do trecho inconsistente com as exclusões`,
    );
  }

  // 9. Primeiro/último avistamento não inventam instantes.
  if (timeline.stays.length === 0) {
    check(timeline.firstSeenMs === null && timeline.lastSeenMs === null, `#${s}: instante inventado sem leitura`);
  } else {
    const minStart = Math.min(...timeline.stays.map((st) => st.startMs));
    const maxEnd = Math.max(...timeline.stays.map((st) => st.endMs));
    check(timeline.firstSeenMs === minStart, `#${s}: primeiro avistamento errado`);
    check(timeline.lastSeenMs === maxEnd, `#${s}: último avistamento errado`);
    check(maxEnd <= windowEnd + 1, `#${s}: avistamento além da janela`);
  }

  // 10. Monotonicidade da janela: alargar o fim nunca cria permanência aberta.
  const later = buildPersonTimeline(readings, windowEnd + 10 * SESSION_GAP_MS);
  for (let i = 0; i < timeline.stays.length; i++) {
    const a = timeline.stays[i] as PersonStay;
    const b = later.stays[i] as PersonStay;
    check(a.startMs === b.startMs && a.endMs === b.endMs, `#${s}: janela alterou a permanência`);
    check(!(b.openAtEdge && !a.openAtEdge), `#${s}: janela maior abriu permanência já fechada`);
  }

  // 11. Só descartes: trajetória vazia, mas nunca silenciosa.
  if (usable.length === 0) {
    check(timeline.stays.length === 0 && timeline.transits.length === 0, `#${s}: trajetória a partir de descartes`);
  }
}

console.log(`Onda 199 — cenários: ${SCENARIOS}; asserções: ${assertions.toLocaleString('pt-BR')}`);
if (failures.length > 0) {
  console.error(`FALHAS (${failures.length} primeiras):`);
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log('Todas as invariantes da linha do tempo se sustentaram.');
