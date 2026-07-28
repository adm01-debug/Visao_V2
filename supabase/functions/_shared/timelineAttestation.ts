/**
 * Onda 201 — espelho Deno da régua da Onda 200 (`src/lib/faces/timelineAttestation.ts`).
 *
 * Cópia byte-a-byte da lógica, com os tipos da trajetória declarados aqui
 * (o servidor recebe a trajetória pronta e nunca a recalcula). Divergência
 * entre este arquivo e o de `src/` é falha de integridade: o gate
 * `db:check:timeline-attestation` compara as duas versões.
 */
import { canonicalize, sha256Hex, type HashFn } from './custodyManifest.ts';

export type StayConfidence = 'confirmed' | 'unconfirmed';
export type TransitFlag = 'confirmed' | 'unconfirmed' | 'co_presence_conflict';

export interface PersonStay {
  readonly id: string;
  readonly cameraId: string | null;
  readonly personId: string | null;
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
  readonly sightings: number;
  readonly confidence: StayConfidence;
  readonly bestSimilarity: number | null;
  readonly openAtEdge: boolean;
  readonly firstImageUrl: string | null;
}

export interface PersonTransit {
  readonly fromStayId: string;
  readonly toStayId: string;
  readonly fromCameraId: string | null;
  readonly toCameraId: string | null;
  readonly gapMs: number;
  readonly flag: TransitFlag;
  readonly hasBlindGap: boolean;
  readonly rationale: string;
}

export interface PersonTimeline {
  readonly stays: readonly PersonStay[];
  readonly transits: readonly PersonTransit[];
  readonly excluded: {
    readonly unverified: number;
    readonly spoofSuspect: number;
    readonly unidentified: number;
  };
  readonly firstSeenMs: number | null;
  readonly lastSeenMs: number | null;
  readonly camerasVisited: number;
  readonly hasConflict: boolean;
  readonly truncated: boolean;
}

/* ========================================================================== */
/*  Formato                                                                   */
/* ========================================================================== */

export const ATTESTATION_FORMAT = 'visao.timeline.attestation';
export const ATTESTATION_VERSION = 1;
export const ATTESTATION_ALGORITHM = 'SHA-256';

/**
 * Semente da corrente. Distinta da semente de custódia de propósito: um elo do
 * atestado nunca pode ser confundido com um elo de manifesto de vídeo (D1).
 */
export const ATTESTATION_GENESIS =
  'visao:timeline:v1:0000000000000000000000000000000000000000000000000000000000000000';

export const ATTESTATION_DISCLOSURE =
  'Este atestado registra uma leitura automatizada de trajetória, não a ' +
  'gravação original. O encadeamento SHA-256 demonstra que o conteúdo não foi ' +
  'editado após a emissão, mas não impede que um documento inteiro seja ' +
  'fabricado do zero: confira o selo contra o sistema de origem. Permanências ' +
  'derivam de reconhecimento facial e admitem erro; leituras não medidas e ' +
  'suspeitas de fraude ficam fora da trajetória e estão declaradas nas ' +
  'ressalvas.';

export const ATTESTATION_HOW_TO_VERIFY: readonly string[] = [
  '1. Remova o campo "rootHash" do documento.',
  '2. Serialize o restante com chaves ordenadas alfabeticamente, sem espaços.',
  '3. Calcule SHA-256 (hexadecimal minúsculo) e compare com "rootHash".',
  '4. Para cada permanência i, calcule elo[i] = SHA-256(elo[i-1] + "\\n" + ' +
    'permanência canônica), com elo[-1] = "genesis". Compare com "chain".',
  '5. O primeiro elo divergente indica a primeira permanência alterada.',
];

/* ========================================================================== */
/*  Veredito                                                                  */
/* ========================================================================== */

export type AttestationVerdict =
  /** Toda permanência confirmada, fechada, sem exclusão e sem lacuna. */
  | 'corroborated'
  /** Há trajetória, mas com ressalvas declaradas. */
  | 'partial'
  /** Há contradição interna: a trajetória não pode ser afirmada. */
  | 'contested'
  /** Não há permanência alguma — nada foi observado, nada é negado. */
  | 'inconclusive';

export type AttestationCaveatCode =
  | 'co_presence_conflict'
  | 'unconfirmed_stay'
  | 'open_stay'
  | 'blind_gap'
  | 'excluded_unverified'
  | 'excluded_spoof_suspect'
  | 'excluded_unidentified'
  | 'truncated_result'
  | 'subject_mismatch'
  | 'no_observation'
  | 'single_camera';

export interface AttestationCaveat {
  readonly code: AttestationCaveatCode;
  /** Quantas ocorrências motivaram a ressalva. Nunca zero. */
  readonly count: number;
  readonly detail: string;
}

/** Ressalvas que impedem `corroborated`, mas não derrubam a trajetória. */
const WEAKENING: ReadonlySet<AttestationCaveatCode> = new Set<AttestationCaveatCode>([
  'unconfirmed_stay',
  'open_stay',
  'blind_gap',
  'excluded_unverified',
  'excluded_spoof_suspect',
  'excluded_unidentified',
  'truncated_result',
]);

/** Ressalvas que tornam a trajetória autocontraditória. */
const CONTESTING: ReadonlySet<AttestationCaveatCode> = new Set<AttestationCaveatCode>([
  'co_presence_conflict',
  'subject_mismatch',
]);

/* ========================================================================== */
/*  Estrutura do atestado                                                     */
/* ========================================================================== */

export interface TimelineEvidenceStats {
  readonly stays: number;
  readonly confirmedStays: number;
  readonly camerasVisited: number;
  /** Soma das permanências confirmadas e **fechadas**. Fato medido. */
  readonly confirmedDwellMs: number;
  /** Soma das permanências abertas na borda. Piso observado, nunca fato (D4). */
  readonly openFloorMs: number;
  readonly excludedReadings: number;
}

/** Fatos do ato de emissão. Vêm do servidor — nunca do formulário (D5/Onda 160). */
export interface AttestationIssuance {
  readonly issuedAtUtc: string;
  readonly issuedBy: string;
  readonly sourceSystem: string;
}

export interface AttestationSubject {
  /** Identificador da pessoa investigada; `null` quando a busca foi por imagem. */
  readonly personId: string | null;
  /** Rótulo humano, se houver. Nunca usado em comparação. */
  readonly label: string | null;
}

export interface AttestationWindow {
  readonly fromUtc: string;
  readonly toUtc: string;
}

export interface AttestationInput {
  readonly attestationId: string;
  readonly subject: AttestationSubject;
  readonly window: AttestationWindow;
  readonly timeline: PersonTimeline;
  readonly issuance: AttestationIssuance;
  /** Selo de um manifesto de vídeo relacionado. Referência, nunca reafirmação (D1). */
  readonly relatedExportRootHash?: string | null;
}

/** Permanência em forma canônica — o que a corrente cobre. */
export interface AttestedStay {
  readonly index: number;
  readonly stayId: string;
  readonly cameraId: string | null;
  readonly personId: string | null;
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
  readonly sightings: number;
  readonly confidence: PersonStay['confidence'];
  readonly bestSimilarity: number | null;
  readonly openAtEdge: boolean;
}

export interface AttestedTransit {
  readonly fromStayId: string;
  readonly toStayId: string;
  readonly gapMs: number;
  readonly flag: PersonTransit['flag'];
  readonly hasBlindGap: boolean;
}

export interface TimelineAttestation {
  readonly format: typeof ATTESTATION_FORMAT;
  readonly version: typeof ATTESTATION_VERSION;
  readonly algorithm: typeof ATTESTATION_ALGORITHM;
  readonly genesis: string;
  readonly attestationId: string;
  readonly subject: AttestationSubject;
  readonly window: AttestationWindow;
  readonly verdict: AttestationVerdict;
  readonly caveats: readonly AttestationCaveat[];
  readonly stats: TimelineEvidenceStats;
  readonly stays: readonly AttestedStay[];
  readonly transits: readonly AttestedTransit[];
  readonly relatedExportRootHash: string | null;
  /** Fora do selo do vídeo; dentro do selo deste documento. */
  readonly issuance: AttestationIssuance;
  readonly howToVerify: readonly string[];
  readonly disclosure: string;
  /** `chain[i]` cobre as permanências 0..i. */
  readonly chain: readonly string[];
  readonly rootHash: string;
}

export interface AttestationVerification {
  readonly intact: boolean;
  readonly firstBrokenIndex: number | null;
  readonly rootMatches: boolean;
  /** O veredito declarado é o que o conteúdo produz? (D2 da Onda 160.) */
  readonly verdictMatches: boolean;
  readonly recomputedVerdict: AttestationVerdict;
}

/* ========================================================================== */
/*  Avaliação                                                                 */
/* ========================================================================== */

function pushCaveat(
  out: AttestationCaveat[],
  code: AttestationCaveatCode,
  count: number,
  detail: string,
): void {
  if (count > 0) out.push({ code, count, detail });
}

/**
 * Deriva ressalvas e veredito de uma trajetória. Determinística e independente
 * de hash: usada tanto na emissão quanto na reconferência (evita que um
 * falsificador declare `corroborated` sobre conteúdo com conflito).
 */
export function assessTimeline(
  timeline: PersonTimeline,
  subject: AttestationSubject,
): { verdict: AttestationVerdict; caveats: readonly AttestationCaveat[] } {
  const caveats: AttestationCaveat[] = [];

  const conflicts = timeline.transits.filter((t) => t.flag === 'co_presence_conflict').length;
  const mismatches =
    subject.personId === null
      ? 0
      : timeline.stays.filter(
          (s) => s.personId !== null && s.personId !== subject.personId,
        ).length;
  const unconfirmed = timeline.stays.filter((s) => s.confidence === 'unconfirmed').length;
  const open = timeline.stays.filter((s) => s.openAtEdge).length;
  const blind = timeline.transits.filter((t) => t.hasBlindGap).length;

  pushCaveat(
    caveats,
    'co_presence_conflict',
    conflicts,
    'A pessoa aparece em câmeras diferentes ao mesmo tempo: ao menos uma identificação está errada.',
  );
  pushCaveat(
    caveats,
    'subject_mismatch',
    mismatches,
    'Há permanência atribuída a outra pessoa dentro do atestado.',
  );
  pushCaveat(
    caveats,
    'unconfirmed_stay',
    unconfirmed,
    'Permanência sustentada apenas por leitura duvidosa (candidata).',
  );
  pushCaveat(
    caveats,
    'open_stay',
    open,
    'Permanência encosta no fim da janela: a duração é piso observado, não fato.',
  );
  pushCaveat(
    caveats,
    'blind_gap',
    blind,
    'Trecho de deslocamento atravessa leitura descartada: há lacuna na trajetória.',
  );
  pushCaveat(
    caveats,
    'excluded_unverified',
    timeline.excluded.unverified,
    'Leituras sem medição de semelhança ficaram fora da trajetória.',
  );
  pushCaveat(
    caveats,
    'excluded_spoof_suspect',
    timeline.excluded.spoofSuspect,
    'Leituras com suspeita de fraude ficaram fora da trajetória.',
  );
  pushCaveat(
    caveats,
    'excluded_unidentified',
    timeline.excluded.unidentified,
    'Leituras abaixo do corte de identificação ficaram fora da trajetória.',
  );
  pushCaveat(
    caveats,
    'truncated_result',
    timeline.truncated ? 1 : 0,
    'A consulta atingiu o teto de permanências: a trajetória está cortada.',
  );

  if (timeline.stays.length === 0) {
    pushCaveat(
      caveats,
      'no_observation',
      1,
      'Nenhuma permanência observada na janela. Isso não afirma ausência da pessoa.',
    );
  } else if (timeline.camerasVisited <= 1) {
    // Informativa: não enfraquece nem contesta, apenas delimita o alcance.
    pushCaveat(
      caveats,
      'single_camera',
      1,
      'Trajetória observada por uma única câmera: não há deslocamento demonstrado.',
    );
  }

  caveats.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));

  const contested = caveats.some((c) => CONTESTING.has(c.code));
  if (contested) return { verdict: 'contested', caveats };
  if (timeline.stays.length === 0) return { verdict: 'inconclusive', caveats };
  const weakened = caveats.some((c) => WEAKENING.has(c.code));
  return { verdict: weakened ? 'partial' : 'corroborated', caveats };
}

function computeStats(timeline: PersonTimeline): TimelineEvidenceStats {
  let confirmedDwellMs = 0;
  let openFloorMs = 0;
  let confirmedStays = 0;
  for (const stay of timeline.stays) {
    if (stay.confidence === 'confirmed') confirmedStays += 1;
    if (stay.openAtEdge) openFloorMs += stay.durationMs;
    else if (stay.confidence === 'confirmed') confirmedDwellMs += stay.durationMs;
  }
  return {
    stays: timeline.stays.length,
    confirmedStays,
    camerasVisited: timeline.camerasVisited,
    confirmedDwellMs,
    openFloorMs,
    excludedReadings:
      timeline.excluded.unverified +
      timeline.excluded.spoofSuspect +
      timeline.excluded.unidentified,
  };
}

/* ========================================================================== */
/*  Corrente e selo                                                           */
/* ========================================================================== */

function toAttestedStay(stay: PersonStay, index: number): AttestedStay {
  return {
    index,
    stayId: stay.id,
    cameraId: stay.cameraId,
    personId: stay.personId,
    startMs: stay.startMs,
    endMs: stay.endMs,
    durationMs: stay.durationMs,
    sightings: stay.sightings,
    confidence: stay.confidence,
    bestSimilarity: stay.bestSimilarity,
    openAtEdge: stay.openAtEdge,
  };
}

function toAttestedTransit(transit: PersonTransit): AttestedTransit {
  return {
    fromStayId: transit.fromStayId,
    toStayId: transit.toStayId,
    gapMs: transit.gapMs,
    flag: transit.flag,
    hasBlindGap: transit.hasBlindGap,
  };
}

/** Corpo canônico de uma permanência — exatamente o que o elo cobre. */
export function stayPayload(stay: AttestedStay): string {
  return canonicalize({
    bestSimilarity: stay.bestSimilarity,
    cameraId: stay.cameraId,
    confidence: stay.confidence,
    durationMs: stay.durationMs,
    endMs: stay.endMs,
    index: stay.index,
    openAtEdge: stay.openAtEdge,
    personId: stay.personId,
    sightings: stay.sightings,
    startMs: stay.startMs,
    stayId: stay.stayId,
  });
}

async function hashText(text: string, hashFn: HashFn): Promise<string> {
  return hashFn(new TextEncoder().encode(text));
}

export async function buildAttestationChain(
  stays: readonly AttestedStay[],
  hashFn: HashFn = sha256Hex,
): Promise<string[]> {
  const chain: string[] = [];
  let previous = ATTESTATION_GENESIS;
  for (const stay of stays) {
    previous = await hashText(`${previous}\n${stayPayload(stay)}`, hashFn);
    chain.push(previous);
  }
  return chain;
}

/** Tudo que o `rootHash` cobre — o documento inteiro menos o próprio selo. */
function attestationBody(a: Omit<TimelineAttestation, 'rootHash'>): string {
  return canonicalize({
    algorithm: a.algorithm,
    attestationId: a.attestationId,
    caveats: a.caveats,
    chain: a.chain,
    disclosure: a.disclosure,
    format: a.format,
    genesis: a.genesis,
    howToVerify: a.howToVerify,
    issuance: a.issuance,
    relatedExportRootHash: a.relatedExportRootHash,
    stats: a.stats,
    stays: a.stays.map((s) => JSON.parse(stayPayload(s)) as unknown),
    subject: a.subject,
    transits: a.transits,
    verdict: a.verdict,
    version: a.version,
    window: a.window,
  });
}

/** Monta o atestado completo e o sela. */
export async function buildTimelineAttestation(
  input: AttestationInput,
  hashFn: HashFn = sha256Hex,
): Promise<TimelineAttestation> {
  const { verdict, caveats } = assessTimeline(input.timeline, input.subject);
  const stays = input.timeline.stays.map(toAttestedStay);
  const transits = input.timeline.transits.map(toAttestedTransit);
  const chain = await buildAttestationChain(stays, hashFn);

  const body: Omit<TimelineAttestation, 'rootHash'> = {
    format: ATTESTATION_FORMAT,
    version: ATTESTATION_VERSION,
    algorithm: ATTESTATION_ALGORITHM,
    genesis: ATTESTATION_GENESIS,
    attestationId: input.attestationId,
    subject: input.subject,
    window: input.window,
    verdict,
    caveats,
    stats: computeStats(input.timeline),
    stays,
    transits,
    relatedExportRootHash: input.relatedExportRootHash ?? null,
    issuance: input.issuance,
    howToVerify: ATTESTATION_HOW_TO_VERIFY,
    disclosure: ATTESTATION_DISCLOSURE,
    chain,
  };

  return { ...body, rootHash: await hashText(attestationBody(body), hashFn) };
}

/**
 * Reconfere um atestado recebido de terceiro. Recalcula a corrente, o selo e
 * **o veredito** — um falsificador cuidadoso reescreve o documento inteiro de
 * forma coerente, e só a reavaliação do conteúdo o denuncia.
 */
export async function verifyTimelineAttestation(
  attestation: TimelineAttestation,
  hashFn: HashFn = sha256Hex,
): Promise<AttestationVerification> {
  const expectedChain = await buildAttestationChain(attestation.stays, hashFn);

  let firstBrokenIndex: number | null = null;
  const limit = Math.max(expectedChain.length, attestation.chain.length);
  for (let i = 0; i < limit; i += 1) {
    if (expectedChain[i] !== attestation.chain[i]) {
      firstBrokenIndex = i;
      break;
    }
  }

  const { rootHash: _ignored, ...body } = attestation;
  const rootMatches = (await hashText(attestationBody(body), hashFn)) === attestation.rootHash;

  const recomputed = recomputeVerdictFromDocument(attestation);
  return {
    intact: firstBrokenIndex === null && rootMatches && recomputed === attestation.verdict,
    firstBrokenIndex,
    rootMatches,
    verdictMatches: recomputed === attestation.verdict,
    recomputedVerdict: recomputed,
  };
}

/**
 * Reavalia o veredito a partir do conteúdo publicado no documento (não da
 * trajetória original, que o conferente não tem). Usa as mesmas classes de
 * ressalva da emissão.
 */
export function recomputeVerdictFromDocument(
  attestation: TimelineAttestation,
): AttestationVerdict {
  const codes = attestation.caveats.filter((c) => c.count > 0).map((c) => c.code);
  if (codes.some((c) => CONTESTING.has(c))) return 'contested';
  if (attestation.stays.length === 0) return 'inconclusive';
  if (codes.some((c) => WEAKENING.has(c))) return 'partial';
  return 'corroborated';
}

/* ========================================================================== */
/*  Apresentação                                                              */
/* ========================================================================== */

const VERDICT_LABEL: Record<AttestationVerdict, string> = {
  corroborated: 'Trajetória corroborada',
  partial: 'Trajetória parcial',
  contested: 'Trajetória contestada',
  inconclusive: 'Sem observação',
};

export function describeAttestationVerdict(verdict: AttestationVerdict): string {
  return VERDICT_LABEL[verdict];
}

const CAVEAT_LABEL: Record<AttestationCaveatCode, string> = {
  co_presence_conflict: 'Presença simultânea em câmeras distintas',
  unconfirmed_stay: 'Permanência não confirmada',
  open_stay: 'Permanência sem saída observada',
  blind_gap: 'Lacuna no deslocamento',
  excluded_unverified: 'Leituras não medidas',
  excluded_spoof_suspect: 'Leituras com suspeita de fraude',
  excluded_unidentified: 'Leituras abaixo do corte',
  truncated_result: 'Resultado cortado pelo teto',
  subject_mismatch: 'Permanência de outra pessoa',
  no_observation: 'Nenhuma permanência na janela',
  single_camera: 'Câmera única',
};

export function describeCaveat(code: AttestationCaveatCode): string {
  return CAVEAT_LABEL[code];
}
