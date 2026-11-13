/**
 * Onda 203 — Conferência de dossiê (vários atestados em um único parecer).
 *
 * A Onda 202 confere UM atestado. Na prática ninguém entrega um: entrega-se um
 * dossiê com a trajetória de várias pessoas, ou da mesma pessoa em vários dias.
 * O conferente precisa de um parecer de conjunto — e é justamente aí que os
 * erros perigosos aparecem, porque a tentação é resumir o lote por contagem
 * ("11 de 12 autênticos") quando o que importa é o pior elemento.
 *
 * Régua pura: não faz rede, não calcula hash, não lê relógio. Recebe as peças
 * já conferidas por {@link conferAttestation} e produz o cabeçalho do lote.
 *
 * ## Seis decisões que a simulação da onda fixou
 *
 * B1. **O pior manda; média não existe.** Um dossiê com uma peça adulterada é
 *     um dossiê comprometido. `95% autêntico` é uma frase sem significado
 *     probatório e não será exibida como conclusão.
 *
 * B2. **Cobertura é um EIXO SEPARADO do veredito.** Uma peça ilegível não é uma
 *     peça adulterada. Ela não pode acusar — mas também não pode desaparecer.
 *     Um lote com peça ilegível jamais recebe tom positivo, porque "tudo
 *     confere" seria falso sobre o que não foi conferido.
 *
 * B3. **Lote vazio é inconclusivo, nunca autêntico.** Zero peças conferidas
 *     produz cabeçalho nulo. Um arquivo vazio que exibisse selo verde seria a
 *     falha mais fácil de explorar do sistema inteiro.
 *
 * B4. **Selo repetido com conteúdo diferente é adulteração declarada.** Dois
 *     documentos que afirmam o mesmo `rootHash` mas divergem no conteúdo são
 *     uma contradição interna do dossiê: pelo menos um foi alterado. Cada peça
 *     isoladamente pode fechar sua própria corrente e ainda assim o CONJUNTO
 *     está comprometido — este é o único fato que só existe no lote.
 *
 * B5. **Peça repetida idêntica não pesa duas vezes.** Duplicata é ruído de
 *     montagem do dossiê, não evidência. Conta-se uma vez e informa-se.
 *
 * B6. **Ordem do arquivo é preservada.** O parecer nunca reordena as peças:
 *     o conferente precisa apontar "a terceira peça do dossiê que você me
 *     enviou". Ordenação por gravidade é oferecida como leitura auxiliar.
 */

import {
  severityRank,
  worstOutcome,
  type ConferenceOutcome,
  type ConferenceResult,
  type ConferenceTone,
} from './attestationConference';
import type { TimelineAttestation } from './timelineAttestation';

/* ========================================================================== */
/*  Leitura do arquivo                                                        */
/* ========================================================================== */

export const DOSSIER_FORMAT = 'visao.timeline.dossier';

/** Uma peça lida do arquivo — legível ou não. A ilegível NUNCA é descartada. */
export type DossierEntry =
  | {
      readonly kind: 'attestation';
      readonly index: number;
      readonly attestation: TimelineAttestation;
    }
  | { readonly kind: 'unreadable'; readonly index: number; readonly reason: string };

export interface ParsedDossier {
  readonly entries: readonly DossierEntry[];
  /** true quando a entrada era um único atestado, não uma coleção. */
  readonly single: boolean;
}

function looksLikeAttestation(value: unknown): value is TimelineAttestation {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<TimelineAttestation>;
  return (
    typeof v.rootHash === 'string' &&
    v.rootHash.length > 0 &&
    Array.isArray(v.chain) &&
    Array.isArray(v.stays)
  );
}

function collectionOf(root: unknown): { items: unknown[]; single: boolean } | null {
  if (Array.isArray(root)) return { items: root, single: false };
  if (root && typeof root === 'object') {
    const obj = root as Record<string, unknown>;
    for (const key of ['attestations', 'items', 'documents'] as const) {
      if (Array.isArray(obj[key])) return { items: obj[key] as unknown[], single: false };
    }
    // Um atestado solto também é um dossiê de uma peça: a tela é a mesma.
    return { items: [root], single: true };
  }
  return null;
}

/**
 * Aceita: array de atestados, envelope `{ attestations | items | documents }`
 * ou um atestado avulso. Peça malformada vira entrada `unreadable` — parar o
 * arquivo inteiro por causa de um elemento quebrado esconderia as peças boas
 * e, pior, esconderia a própria peça quebrada.
 */
export function parseDossier(raw: string): ParsedDossier {
  let root: unknown;
  try {
    root = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `O arquivo não é JSON válido: ${e instanceof Error ? e.message : 'erro de leitura'}.`,
      { cause: e }
    );
  }

  const collection = collectionOf(root);
  if (!collection) {
    throw new Error('O arquivo não contém atestado algum.');
  }

  const entries: DossierEntry[] = collection.items.map((item, i) => {
    const index = i + 1;
    if (looksLikeAttestation(item)) {
      return { kind: 'attestation', index, attestation: item };
    }
    return {
      kind: 'unreadable',
      index,
      reason: 'a peça não tem a forma de um atestado de trajetória',
    };
  });

  return { entries, single: collection.single };
}

/* ========================================================================== */
/*  Peças conferidas                                                          */
/* ========================================================================== */

export type BatchPiece =
  | {
      readonly kind: 'conferred';
      readonly index: number;
      readonly rootHash: string;
      readonly fingerprint: string;
      readonly result: ConferenceResult;
    }
  | {
      readonly kind: 'unreadable';
      readonly index: number;
      readonly reason: string;
    };

/**
 * Impressão de conteúdo usada só para detectar colisão de selo (B4). Não é
 * uma prova criptográfica — é uma projeção estável e barata do que o documento
 * afirma. Dois documentos com o mesmo `rootHash` e projeções diferentes já
 * bastam para declarar a contradição; conferir o hash é papel de quem verifica
 * cada peça, não do lote.
 */
export function contentFingerprint(attestation: TimelineAttestation): string {
  return [
    attestation.verdict,
    attestation.chain.join('|'),
    attestation.issuance?.issuedAtUtc ?? '',
    attestation.issuance?.issuedBy ?? '',
    String(attestation.stays?.length ?? 0),
  ].join('§');
}

/* ========================================================================== */
/*  Cabeçalho do lote                                                         */
/* ========================================================================== */

/** Quanto do dossiê foi efetivamente conferido. Eixo independente (B2). */
export type BatchCoverage = 'full' | 'partial' | 'none';

export interface SealConflict {
  readonly rootHash: string;
  /** Índices, em ordem de arquivo, das peças que colidem. */
  readonly indexes: readonly number[];
}

export interface BatchSummary {
  readonly total: number;
  readonly conferred: number;
  readonly unreadable: number;
  /** Peças conferidas com selo distinto. */
  readonly distinctSeals: number;
  /** Repetições idênticas descontadas de `conferred` (B5). */
  readonly duplicates: number;
  readonly conflicts: readonly SealConflict[];
  readonly coverage: BatchCoverage;
  readonly counts: Readonly<Record<ConferenceOutcome, number>>;
  /** Pior resultado individual; null quando nada foi conferido. */
  readonly worst: ConferenceOutcome | null;
  /**
   * Conclusão do dossiê. Igual a `worst`, salvo colisão de selo, que rebaixa o
   * conjunto a `tampered` mesmo com todas as peças íntegras (B4).
   */
  readonly headline: ConferenceOutcome | null;
  readonly tone: ConferenceTone;
  readonly reasons: readonly string[];
}

const EMPTY_COUNTS: Record<ConferenceOutcome, number> = {
  tampered: 0,
  forged_verdict: 0,
  registry_divergence: 0,
  unregistered: 0,
  origin_unknown: 0,
  authentic: 0,
};

function toneFor(headline: ConferenceOutcome | null, coverage: BatchCoverage): ConferenceTone {
  if (headline === null) return 'neutral';
  if (headline === 'tampered' || headline === 'forged_verdict') return 'critical';
  if (headline === 'registry_divergence' || headline === 'unregistered') return 'warning';
  if (headline === 'origin_unknown') return 'neutral';
  // authentic — só pode brilhar se o lote inteiro foi lido (B2).
  return coverage === 'full' ? 'positive' : 'neutral';
}

export function summarizeBatch(pieces: readonly BatchPiece[]): BatchSummary {
  const conferredPieces = pieces.filter(
    (p): p is Extract<BatchPiece, { kind: 'conferred' }> => p.kind === 'conferred'
  );
  const unreadable = pieces.length - conferredPieces.length;

  const counts: Record<ConferenceOutcome, number> = { ...EMPTY_COUNTS };
  for (const p of conferredPieces) counts[p.result.outcome] += 1;

  // Agrupamento por selo: separa duplicata inofensiva (B5) de colisão (B4).
  const bySeal = new Map<string, { indexes: number[]; fingerprints: Set<string> }>();
  for (const p of conferredPieces) {
    const bucket = bySeal.get(p.rootHash) ?? { indexes: [], fingerprints: new Set<string>() };
    bucket.indexes.push(p.index);
    bucket.fingerprints.add(p.fingerprint);
    bySeal.set(p.rootHash, bucket);
  }

  const conflicts: SealConflict[] = [];
  for (const [rootHash, bucket] of bySeal) {
    if (bucket.fingerprints.size > 1) {
      conflicts.push({ rootHash, indexes: [...bucket.indexes].sort((a, b) => a - b) });
    }
  }
  conflicts.sort((a, b) => (a.indexes[0] ?? 0) - (b.indexes[0] ?? 0));

  const distinctSeals = bySeal.size;
  const duplicates = conferredPieces.length - distinctSeals;

  const coverage: BatchCoverage =
    conferredPieces.length === 0 ? 'none' : unreadable === 0 ? 'full' : 'partial';

  const worst = worstOutcome(conferredPieces.map((p) => p.result.outcome));
  const headline: ConferenceOutcome | null = conflicts.length > 0 ? 'tampered' : worst;

  const reasons: string[] = [];

  if (pieces.length === 0) {
    reasons.push('O arquivo não contém peça alguma para conferir.');
  } else if (conferredPieces.length === 0) {
    reasons.push(`Nenhuma das ${pieces.length} peças pôde ser lida; o dossiê não foi conferido.`);
    reasons.push('Isto não é indício de adulteração: nada foi verificado.');
  } else {
    const first = conflicts[0];
    if (first) {
      reasons.push(
        `Duas peças do dossiê (posições ${first.indexes.join(' e ')}) declaram o mesmo selo com conteúdos diferentes: ao menos uma foi alterada.`
      );
    }
    reasons.push(
      conferredPieces.length === 1
        ? 'Uma peça conferida.'
        : `${conferredPieces.length} peças conferidas, com ${distinctSeals} selo(s) distinto(s).`
    );
    if (duplicates > 0 && conflicts.length === 0) {
      reasons.push(
        `${duplicates} peça(s) repetem um selo já presente com conteúdo idêntico; contam uma vez.`
      );
    }
    if (worst && conflicts.length === 0) {
      const bad = conferredPieces.filter((p) => p.result.outcome === worst);
      reasons.push(
        worst === 'authentic'
          ? 'Todas as peças conferidas estão íntegras e com origem confirmada.'
          : `O conjunto é limitado pela(s) peça(s) na(s) posição(ões) ${bad
              .map((p) => p.index)
              .join(', ')}.`
      );
    }
  }

  if (unreadable > 0 && conferredPieces.length > 0) {
    reasons.push(
      `${unreadable} peça(s) não puderam ser lidas e ficaram fora do parecer — o dossiê está conferido apenas em parte.`
    );
  }

  return {
    total: pieces.length,
    conferred: conferredPieces.length,
    unreadable,
    distinctSeals,
    duplicates,
    conflicts,
    coverage,
    counts,
    worst,
    headline,
    tone: toneFor(headline, coverage),
    reasons,
  };
}

/* ========================================================================== */
/*  Leituras auxiliares                                                       */
/* ========================================================================== */

/**
 * Peças em ordem de gravidade (pior primeiro), com empate resolvido pela ordem
 * do arquivo. Não substitui a listagem original (B6): é atalho de triagem.
 */
export function piecesBySeverity(pieces: readonly BatchPiece[]): readonly BatchPiece[] {
  return [...pieces].sort((a, b) => {
    // Ilegível não é grave: vai depois de qualquer peça conferida problemática
    // e antes das autênticas, para não sumir no fim de uma lista longa.
    const ra =
      a.kind === 'conferred' ? severityRank(a.result.outcome) : severityRank('origin_unknown');
    const rb =
      b.kind === 'conferred' ? severityRank(b.result.outcome) : severityRank('origin_unknown');
    if (ra !== rb) return ra - rb;
    return a.index - b.index;
  });
}

export function describeCoverage(coverage: BatchCoverage): string {
  switch (coverage) {
    case 'full':
      return 'Dossiê conferido integralmente';
    case 'partial':
      return 'Dossiê conferido em parte';
    case 'none':
      return 'Dossiê não conferido';
  }
}
