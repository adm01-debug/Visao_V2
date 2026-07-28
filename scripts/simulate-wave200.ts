/**
 * Onda 200 — Simulação exaustiva do atestado de trajetória.
 *
 * Cenários aleatórios cobrindo: conflito, exclusão, permanência aberta,
 * truncamento, adulteração de cada campo e falsificação de veredito.
 */
import {
  assessTimeline,
  buildTimelineAttestation,
  verifyTimelineAttestation,
} from '../src/lib/faces/timelineAttestation';
import type { PersonStay, PersonTimeline, PersonTransit } from '../src/lib/faces/personTimeline';

let seed = 20260728;
const rnd = (): number => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const int = (a: number, b: number): number => a + Math.floor(rnd() * (b - a + 1));

let assertions = 0;
const failures: string[] = [];
const check = (ok: boolean, msg: string): void => {
  assertions += 1;
  if (!ok && failures.length < 20) failures.push(msg);
};

function makeTimeline(): PersonTimeline {
  const n = int(0, 6);
  const stays: PersonStay[] = [];
  let t = int(0, 100_000);
  for (let i = 0; i < n; i += 1) {
    const dur = int(1_000, 300_000);
    stays.push({
      id: `s${i}`,
      cameraId: pick(['cam-a', 'cam-b', 'cam-c', null]),
      personId: rnd() < 0.9 ? 'p1' : pick(['p2', null]),
      startMs: t,
      endMs: t + dur,
      durationMs: dur,
      sightings: int(1, 20),
      confidence: rnd() < 0.75 ? 'confirmed' : 'unconfirmed',
      bestSimilarity: rnd() < 0.85 ? Number(rnd().toFixed(4)) : null,
      openAtEdge: rnd() < 0.15,
      firstImageUrl: null,
    });
    t += dur + int(1, 200_000);
  }
  const transits: PersonTransit[] = [];
  for (let i = 1; i < stays.length; i += 1) {
    transits.push({
      fromStayId: stays[i - 1].id,
      toStayId: stays[i].id,
      fromCameraId: stays[i - 1].cameraId,
      toCameraId: stays[i].cameraId,
      gapMs: stays[i].startMs - stays[i - 1].endMs,
      flag: rnd() < 0.1 ? 'co_presence_conflict' : rnd() < 0.5 ? 'unconfirmed' : 'confirmed',
      hasBlindGap: rnd() < 0.2,
      rationale: 'sim',
    });
  }
  const cameras = new Set(stays.map((s) => s.cameraId));
  return {
    stays,
    transits,
    excluded: {
      unverified: rnd() < 0.3 ? int(1, 5) : 0,
      spoofSuspect: rnd() < 0.15 ? int(1, 3) : 0,
      unidentified: rnd() < 0.25 ? int(1, 8) : 0,
    },
    firstSeenMs: stays.length ? stays[0].startMs : null,
    lastSeenMs: stays.length ? stays[stays.length - 1].endMs : null,
    camerasVisited: cameras.size,
    hasConflict: transits.some((x) => x.flag === 'co_presence_conflict'),
    truncated: rnd() < 0.08,
  };
}

async function main(): Promise<void> {
  const N = 3_000;
  for (let i = 0; i < N; i += 1) {
    const tl = makeTimeline();
    const subject = { personId: rnd() < 0.9 ? 'p1' : null, label: null };
    const input = {
      attestationId: `att-${i}`,
      subject,
      window: { fromUtc: '2026-07-01T00:00:00.000Z', toUtc: '2026-07-01T06:00:00.000Z' },
      timeline: tl,
      issuance: {
        issuedAtUtc: '2026-07-01T07:00:00.000Z',
        issuedBy: 'sim',
        sourceSystem: 'visao/sim',
      },
      relatedExportRootHash: rnd() < 0.3 ? 'b'.repeat(64) : null,
    };

    const att = await buildTimelineAttestation(input);
    const v = await verifyTimelineAttestation(att);

    check(v.intact, `#${i} atestado recém-emitido deveria ser íntegro`);
    check(v.rootMatches, `#${i} selo deveria bater`);
    check(v.recomputedVerdict === att.verdict, `#${i} veredito recalculado divergiu`);

    // Determinismo
    const again = await buildTimelineAttestation(input);
    check(again.rootHash === att.rootHash, `#${i} emissão não determinística`);

    // Invariantes semânticas
    const hasConflict = tl.transits.some((x) => x.flag === 'co_presence_conflict');
    const mismatch = subject.personId
      ? tl.stays.some((s) => s.personId !== null && s.personId !== subject.personId)
      : false;
    if (hasConflict || mismatch) {
      check(att.verdict === 'contested', `#${i} conflito deveria contestar`);
    } else if (tl.stays.length === 0) {
      check(att.verdict === 'inconclusive', `#${i} vazio deveria ser inconclusivo`);
    } else {
      check(att.verdict !== 'contested', `#${i} contestou sem contradição`);
    }

    // Permanência aberta nunca entra no total confirmado
    const openSum = tl.stays.filter((s) => s.openAtEdge).reduce((a, s) => a + s.durationMs, 0);
    check(att.stats.openFloorMs === openSum, `#${i} piso observado incorreto`);
    const closedConfirmed = tl.stays
      .filter((s) => !s.openAtEdge && s.confidence === 'confirmed')
      .reduce((a, s) => a + s.durationMs, 0);
    check(att.stats.confirmedDwellMs === closedConfirmed, `#${i} total confirmado contaminado`);

    // Nenhuma ressalva com contagem zero
    check(att.caveats.every((c) => c.count > 0), `#${i} ressalva vazia publicada`);

    // Corroborado exige limpeza total
    if (att.verdict === 'corroborated') {
      check(
        tl.stays.every((s) => s.confidence === 'confirmed' && !s.openAtEdge) &&
          !tl.truncated &&
          tl.excluded.unverified + tl.excluded.spoofSuspect + tl.excluded.unidentified === 0 &&
          !tl.transits.some((x) => x.hasBlindGap),
        `#${i} corroborou com ressalva pendente`,
      );
    }

    // Adulteração de permanência
    if (att.stays.length > 0) {
      const idx = int(0, att.stays.length - 1);
      const tampered = {
        ...att,
        stays: att.stays.map((s, k) => (k === idx ? { ...s, durationMs: s.durationMs + 1 } : s)),
      };
      const tv = await verifyTimelineAttestation(tampered);
      check(!tv.intact, `#${i} adulteração não detectada`);
      check(tv.firstBrokenIndex === idx, `#${i} elo culpado errado (${tv.firstBrokenIndex}≠${idx})`);
    }

    // Falsificação de veredito
    if (att.verdict !== 'corroborated') {
      const forged = { ...att, verdict: 'corroborated' as const };
      const fv = await verifyTimelineAttestation(forged);
      check(!fv.verdictMatches, `#${i} veredito falsificado passou`);
      check(!fv.intact, `#${i} documento incoerente considerado íntegro`);
    }

    // Emissão fora do selo do vídeo, dentro do selo próprio
    const movedIssuance = {
      ...att,
      issuance: { ...att.issuance, issuedBy: 'outro' },
    };
    const mv = await verifyTimelineAttestation(movedIssuance);
    check(!mv.rootMatches, `#${i} emissão editada não invalidou o selo`);

    // assessTimeline é puro/estável
    const a1 = assessTimeline(tl, subject);
    const a2 = assessTimeline(tl, subject);
    check(
      JSON.stringify(a1) === JSON.stringify(a2),
      `#${i} avaliação instável`,
    );
  }

  console.log(`Onda 200 — cenários: ${N}, asserções: ${assertions}`);
  if (failures.length > 0) {
    console.error(`FALHAS (${failures.length} primeiras):`);
    for (const f of failures) console.error(' -', f);
    process.exit(1);
  }
  console.log('✅ Todas as invariantes do atestado de trajetória se sustentaram.');
}

void main();
