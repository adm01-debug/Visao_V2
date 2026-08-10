/**
 * Onda 201 — Simulação do registro probatório do atestado.
 *
 * A Onda 200 provou que o documento é conferível. Esta onda o registra no
 * banco, e com isso nascem riscos novos que a simulação persegue:
 *
 *  S1. **Resumo derivado.** As colunas de resumo (`stats`) precisam ser função
 *      pura do documento — se o cliente pudesse escrevê-las, um atestado
 *      contestado apareceria no registro como corroborado.
 *  S2. **Veredito espelhado.** O veredito recalculado a partir apenas do que o
 *      documento publica (`caveats` + `stays`) tem que coincidir com o veredito
 *      derivado da trajetória original. Divergência = registro mentindo.
 *  S3. **Falsificação coerente.** Reescrever o veredito e recalcular o selo
 *      produz um documento internamente consistente; só a reavaliação do
 *      conteúdo o denuncia.
 *  S4. **Registro ≠ integridade.** "Não consta no registro" jamais pode ser
 *      derivado de "corrente quebrada", e vice-versa: eixos independentes.
 */
import {
  assessTimeline,
  buildTimelineAttestation,
  recomputeVerdictFromDocument,
  verifyTimelineAttestation,
  type TimelineAttestation,
} from '../src/lib/faces/timelineAttestation';
import type { PersonStay, PersonTimeline, PersonTransit } from '../src/lib/faces/personTimeline';

let seed = 20260729;
const rnd = (): number => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const int = (a: number, b: number): number => a + Math.floor(rnd() * (b - a + 1));

let assertions = 0;
const failures: string[] = [];
const check = (ok: boolean, msg: string): void => {
  assertions += 1;
  if (!ok && failures.length < 20) failures.push(msg);
};

function makeTimeline(): PersonTimeline {
  const n = int(0, 7);
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
      openAtEdge: rnd() < 0.18,
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
    camerasVisited: new Set(stays.map((s) => s.cameraId)).size,
    hasConflict: transits.some((x) => x.flag === 'co_presence_conflict'),
    truncated: rnd() < 0.08,
  };
}

/** Espelho do que o gatilho SQL faz ao derivar as colunas de resumo. */
function sqlDerived(doc: TimelineAttestation) {
  return {
    verdict: recomputeVerdictFromDocument(doc),
    stays: doc.stats.stays,
    confirmedStays: doc.stats.confirmedStays,
    camerasVisited: doc.stats.camerasVisited,
    confirmedDwellMs: doc.stats.confirmedDwellMs,
    openFloorMs: doc.stats.openFloorMs,
    excludedReadings: doc.stats.excludedReadings,
  };
}

async function main(): Promise<void> {
  const SCENARIOS = 3_000;

  for (let n = 0; n < SCENARIOS; n += 1) {
    const timeline = makeTimeline();
    const subject = { personId: rnd() < 0.85 ? 'p1' : null, label: null };
    const issuance = {
      issuedAtUtc: new Date(1_700_000_000_000 + n * 1000).toISOString(),
      issuedBy: 'perito@visao.test',
      sourceSystem: 'visao/201',
    };
    const attestation = await buildTimelineAttestation({
      attestationId: `att-${n}`,
      subject,
      window: { fromUtc: '2026-07-01T00:00:00.000Z', toUtc: '2026-07-31T23:59:59.000Z' },
      timeline,
      issuance,
    });

    /* S1 — resumo é função do documento, e bate com a trajetória. */
    const d = sqlDerived(attestation);
    check(d.stays === timeline.stays.length, `#${n}: stats.stays diverge da trajetória`);
    check(
      d.confirmedStays === timeline.stays.filter((s) => s.confidence === 'confirmed').length,
      `#${n}: confirmedStays diverge`
    );
    check(d.camerasVisited === timeline.camerasVisited, `#${n}: camerasVisited diverge`);
    check(d.confirmedStays <= d.stays, `#${n}: confirmadas acima do total`);
    check(d.excludedReadings >= 0, `#${n}: exclusões negativas`);

    /* D4 — permanência aberta nunca entra no total confirmado. */
    const openConfirmed = timeline.stays
      .filter((s) => s.openAtEdge)
      .reduce((acc, s) => acc + s.durationMs, 0);
    check(d.openFloorMs === openConfirmed, `#${n}: piso observado mal somado`);
    const closedConfirmed = timeline.stays
      .filter((s) => !s.openAtEdge && s.confidence === 'confirmed')
      .reduce((acc, s) => acc + s.durationMs, 0);
    check(d.confirmedDwellMs === closedConfirmed, `#${n}: total confirmado contaminado`);

    /* S2 — veredito publicado é o veredito da trajetória. */
    const fromTimeline = assessTimeline(timeline, subject).verdict;
    check(d.verdict === fromTimeline, `#${n}: veredito do documento diverge da trajetória`);
    check(attestation.verdict === fromTimeline, `#${n}: veredito selado diverge`);
    check(
      timeline.stays.length > 0 || attestation.verdict === 'inconclusive',
      `#${n}: vazio deveria ser inconclusivo`
    );

    /* Documento íntegro passa na reconferência. */
    const ok = await verifyTimelineAttestation(attestation);
    check(ok.intact && ok.rootMatches && ok.verdictMatches, `#${n}: documento legítimo reprovado`);
    check(ok.firstBrokenIndex === null, `#${n}: elo quebrado em documento íntegro`);

    /* S3 — falsificação coerente: veredito reescrito + selo recalculado. */
    if (attestation.verdict !== 'corroborated') {
      const forged = { ...attestation, verdict: 'corroborated' as const };
      const v = await verifyTimelineAttestation(forged);
      check(!v.intact, `#${n}: veredito forjado passou`);
      check(!v.verdictMatches, `#${n}: falsificação de veredito não detectada`);
      check(v.recomputedVerdict === attestation.verdict, `#${n}: reavaliação errada`);
      /* S4 — o eixo da corrente permanece intacto: a acusação é de veredito,
         não de adulteração de permanência. */
      check(v.firstBrokenIndex === null, `#${n}: corrente acusada indevidamente`);
    }

    /* S4 — adulteração de permanência quebra a corrente, não o veredito. */
    if (attestation.stays.length > 0) {
      const idx = int(0, attestation.stays.length - 1);
      const tampered: TimelineAttestation = {
        ...attestation,
        stays: attestation.stays.map((s, i) =>
          i === idx ? { ...s, durationMs: s.durationMs + 1 } : s
        ),
      };
      const v = await verifyTimelineAttestation(tampered);
      check(v.firstBrokenIndex === idx, `#${n}: elo quebrado apontado no índice errado`);
      check(!v.intact, `#${n}: adulteração de permanência passou`);
    }

    /* Determinismo: mesma entrada, mesmo selo — requisito do registro (UNIQUE). */
    const again = await buildTimelineAttestation({
      attestationId: `att-${n}`,
      subject,
      window: { fromUtc: '2026-07-01T00:00:00.000Z', toUtc: '2026-07-31T23:59:59.000Z' },
      timeline,
      issuance,
    });
    check(again.rootHash === attestation.rootHash, `#${n}: selo não determinístico`);

    /* Emissão diferente (relógio/autor) produz selo diferente: o registro nunca
       colide duas emissões distintas na mesma linha. */
    const other = await buildTimelineAttestation({
      attestationId: `att-${n}`,
      subject,
      window: { fromUtc: '2026-07-01T00:00:00.000Z', toUtc: '2026-07-31T23:59:59.000Z' },
      timeline,
      issuance: { ...issuance, issuedBy: 'outro@visao.test' },
    });
    check(other.rootHash !== attestation.rootHash, `#${n}: autoria não entra no selo`);
  }

  console.log(`Onda 201 — ${assertions.toLocaleString('pt-BR')} asserções`);
  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log('OK: registro probatório do atestado coerente com a regra única.');
}

void main();
