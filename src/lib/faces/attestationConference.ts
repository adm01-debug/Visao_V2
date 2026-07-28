/**
 * Onda 202 — Conferência de atestado de trajetória por terceiro.
 *
 * A Onda 201 deu ao atestado um registro de origem. Mas quem RECEBE o documento
 * (um advogado, uma seguradora, uma autoridade) não tem a trajetória original
 * nem acesso à tela que o emitiu — ele tem um arquivo JSON e uma pergunta:
 * "isto vale alguma coisa?".
 *
 * Esta é a regra única que responde essa pergunta. Ela não calcula hash e não
 * consulta banco: ela COMBINA os fatos apurados por quem faz essas duas coisas
 * (`verifyTimelineAttestation` e o registro) em um veredito de conferência.
 * Separar a combinação da apuração é o que permite simular exaustivamente as
 * transições sem depender de rede nem de crypto.
 *
 * Quatro invariantes que a simulação da onda persegue:
 *
 *  I1. **Falha de transporte nunca acusa.** Se a consulta ao registro não pôde
 *      ser feita, a procedência é DESCONHECIDA — jamais "não registrado" e
 *      muito menos "adulterado". Repetir o erro da Onda 159 aqui seria pior:
 *      lá era uma tela interna, aqui é um parecer entregue a terceiro.
 *
 *  I2. **Integridade domina procedência.** Documento com corrente quebrada é
 *      adulterado mesmo que conste no registro — e constar torna o caso MAIS
 *      grave, não menos (indica divergência entre a cópia e o original).
 *
 *  I3. **Ausência do registro não é prova de falsidade.** Um atestado íntegro
 *      que não consta pode ser de outra instalação, de outro locatário ou ter
 *      sido expurgado. O veredito diz "procedência não confirmada", e o texto
 *      exibido tem que dizer isso com todas as letras.
 *
 *  I4. **O veredito da conferência nunca melhora o veredito do documento.**
 *      Conferir um atestado `contested` não o torna corroborado; a conferência
 *      atesta autenticidade, não conteúdo. São dois eixos que a UI mostra
 *      lado a lado e que esta régua jamais funde num "status" único.
 */

import type {
  AttestationVerdict,
  AttestationVerification,
  TimelineAttestation,
} from './timelineAttestation';

/* ========================================================================== */
/*  Entradas                                                                  */
/* ========================================================================== */

/** Resultado da consulta ao registro de origem — três estados, não dois. */
export type RegistryLookup =
  | { readonly status: 'found'; readonly issuedAt: string; readonly issuedBy: string | null }
  | { readonly status: 'absent' }
  | { readonly status: 'unavailable'; readonly reason: string };

export interface ConferenceInput {
  readonly attestation: TimelineAttestation;
  readonly verification: AttestationVerification;
  readonly registry: RegistryLookup;
}

/* ========================================================================== */
/*  Saída                                                                     */
/* ========================================================================== */

/**
 * Ordem deliberada, do pior para o melhor. `severityRank` depende dela.
 */
export type ConferenceOutcome =
  /** Corrente ou selo não fecham: o arquivo foi alterado depois de emitido. */
  | 'tampered'
  /** Selo fecha, mas o veredito publicado não é o que o conteúdo produz. */
  | 'forged_verdict'
  /** Documento íntegro, mas o registro contradiz a emissão declarada. */
  | 'registry_divergence'
  /** Documento íntegro; o registro não pôde ser consultado. */
  | 'origin_unknown'
  /** Documento íntegro; o selo não consta no registro consultado. */
  | 'unregistered'
  /** Documento íntegro e selo confirmado no registro de origem. */
  | 'authentic';

const ORDER: readonly ConferenceOutcome[] = [
  'tampered',
  'forged_verdict',
  'registry_divergence',
  'origin_unknown',
  'unregistered',
  'authentic',
];

export type ConferenceTone = 'critical' | 'warning' | 'neutral' | 'positive';

export interface ConferenceResult {
  readonly outcome: ConferenceOutcome;
  /** true apenas quando o arquivo confere consigo mesmo em todos os eixos. */
  readonly documentIntact: boolean;
  /** true apenas quando o selo foi POSITIVAMENTE localizado no registro. */
  readonly originConfirmed: boolean;
  /** O veredito do documento, repetido aqui para que a UI nunca o recalcule. */
  readonly documentVerdict: AttestationVerdict;
  readonly tone: ConferenceTone;
  /** Motivos legíveis, em ordem de relevância. Nunca vazio. */
  readonly reasons: readonly string[];
}

/* ========================================================================== */
/*  Regra                                                                     */
/* ========================================================================== */

function registryDiverges(
  attestation: TimelineAttestation,
  lookup: Extract<RegistryLookup, { status: 'found' }>,
): string | null {
  const declaredAt = attestation.issuance?.issuedAtUtc ?? null;
  if (declaredAt && lookup.issuedAt && !sameInstant(declaredAt, lookup.issuedAt)) {
    return `O registro data a emissão em ${lookup.issuedAt}, mas o documento declara ${declaredAt}.`;
  }
  const declaredBy = attestation.issuance?.issuedBy ?? null;
  if (declaredBy && lookup.issuedBy && declaredBy !== lookup.issuedBy) {
    return `O registro atribui a emissão a outro autor (${lookup.issuedBy}).`;
  }
  return null;
}

/**
 * Comparação por instante, não por texto: `2026-07-29T10:00:00Z` e
 * `2026-07-29T10:00:00.000+00:00` são o MESMO carimbo. Divergência textual
 * de formato acusando adulteração seria um falso positivo grave — e é
 * exatamente o que uma coluna `timestamptz` devolve ao ser serializada.
 */
function sameInstant(a: string, b: string): boolean {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b;
  return ta === tb;
}

export function conferAttestation(input: ConferenceInput): ConferenceResult {
  const { attestation, verification, registry } = input;
  const documentVerdict = attestation.verdict;
  const originConfirmed = registry.status === 'found';

  // I2 — integridade primeiro. A corrente quebrada é o fato mais forte que
  // existe sobre o arquivo e nenhuma confirmação de registro o atenua.
  if (!verification.rootMatches || verification.firstBrokenIndex !== null) {
    const reasons: string[] = [];
    if (verification.firstBrokenIndex !== null) {
      reasons.push(
        `A corrente de permanências quebra no elo ${verification.firstBrokenIndex + 1}: o trecho foi alterado após a emissão.`,
      );
    }
    if (!verification.rootMatches) {
      reasons.push('O selo do documento não corresponde ao seu próprio conteúdo.');
    }
    if (originConfirmed) {
      reasons.push(
        'O selo consta no registro de origem, o que indica que esta CÓPIA divergiu do original arquivado.',
      );
    }
    return {
      outcome: 'tampered',
      documentIntact: false,
      originConfirmed,
      documentVerdict,
      tone: 'critical',
      reasons,
    };
  }

  // Selo fecha, mas o veredito publicado não é o que as ressalvas produzem.
  if (!verification.verdictMatches) {
    return {
      outcome: 'forged_verdict',
      documentIntact: false,
      originConfirmed,
      documentVerdict,
      tone: 'critical',
      reasons: [
        `O documento declara "${documentVerdict}", mas o conteúdo publicado produz "${verification.recomputedVerdict}".`,
        'Um selo íntegro sobre um veredito reescrito significa que o documento foi remontado, não apenas editado.',
      ],
    };
  }

  if (registry.status === 'found') {
    const divergence = registryDiverges(attestation, registry);
    if (divergence) {
      return {
        outcome: 'registry_divergence',
        documentIntact: true,
        originConfirmed: true,
        documentVerdict,
        tone: 'warning',
        reasons: [
          divergence,
          'O conteúdo confere consigo mesmo; a contradição está nos dados de emissão.',
        ],
      };
    }
    return {
      outcome: 'authentic',
      documentIntact: true,
      originConfirmed: true,
      documentVerdict,
      tone: 'positive',
      reasons: [
        'O conteúdo confere com o selo em todos os elos.',
        `O selo consta no registro de origem, emitido em ${registry.issuedAt}.`,
      ],
    };
  }

  // I1 — sem consulta não há acusação nem absolvição.
  if (registry.status === 'unavailable') {
    return {
      outcome: 'origin_unknown',
      documentIntact: true,
      originConfirmed: false,
      documentVerdict,
      tone: 'neutral',
      reasons: [
        'O conteúdo confere com o selo em todos os elos.',
        `Não foi possível consultar o registro de origem (${registry.reason}); a procedência permanece não verificada.`,
        'Isto NÃO é indício de adulteração: o arquivo está íntegro.',
      ],
    };
  }

  // I3 — ausente é ausente.
  return {
    outcome: 'unregistered',
    documentIntact: true,
    originConfirmed: false,
    documentVerdict,
    tone: 'warning',
    reasons: [
      'O conteúdo confere com o selo em todos os elos.',
      'O selo não consta no registro consultado: o atestado pode ter sido emitido em outra instalação ou já ter sido expurgado.',
      'A integridade do arquivo está confirmada; apenas a procedência não está.',
    ],
  };
}

/* ========================================================================== */
/*  Apresentação                                                              */
/* ========================================================================== */

const OUTCOME_LABEL: Record<ConferenceOutcome, string> = {
  tampered: 'Documento adulterado',
  forged_verdict: 'Veredito remontado',
  registry_divergence: 'Divergência com o registro',
  origin_unknown: 'Procedência não verificada',
  unregistered: 'Fora do registro consultado',
  authentic: 'Atestado autêntico',
};

const OUTCOME_SUMMARY: Record<ConferenceOutcome, string> = {
  tampered: 'O arquivo foi alterado depois de emitido e não pode ser usado como prova.',
  forged_verdict: 'O selo fecha, mas a conclusão publicada não é a que o conteúdo sustenta.',
  registry_divergence: 'O conteúdo é íntegro, mas os dados de emissão contradizem o registro.',
  origin_unknown: 'Arquivo íntegro; a origem não pôde ser consultada agora.',
  unregistered: 'Arquivo íntegro; o selo não foi localizado neste registro.',
  authentic: 'Arquivo íntegro e origem confirmada no sistema emissor.',
};

export function describeConferenceOutcome(outcome: ConferenceOutcome): string {
  return OUTCOME_LABEL[outcome];
}

export function summarizeConferenceOutcome(outcome: ConferenceOutcome): string {
  return OUTCOME_SUMMARY[outcome];
}

/** 0 = pior. Usado para ordenar lotes e escolher o cabeçalho de um conjunto. */
export function severityRank(outcome: ConferenceOutcome): number {
  return ORDER.indexOf(outcome);
}

/**
 * Cabeçalho de um lote: o PIOR resultado manda. Média de conferência não
 * existe — um dossiê com uma peça adulterada é um dossiê comprometido.
 */
export function worstOutcome(
  outcomes: readonly ConferenceOutcome[],
): ConferenceOutcome | null {
  if (outcomes.length === 0) return null;
  return outcomes.reduce((worst, o) => (severityRank(o) < severityRank(worst) ? o : worst));
}
