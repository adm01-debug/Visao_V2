/**
 * Onda 159 — Registro probatório: a regra única de como uma exportação selada
 * é APRESENTADA a um operador.
 *
 * Por que isto é um módulo puro e não lógica solta na página:
 *
 * C1 — Qualidade do material (`verdict`, decidido na selagem pela Onda 156) e
 *      integridade pós-selo (`verifyManifest`, recalculada agora) são DUAS
 *      perguntas diferentes e não podem virar um selo só. Uma peça pode ser
 *      `broken` na origem (teve lacuna) e ainda assim estar perfeitamente
 *      íntegra desde a selagem — e o contrário também existe: material
 *      `admissible` cuja corrente foi adulterada depois. Fundir os dois em um
 *      badge apagaria exatamente a informação que um perito precisa.
 *
 * C2 — "Ainda não verificado" JAMAIS pode ser exibido como "íntegro". O estado
 *      inicial de toda linha é `unverified`, nunca `intact`. Presumir
 *      integridade por omissão é a falha clássica que transforma uma tela de
 *      auditoria em teatro de auditoria.
 *
 * C3 — Falha de transporte na verificação (rede caiu, 500, timeout) é
 *      `indeterminate`, NUNCA `tampered`. Acusar adulteração por causa de um
 *      Wi-Fi ruim destrói a credibilidade do sinal verdadeiro. Só existe uma
 *      origem legítima para `tampered`: o servidor respondeu e disse que a
 *      corrente não fecha.
 *
 * C4 — 404 na verificação é `missing`, não `indeterminate`: a linha existia na
 *      listagem e sumiu na conferência. Como `evidence_exports` é imutável e
 *      sem DELETE (Onda 157), isso é anomalia grave e precisa de estado próprio.
 *
 * C5 — A ordenação padrão é por selagem decrescente, mas o que sobe ao topo do
 *      resumo é o PIOR estado, não o mais recente. Um registro adulterado no
 *      meio de 300 linhas não pode depender de rolagem para ser visto.
 */

import type { CustodyVerdictLevel } from './custodyManifest';

/* ========================================================================== */
/*  Entrada                                                                   */
/* ========================================================================== */

/** Linha crua vinda de `public.evidence_exports` (leitura sob RLS do chamador). */
export interface EvidenceExportRow {
  readonly id: string;
  readonly export_id: string;
  readonly camera_id: string;
  readonly root_hash: string;
  readonly verdict: string;
  readonly coverage_ratio: number;
  readonly segment_count: number;
  readonly gap_count: number;
  readonly sealed_at: string;
}

/** Resposta do verbo `verify` da edge function `evidence-seal`. */
export interface VerifyResponse {
  readonly export_id: string;
  readonly intact: boolean;
  readonly first_broken_index: number | null;
  readonly root_matches: boolean;
}

/** Como a verificação daquela linha terminou (ou não começou). */
export type VerificationOutcome =
  | { readonly status: 'unverified' }
  | { readonly status: 'checking' }
  | { readonly status: 'ok'; readonly checkedAtMs: number }
  | {
      readonly status: 'broken';
      readonly checkedAtMs: number;
      readonly firstBrokenIndex: number | null;
      readonly rootMatches: boolean;
    }
  | { readonly status: 'missing'; readonly checkedAtMs: number }
  | { readonly status: 'transport_error'; readonly checkedAtMs: number; readonly detail: string };

/* ========================================================================== */
/*  Saída                                                                     */
/* ========================================================================== */

/**
 * Estado de integridade exibido. Deliberadamente separado de
 * `CustodyVerdictLevel`: são eixos independentes (C1).
 */
export type IntegrityState =
  'unverified' | 'checking' | 'intact' | 'tampered' | 'missing' | 'indeterminate';

export type Tone = 'neutral' | 'positive' | 'warning' | 'critical';

export interface IntegrityBadge {
  readonly state: IntegrityState;
  readonly label: string;
  readonly tone: Tone;
  /** Frase curta que explica ao operador o que o estado significa. */
  readonly detail: string;
}

export interface VerdictBadge {
  readonly level: CustodyVerdictLevel | 'unknown';
  readonly label: string;
  readonly tone: Tone;
}

export interface EvidenceExportView {
  readonly id: string;
  readonly exportId: string;
  readonly cameraId: string;
  /** Prefixo do selo, suficiente para conferência visual sem poluir a tabela. */
  readonly rootHashShort: string;
  readonly rootHash: string;
  readonly sealedAtMs: number | null;
  readonly segmentCount: number;
  readonly gapCount: number;
  /** 0..100, uma casa decimal. */
  readonly coveragePercent: number;
  readonly verdict: VerdictBadge;
  readonly integrity: IntegrityBadge;
  /**
   * Severidade combinada para ordenação/resumo. Quanto MAIOR, mais urgente.
   * Integridade sempre domina qualidade: adulteração é crime, lacuna é defeito.
   */
  readonly severityRank: number;
  /** Precisa de ação humana agora (adulterado, sumido ou indeterminado). */
  readonly actionable: boolean;
}

export interface RegistrySummary {
  readonly total: number;
  readonly verified: number;
  readonly unverified: number;
  readonly tampered: number;
  readonly missing: number;
  readonly indeterminate: number;
  readonly admissible: number;
  readonly weakened: number;
  readonly broken: number;
  /** Estado que deve ser anunciado no topo — o pior, não o mais recente (C5). */
  readonly headline: IntegrityState;
  readonly headlineTone: Tone;
  readonly headlineMessage: string;
}

/* ========================================================================== */
/*  Constantes de regra                                                       */
/* ========================================================================== */

/** Comprimento do prefixo do selo exibido na listagem. */
export const ROOT_HASH_PREFIX_LENGTH = 12;

const VERDICT_RANK: Record<CustodyVerdictLevel | 'unknown', number> = {
  admissible: 0,
  weakened: 1,
  broken: 2,
  unknown: 2,
};

const INTEGRITY_RANK: Record<IntegrityState, number> = {
  intact: 0,
  checking: 1,
  unverified: 2,
  indeterminate: 3,
  missing: 4,
  tampered: 5,
};

/* ========================================================================== */
/*  Regras                                                                    */
/* ========================================================================== */

/**
 * Converte a resposta bruta do verbo `verify` em desfecho.
 *
 * `intact === true` só é aceito quando `root_matches` também é verdadeiro: o
 * servidor recalcula os dois e uma resposta internamente contraditória é
 * tratada como corrente quebrada, nunca como sucesso.
 */
export function outcomeFromVerify(
  response: VerifyResponse,
  checkedAtMs: number
): VerificationOutcome {
  if (response.intact && response.root_matches) {
    return { status: 'ok', checkedAtMs };
  }
  return {
    status: 'broken',
    checkedAtMs,
    firstBrokenIndex: response.first_broken_index,
    rootMatches: response.root_matches,
  };
}

/**
 * Converte uma falha da chamada em desfecho.
 *
 * `export_not_found` é o único erro que vira `missing`; todo o resto é
 * transporte/indefinição (C3). Em particular 401/403 NÃO viram adulteração:
 * perder a permissão no meio da sessão não desqualifica a prova.
 */
export function outcomeFromFailure(
  errorCode: string | null,
  detail: string,
  checkedAtMs: number
): VerificationOutcome {
  if (errorCode === 'export_not_found') {
    return { status: 'missing', checkedAtMs };
  }
  return { status: 'transport_error', checkedAtMs, detail };
}

function verdictBadge(raw: string): VerdictBadge {
  switch (raw) {
    case 'admissible':
      return { level: 'admissible', label: 'Admissível', tone: 'positive' };
    case 'weakened':
      return { level: 'weakened', label: 'Enfraquecida', tone: 'warning' };
    case 'broken':
      return { level: 'broken', label: 'Comprometida', tone: 'critical' };
    default:
      // Veredito desconhecido = banco à frente do front. Trata-se pelo pior
      // caso: nunca exibir como aceitável algo que não se sabe interpretar.
      return { level: 'unknown', label: 'Veredito desconhecido', tone: 'critical' };
  }
}

function integrityBadge(outcome: VerificationOutcome): IntegrityBadge {
  switch (outcome.status) {
    case 'unverified':
      return {
        state: 'unverified',
        label: 'Não conferida',
        tone: 'neutral',
        detail: 'A corrente ainda não foi recalculada nesta sessão.',
      };
    case 'checking':
      return {
        state: 'checking',
        label: 'Conferindo…',
        tone: 'neutral',
        detail: 'Recalculando a corrente de custódia no servidor.',
      };
    case 'ok':
      return {
        state: 'intact',
        label: 'Íntegra',
        tone: 'positive',
        detail: 'A corrente e o selo conferem com o manifesto guardado.',
      };
    case 'broken': {
      const where =
        outcome.firstBrokenIndex === null
          ? 'O selo não corresponde ao manifesto guardado.'
          : `Primeiro elo divergente no segmento ${outcome.firstBrokenIndex + 1}.`;
      return { state: 'tampered', label: 'Adulterada', tone: 'critical', detail: where };
    }
    case 'missing':
      return {
        state: 'missing',
        label: 'Não localizada',
        tone: 'critical',
        detail: 'A exportação estava na listagem e não foi encontrada na conferência.',
      };
    case 'transport_error':
      return {
        state: 'indeterminate',
        label: 'Indeterminada',
        tone: 'warning',
        detail: `Não foi possível concluir a conferência: ${outcome.detail}`,
      };
  }
}

function parseMs(value: string): number | null {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Projeta uma linha crua + desfecho da conferência na visão apresentável. */
export function toExportView(
  row: EvidenceExportRow,
  outcome: VerificationOutcome = { status: 'unverified' }
): EvidenceExportView {
  const verdict = verdictBadge(row.verdict);
  const integrity = integrityBadge(outcome);

  // Integridade domina: o rank dela é multiplicado para que nenhuma combinação
  // de qualidade consiga ultrapassar um degrau de integridade.
  const severityRank = INTEGRITY_RANK[integrity.state] * 10 + VERDICT_RANK[verdict.level];

  return {
    id: row.id,
    exportId: row.export_id,
    cameraId: row.camera_id,
    rootHash: row.root_hash,
    rootHashShort: row.root_hash.slice(0, ROOT_HASH_PREFIX_LENGTH),
    sealedAtMs: parseMs(row.sealed_at),
    segmentCount: row.segment_count,
    gapCount: row.gap_count,
    coveragePercent: Math.round(clampRatio(Number(row.coverage_ratio)) * 1000) / 10,
    verdict,
    integrity,
    severityRank,
    actionable:
      integrity.state === 'tampered' ||
      integrity.state === 'missing' ||
      integrity.state === 'indeterminate',
  };
}

/**
 * Ordena para leitura humana: mais grave primeiro; empate pelo mais recente.
 * Registro sem data válida vai para o fim (não pode roubar o topo por acidente
 * de parsing), mas sua gravidade continua contando no resumo.
 */
export function sortForReview(views: readonly EvidenceExportView[]): readonly EvidenceExportView[] {
  return [...views].sort((a, b) => {
    if (a.severityRank !== b.severityRank) return b.severityRank - a.severityRank;
    const at = a.sealedAtMs ?? Number.NEGATIVE_INFINITY;
    const bt = b.sealedAtMs ?? Number.NEGATIVE_INFINITY;
    if (at !== bt) return bt - at;
    return a.exportId.localeCompare(b.exportId);
  });
}

/** Resumo do registro. O título é sempre o pior estado presente (C5). */
export function summarize(views: readonly EvidenceExportView[]): RegistrySummary {
  let verified = 0;
  let unverified = 0;
  let tampered = 0;
  let missing = 0;
  let indeterminate = 0;
  let admissible = 0;
  let weakened = 0;
  let broken = 0;

  for (const view of views) {
    switch (view.integrity.state) {
      case 'intact':
        verified += 1;
        break;
      case 'tampered':
        tampered += 1;
        break;
      case 'missing':
        missing += 1;
        break;
      case 'indeterminate':
        indeterminate += 1;
        break;
      default:
        unverified += 1;
    }
    switch (view.verdict.level) {
      case 'admissible':
        admissible += 1;
        break;
      case 'weakened':
        weakened += 1;
        break;
      default:
        broken += 1;
    }
  }

  let headline: IntegrityState = 'intact';
  let headlineTone: Tone = 'positive';
  let headlineMessage = 'Todas as exportações conferidas estão íntegras.';

  if (views.length === 0) {
    headline = 'unverified';
    headlineTone = 'neutral';
    headlineMessage = 'Nenhuma exportação probatória foi selada até agora.';
  } else if (tampered > 0) {
    headline = 'tampered';
    headlineTone = 'critical';
    headlineMessage = `${tampered} exportação(ões) com corrente adulterada. Preserve o material e registre o incidente.`;
  } else if (missing > 0) {
    headline = 'missing';
    headlineTone = 'critical';
    headlineMessage = `${missing} exportação(ões) desapareceram entre a listagem e a conferência.`;
  } else if (indeterminate > 0) {
    headline = 'indeterminate';
    headlineTone = 'warning';
    headlineMessage = `${indeterminate} conferência(s) não puderam ser concluídas. Repita a verificação.`;
  } else if (unverified > 0) {
    headline = 'unverified';
    headlineTone = 'neutral';
    headlineMessage = `${unverified} exportação(ões) ainda não foram conferidas nesta sessão.`;
  }

  return {
    total: views.length,
    verified,
    unverified,
    tampered,
    missing,
    indeterminate,
    admissible,
    weakened,
    broken,
    headline,
    headlineTone,
    headlineMessage,
  };
}
