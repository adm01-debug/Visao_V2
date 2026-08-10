/**
 * Onda 160 — Dossiê portátil de custódia.
 *
 * Problema que isto resolve: até a Onda 159 a prova só podia ser reconferida
 * *dentro* do VISÃO. Um perito, um juiz ou a outra parte não têm — e não devem
 * precisar ter — conta no sistema. Prova que só o dono consegue conferir vale
 * pouco justamente contra o dono.
 *
 * O dossiê é um arquivo JSON autocontido que qualquer terceiro consegue
 * reconferir com SHA-256 e as regras publicadas dentro do próprio arquivo.
 *
 * TRÊS DECISÕES QUE NÃO PODEM SER REVERTIDAS:
 *
 * D1. O que está selado e o que não está fica **fisicamente separado**.
 *     `sealed` é o manifesto byte-a-byte como o servidor o selou. `unsealed`
 *     guarda o ato de emissão (quem baixou, quando). Se a emissão entrasse no
 *     manifesto, o `rootHash` mudaria a cada download e nenhuma cópia bateria
 *     com outra — duas cópias do mesmo material precisam ter o mesmo selo.
 *
 * D2. O dossiê é **evidente a adulteração, não à prova de falsificação**.
 *     A semente da corrente é pública e não há assinatura assimétrica: quem
 *     tem o formato pode fabricar um dossiê inteiro coerente do zero. O que o
 *     hash prova é que *este* arquivo não foi editado depois de emitido e que
 *     ele bate com o selo guardado no sistema de origem. Isso é dito em
 *     português dentro do arquivo (`disclosure`). Omitir seria induzir a erro.
 *
 * D3. A conferência recalcula **também o veredito**, não só a corrente.
 *     Um falsificador cuidadoso reconstrói o manifesto inteiro com
 *     `assessment.level = 'admissible'` e uma corrente coerente. A corrente
 *     bateria. Por isso reavaliamos o conteúdo com a mesma regra da Onda 156:
 *     se o veredito declarado não é o que o conteúdo produz, o dossiê é
 *     denunciado como incoerente — que é diferente de adulterado.
 */

import {
  CUSTODY_GENESIS,
  assessCustody,
  describeVerdict,
  sha256Hex,
  verifyManifest,
  type ChainVerification,
  type CustodyManifest,
  type CustodyVerdictLevel,
  type HashFn,
} from './custodyManifest';

/* ========================================================================== */
/*  Formato                                                                   */
/* ========================================================================== */

export const DOSSIER_FORMAT = 'visao.custody.dossier';
export const DOSSIER_VERSION = 1;
export const DOSSIER_ALGORITHM = 'SHA-256';

/** Fatos do ato de emissão. Vêm do servidor — nunca do formulário do usuário. */
export interface DossierIssuance {
  /** Relógio do servidor no momento da emissão. */
  readonly issuedAtUtc: string;
  /** Identidade autenticada de quem emitiu. */
  readonly issuedBy: string;
  /** Origem declarada (host/versão) — pista, não prova. */
  readonly sourceSystem: string;
}

export interface CustodyDossier {
  readonly format: typeof DOSSIER_FORMAT;
  readonly version: typeof DOSSIER_VERSION;
  readonly algorithm: typeof DOSSIER_ALGORITHM;
  readonly genesis: string;
  /** Manifesto selado, verbatim. Nada aqui pode ser reescrito na emissão. */
  readonly sealed: CustodyManifest;
  /** Fora do selo, e rotulado como tal. */
  readonly unsealed: DossierIssuance;
  readonly howToVerify: readonly string[];
  readonly disclosure: string;
}

export const DOSSIER_DISCLOSURE =
  'Este arquivo é evidente a adulteração, não à prova de falsificação: o hash ' +
  'demonstra que o conteúdo não foi editado após a emissão e permite comparar ' +
  'esta cópia com o selo guardado no sistema de origem. Ele não prova, sozinho, ' +
  'que o sistema de origem é autêntico. O bloco "unsealed" registra o ato de ' +
  'emissão e NÃO está coberto pelo selo.';

const HOW_TO_VERIFY: readonly string[] = Object.freeze([
  '1. Para cada trecho em sealed.segments, monte o objeto canônico com as chaves ' +
    'em ordem alfabética e serialização JSON determinística.',
  '2. Encadeie: elo[i] = SHA-256(elo[i-1] + "\\n" + canônico(trecho[i])), com ' +
    'elo[-1] = o valor do campo "genesis". Compare com sealed.chain.',
  '3. O campo sealed.rootHash é o SHA-256 do corpo canônico do manifesto ' +
    '(conteúdo + corrente), sem o próprio rootHash.',
  '4. Qualquer divergência no primeiro elo aponta o trecho alterado; os elos ' +
    'seguintes divergem por consequência aritmética, não por adulteração própria.',
]);

/* ========================================================================== */
/*  Emissão                                                                   */
/* ========================================================================== */

export type DossierBuildErrorCode = 'missing_manifest' | 'missing_issuer' | 'invalid_issued_at';

export class DossierBuildError extends Error {
  readonly code: DossierBuildErrorCode;
  constructor(code: DossierBuildErrorCode, message: string) {
    super(message);
    this.name = 'DossierBuildError';
    this.code = code;
  }
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Empacota o manifesto. Recusa emitir sem autoria ou sem relógio: um dossiê
 * anônimo transfere para o destinatário o ônus de descobrir a procedência.
 */
export function buildDossier(manifest: CustodyManifest, issuance: DossierIssuance): CustodyDossier {
  if (!manifest || typeof manifest !== 'object' || !isNonEmpty(manifest.rootHash)) {
    throw new DossierBuildError('missing_manifest', 'Manifesto ausente ou sem selo.');
  }
  if (!isNonEmpty(issuance.issuedBy)) {
    throw new DossierBuildError('missing_issuer', 'Emissão sem autor identificado.');
  }
  if (!isNonEmpty(issuance.issuedAtUtc) || !Number.isFinite(Date.parse(issuance.issuedAtUtc))) {
    throw new DossierBuildError('invalid_issued_at', 'Relógio de emissão ilegível.');
  }

  return {
    format: DOSSIER_FORMAT,
    version: DOSSIER_VERSION,
    algorithm: DOSSIER_ALGORITHM,
    genesis: CUSTODY_GENESIS,
    sealed: manifest,
    unsealed: {
      issuedAtUtc: issuance.issuedAtUtc,
      issuedBy: issuance.issuedBy,
      sourceSystem: isNonEmpty(issuance.sourceSystem) ? issuance.sourceSystem : 'desconhecido',
    },
    howToVerify: HOW_TO_VERIFY,
    disclosure: DOSSIER_DISCLOSURE,
  };
}

/**
 * Serializa legível. A indentação é irrelevante para o selo — de propósito: o
 * `rootHash` cobre a canonicalização do conteúdo, não os bytes do arquivo.
 * Assim o destinatário pode abrir, indentar e reindentar sem "quebrar a prova".
 */
export function serializeDossier(dossier: CustodyDossier): string {
  return `${JSON.stringify(dossier, null, 2)}\n`;
}

const UNSAFE_FILENAME = /[^a-zA-Z0-9._-]+/g;

/** Nome de arquivo estável e previsível: mesmo material ⇒ mesmo nome. */
export function dossierFileName(dossier: CustodyDossier): string {
  const id = dossier.sealed.exportId.replace(UNSAFE_FILENAME, '-').slice(0, 60) || 'sem-id';
  const root = dossier.sealed.rootHash.slice(0, 12);
  return `visao-custodia_${id}_${root}.json`;
}

/* ========================================================================== */
/*  Recebimento (conferência offline por terceiro)                            */
/* ========================================================================== */

export type DossierParseErrorCode =
  | 'invalid_json'
  | 'not_a_dossier'
  | 'unsupported_version'
  | 'unsupported_algorithm'
  | 'foreign_genesis'
  | 'malformed_manifest';

export type DossierParseResult =
  | { readonly ok: true; readonly dossier: CustodyDossier }
  | { readonly ok: false; readonly code: DossierParseErrorCode; readonly message: string };

const PARSE_MESSAGE: Record<DossierParseErrorCode, string> = {
  invalid_json: 'O arquivo não é um JSON válido.',
  not_a_dossier: 'O arquivo não é um dossiê de custódia do VISÃO.',
  unsupported_version: 'Versão de dossiê não reconhecida por esta ferramenta.',
  unsupported_algorithm: 'Algoritmo de hash não reconhecido por esta ferramenta.',
  foreign_genesis: 'A semente da corrente não é a do VISÃO — o arquivo veio de outro sistema.',
  malformed_manifest: 'O manifesto interno está incompleto ou corrompido.',
};

function fail(code: DossierParseErrorCode): DossierParseResult {
  return { ok: false, code, message: PARSE_MESSAGE[code] };
}

function looksLikeManifest(value: unknown): value is CustodyManifest {
  const m = value as Partial<CustodyManifest> | null;
  return (
    !!m &&
    typeof m === 'object' &&
    m.version === 1 &&
    typeof m.exportId === 'string' &&
    typeof m.rootHash === 'string' &&
    Array.isArray(m.segments) &&
    Array.isArray(m.chain) &&
    Array.isArray(m.transformations) &&
    !!m.assessment &&
    typeof m.assessment === 'object' &&
    Array.isArray(m.assessment.reasons) &&
    Array.isArray(m.assessment.gaps)
  );
}

/**
 * Lê um arquivo recebido. Distingue "não é nosso formato" de "é nosso e está
 * corrompido": acusar adulteração de um arquivo que nunca foi um dossiê seria
 * uma falsa acusação.
 */
export function parseDossier(text: string): DossierParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return fail('invalid_json');
  }

  const d = raw as Partial<CustodyDossier> | null;
  if (!d || typeof d !== 'object' || d.format !== DOSSIER_FORMAT) return fail('not_a_dossier');
  if (d.version !== DOSSIER_VERSION) return fail('unsupported_version');
  if (d.algorithm !== DOSSIER_ALGORITHM) return fail('unsupported_algorithm');
  if (d.genesis !== CUSTODY_GENESIS) return fail('foreign_genesis');
  if (!looksLikeManifest(d.sealed)) return fail('malformed_manifest');

  const unsealed = (d.unsealed ?? {}) as Partial<DossierIssuance>;

  return {
    ok: true,
    dossier: {
      format: DOSSIER_FORMAT,
      version: DOSSIER_VERSION,
      algorithm: DOSSIER_ALGORITHM,
      genesis: CUSTODY_GENESIS,
      sealed: d.sealed,
      unsealed: {
        issuedAtUtc: isNonEmpty(unsealed.issuedAtUtc) ? unsealed.issuedAtUtc : '',
        issuedBy: isNonEmpty(unsealed.issuedBy) ? unsealed.issuedBy : '',
        sourceSystem: isNonEmpty(unsealed.sourceSystem) ? unsealed.sourceSystem : 'desconhecido',
      },
      howToVerify: Array.isArray(d.howToVerify) ? d.howToVerify : HOW_TO_VERIFY,
      disclosure: isNonEmpty(d.disclosure) ? d.disclosure : DOSSIER_DISCLOSURE,
    },
  };
}

/* ========================================================================== */
/*  Veredito da conferência                                                   */
/* ========================================================================== */

export type DossierIntegrity = 'intact' | 'inconsistent_verdict' | 'tampered';

export type DossierTone = 'positive' | 'warning' | 'critical';

export interface DossierVerification {
  readonly integrity: DossierIntegrity;
  readonly tone: DossierTone;
  readonly headline: string;
  readonly detail: string;
  readonly chain: ChainVerification;
  /** Veredito escrito no arquivo. */
  readonly declaredLevel: CustodyVerdictLevel;
  /** Veredito que o conteúdo do arquivo produz hoje, pela regra da Onda 156. */
  readonly recomputedLevel: CustodyVerdictLevel;
  readonly rootHash: string;
  readonly disclosure: string;
}

/**
 * Reconfere o arquivo isoladamente. Não toca na rede: o valor desta função é
 * exatamente poder rodar offline, na máquina de quem recebeu.
 */
export async function verifyDossier(
  dossier: CustodyDossier,
  hashFn: HashFn = sha256Hex
): Promise<DossierVerification> {
  const manifest = dossier.sealed;
  const chain = await verifyManifest(manifest, hashFn);

  const recomputed = assessCustody({
    exportId: manifest.exportId,
    cameraId: manifest.cameraId,
    requestedBy: manifest.requestedBy,
    requestedFromUtc: manifest.requestedFromUtc,
    requestedToUtc: manifest.requestedToUtc,
    segments: manifest.segments,
    transformations: manifest.transformations,
    pixelsAltered: manifest.pixelsAltered,
    generatedAtUtc: manifest.generatedAtUtc,
    systemVersion: manifest.systemVersion,
  });

  const declaredLevel = manifest.assessment.level;
  const recomputedLevel = recomputed.level;

  // Precedência: adulteração é o fato mais grave e mais específico. Só quando
  // a corrente está de pé faz sentido discutir se o veredito escrito confere.
  if (!chain.intact) {
    const where =
      chain.firstBrokenIndex === null
        ? 'O selo do manifesto (rootHash) não corresponde ao conteúdo.'
        : `O trecho de índice ${chain.firstBrokenIndex} não corresponde ao elo registrado.`;
    return {
      integrity: 'tampered',
      tone: 'critical',
      headline: 'Arquivo adulterado após a emissão',
      detail: `${where} Preserve o arquivo original e registre o incidente.`,
      chain,
      declaredLevel,
      recomputedLevel,
      rootHash: manifest.rootHash,
      disclosure: dossier.disclosure,
    };
  }

  if (declaredLevel !== recomputedLevel) {
    return {
      integrity: 'inconsistent_verdict',
      tone: 'warning',
      headline: 'Corrente íntegra, mas o veredito declarado não confere',
      detail:
        `O arquivo declara "${describeVerdict(declaredLevel)}" e o conteúdo sustenta ` +
        `"${describeVerdict(recomputedLevel)}". A corrente está de pé, então isto não é ` +
        'edição posterior: ou o arquivo foi fabricado, ou foi emitido por uma versão ' +
        'diferente da regra de avaliação.',
      chain,
      declaredLevel,
      recomputedLevel,
      rootHash: manifest.rootHash,
      disclosure: dossier.disclosure,
    };
  }

  return {
    integrity: 'intact',
    tone: 'positive',
    headline: 'Corrente íntegra e veredito coerente',
    detail:
      `Todos os ${manifest.segments.length} trecho(s) conferem com a corrente e o selo ` +
      `reproduz o conteúdo. Qualidade probatória: ${describeVerdict(recomputedLevel)}.`,
    chain,
    declaredLevel,
    recomputedLevel,
    rootHash: manifest.rootHash,
    disclosure: dossier.disclosure,
  };
}
