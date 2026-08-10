/**
 * Onda 199 — Linha do tempo da pessoa (onde e quando ela passou).
 *
 * A Onda 197 devolveu leituras soltas e a Onda 198 respondeu "é esta pessoa?".
 * Falta a pergunta que fecha a investigação: **"por onde ela andou?"**. Uma
 * lista de 300 leituras não responde isso; um punhado de *permanências* por
 * câmera, em ordem, responde.
 *
 * Este módulo é a **régua única** dessa consolidação. Puro: sem rede, sem
 * relógio próprio, sem banco. Recebe leituras já julgadas pela Onda 197 e
 * devolve permanências, trechos de deslocamento e as ressalvas de cada um.
 *
 * ## O que esta régua se recusa a fazer
 *
 * 1. **Não constrói trajetória com suspeita.** Só leitura `identified` abre e
 *    sustenta uma permanência confirmada. `candidate` entra como permanência
 *    **não confirmada** e nunca funde nem prolonga uma confirmada — senão a
 *    dúvida de uma leitura contaminaria o horário de saída de outra.
 *
 * 2. **Não usa o que não foi medido.** `unverified` e `spoof_suspect` ficam
 *    fora da trajetória e são contados como {@link PersonTimeline.excluded}.
 *    Silenciá-los faria a linha do tempo parecer completa.
 *
 * 3. **Não afirma duração de permanência aberta.** Se a última leitura encosta
 *    no fim da janela ({@link EDGE_TOLERANCE_MS}), a permanência é marcada
 *    `openAtEdge` e sua duração é um **piso observado**, nunca um fato. Mesma
 *    regra dos episódios abertos (Onda 179).
 *
 * 4. **Não escolhe entre duas câmeras simultâneas.** Se a pessoa aparece em
 *    câmeras diferentes com sobreposição temporal, isso é
 *    `co_presence_conflict`: ou uma identificação está errada, ou são dois
 *    equipamentos vendo o mesmo ponto. A régua declara o conflito; quem decide
 *    é o operador.
 *
 * 5. **Não inventa deslocamento.** Trecho entre permanências só é emitido
 *    quando ambas as pontas são confirmadas; caso contrário o trecho é
 *    `unconfirmed` — e um trecho que atravessa uma exclusão é marcado como
 *    tendo **lacuna**.
 *
 * 6. **Não devolve ordem instável.** Instante asc; empate por câmera e id.
 */

import type { FaceSearchResult } from './faceSearch';

/** Intervalo sem leitura que encerra uma permanência na mesma câmera. */
export const SESSION_GAP_MS = 5 * 60 * 1000;

/** Encostar a este ponto do fim da janela deixa a permanência aberta. */
export const EDGE_TOLERANCE_MS = 60 * 1000;

/** Sobreposição em câmeras distintas abaixo disso é conflito de co-presença. */
export const MIN_TRANSIT_MS = 0;

/** Teto de permanências devolvidas por consulta. */
export const MAX_STAYS = 200;

export type StayConfidence = 'confirmed' | 'unconfirmed';

export interface PersonStay {
  readonly id: string;
  readonly cameraId: string | null;
  readonly personId: string | null;
  readonly startMs: number;
  readonly endMs: number;
  /** Duração observada. Quando `openAtEdge`, é piso — não fato. */
  readonly durationMs: number;
  readonly sightings: number;
  readonly confidence: StayConfidence;
  /** Melhor semelhança medida na permanência; `null` se nenhuma foi medida. */
  readonly bestSimilarity: number | null;
  /** A permanência encosta no fim da janela: fim não observado. */
  readonly openAtEdge: boolean;
  readonly firstImageUrl: string | null;
}

export type TransitFlag = 'confirmed' | 'unconfirmed' | 'co_presence_conflict';

export interface PersonTransit {
  readonly fromStayId: string;
  readonly toStayId: string;
  readonly fromCameraId: string | null;
  readonly toCameraId: string | null;
  /** Tempo entre o fim de uma permanência e o início da seguinte. Negativo = sobreposição. */
  readonly gapMs: number;
  readonly flag: TransitFlag;
  /** Houve leitura descartada dentro do intervalo: o trecho tem lacuna. */
  readonly hasBlindGap: boolean;
  readonly rationale: string;
}

export interface PersonTimeline {
  readonly stays: readonly PersonStay[];
  readonly transits: readonly PersonTransit[];
  /** Leituras fora da trajetória por não terem sido medidas ou serem fraude. */
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

const EMPTY_TIMELINE: PersonTimeline = {
  stays: [],
  transits: [],
  excluded: { unverified: 0, spoofSuspect: 0, unidentified: 0 },
  firstSeenMs: null,
  lastSeenMs: null,
  camerasVisited: 0,
  hasConflict: false,
  truncated: false,
};

interface Bucket {
  cameraId: string | null;
  personId: string | null;
  confidence: StayConfidence;
  startMs: number;
  endMs: number;
  sightings: number;
  bestSimilarity: number | null;
  firstImageUrl: string | null;
  firstId: string;
}

const cameraKey = (id: string | null): string => id ?? '\u0000sem-camera';

/**
 * Consolida leituras já julgadas em permanências e deslocamentos.
 *
 * @param windowEndMs fim da janela consultada — usado só para saber se a
 * última permanência ficou aberta. Nunca para inventar um fim.
 */
export function buildPersonTimeline(
  results: readonly FaceSearchResult[],
  windowEndMs: number
): PersonTimeline {
  if (results.length === 0) return EMPTY_TIMELINE;

  let unverified = 0;
  let spoofSuspect = 0;
  let unidentified = 0;

  const usable: FaceSearchResult[] = [];
  for (const r of results) {
    switch (r.verdict) {
      case 'identified':
      case 'candidate':
        usable.push(r);
        break;
      case 'unverified':
        unverified += 1;
        break;
      case 'spoof_suspect':
        spoofSuspect += 1;
        break;
      default:
        unidentified += 1;
    }
  }

  // Ordem determinística crescente: a linha do tempo se lê do começo.
  const ordered = [...usable].sort((a, b) => {
    if (a.timestampMs !== b.timestampMs) return a.timestampMs - b.timestampMs;
    const ca = cameraKey(a.cameraId);
    const cb = cameraKey(b.cameraId);
    if (ca !== cb) return ca < cb ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const open = new Map<string, Bucket>();
  const closed: Bucket[] = [];

  const flush = (key: string) => {
    const bucket = open.get(key);
    if (bucket !== undefined) {
      closed.push(bucket);
      open.delete(key);
    }
  };

  for (const r of ordered) {
    const confidence: StayConfidence = r.verdict === 'identified' ? 'confirmed' : 'unconfirmed';
    // A chave separa por câmera E por grau de certeza: dúvida nunca prolonga
    // uma permanência confirmada.
    const key = `${cameraKey(r.cameraId)}|${confidence}`;
    const current = open.get(key);

    if (current !== undefined && r.timestampMs - current.endMs <= SESSION_GAP_MS) {
      current.endMs = r.timestampMs;
      current.sightings += 1;
      if (r.similarity !== null && Number.isFinite(r.similarity)) {
        current.bestSimilarity =
          current.bestSimilarity === null
            ? r.similarity
            : Math.max(current.bestSimilarity, r.similarity);
      }
      continue;
    }

    flush(key);
    open.set(key, {
      cameraId: r.cameraId,
      personId: r.personId,
      confidence,
      startMs: r.timestampMs,
      endMs: r.timestampMs,
      sightings: 1,
      bestSimilarity: r.similarity !== null && Number.isFinite(r.similarity) ? r.similarity : null,
      firstImageUrl: r.imageUrl,
      firstId: r.id,
    });
  }

  for (const key of [...open.keys()]) flush(key);

  closed.sort((a, b) => {
    if (a.startMs !== b.startMs) return a.startMs - b.startMs;
    const ca = cameraKey(a.cameraId);
    const cb = cameraKey(b.cameraId);
    if (ca !== cb) return ca < cb ? -1 : 1;
    return a.firstId < b.firstId ? -1 : a.firstId > b.firstId ? 1 : 0;
  });

  const truncated = closed.length > MAX_STAYS;
  const kept = closed.slice(0, MAX_STAYS);

  const stays: PersonStay[] = kept.map((b) => ({
    id: b.firstId,
    cameraId: b.cameraId,
    personId: b.personId,
    startMs: b.startMs,
    endMs: b.endMs,
    durationMs: b.endMs - b.startMs,
    sightings: b.sightings,
    confidence: b.confidence,
    bestSimilarity: b.bestSimilarity,
    openAtEdge: windowEndMs - b.endMs <= EDGE_TOLERANCE_MS,
    firstImageUrl: b.firstImageUrl,
  }));

  const excludedTotal = unverified + spoofSuspect + unidentified;
  const transits: PersonTransit[] = [];

  for (let i = 1; i < stays.length; i++) {
    const prev = stays[i - 1] as PersonStay;
    const cur = stays[i] as PersonStay;
    const gapMs = cur.startMs - prev.endMs;
    const sameCamera = cameraKey(prev.cameraId) === cameraKey(cur.cameraId);

    let flag: TransitFlag;
    let rationale: string;

    if (!sameCamera && gapMs < MIN_TRANSIT_MS) {
      flag = 'co_presence_conflict';
      rationale =
        'A pessoa aparece em duas câmeras ao mesmo tempo: ou uma identificação está errada, ou os equipamentos veem o mesmo ponto.';
    } else if (prev.confidence === 'confirmed' && cur.confidence === 'confirmed') {
      flag = 'confirmed';
      rationale = 'Deslocamento entre duas permanências confirmadas.';
    } else {
      flag = 'unconfirmed';
      rationale = 'Uma das pontas não está confirmada; o trecho exige conferência.';
    }

    transits.push({
      fromStayId: prev.id,
      toStayId: cur.id,
      fromCameraId: prev.cameraId,
      toCameraId: cur.cameraId,
      gapMs,
      flag,
      // Sem saber o instante de cada exclusão não se afirma "sem lacuna":
      // havendo qualquer descarte na janela, todo trecho é declarado incerto.
      hasBlindGap: excludedTotal > 0,
      rationale,
    });
  }

  const cameras = new Set(stays.map((s) => cameraKey(s.cameraId)));

  return {
    stays,
    transits,
    excluded: { unverified, spoofSuspect, unidentified },
    firstSeenMs: stays.length > 0 ? (stays[0] as PersonStay).startMs : null,
    lastSeenMs: stays.reduce<number | null>(
      (acc, s) => (acc === null || s.endMs > acc ? s.endMs : acc),
      null
    ),
    camerasVisited: cameras.size,
    hasConflict: transits.some((t) => t.flag === 'co_presence_conflict'),
    truncated,
  };
}

/** Frase única da permanência — a tela nunca reinventa a ressalva. */
export function describeStay(stay: PersonStay): string {
  const minutes = Math.max(0, Math.round(stay.durationMs / 60000));
  const base =
    stay.sightings === 1 ? 'Uma única leitura' : `${stay.sightings} leituras em ${minutes} min`;
  const grade =
    stay.confidence === 'confirmed' ? 'permanência confirmada' : 'permanência não confirmada';
  return stay.openAtEdge
    ? `${base} — ${grade}; a saída não foi observada (janela terminou).`
    : `${base} — ${grade}.`;
}
