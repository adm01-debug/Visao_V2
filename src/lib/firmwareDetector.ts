/**
 * VISÃO — Detector de marca/modelo por conteúdo de firmware.
 *
 * Estratégia:
 *   1. Varre o buffer buscando strings (ASCII + UTF-16LE) definidas nas
 *      assinaturas em `firmwareFingerprints.ts`.
 *   2. Confere magic bytes opcionais no offset indicado.
 *   3. Cruza com evidências ONVIF (Manufacturer/Model/HardwareId) via
 *      `onvifProfiles.ts`.
 *   4. Retorna `FirmwareMatch[]` com score determinístico (0..1), ordenado.
 *
 * 100% client/edge-safe. Sem I/O, sem dependências externas.
 */
import { FIRMWARE_SIGNATURES, type FirmwareSignature } from './firmwareFingerprints';
import {
  resolveProfileByHardwareId,
  resolveProfileByManufacturer,
  getProfileById,
  type OnvifProfile,
} from './onvifProfiles';
import type { RtspBrand } from './rtspTemplates';

export type FirmwareEvidenceKind = 'magic' | 'string' | 'onvif';

export interface FirmwareEvidence {
  kind: FirmwareEvidenceKind;
  /** Descrição legível (mostrada no card). */
  value: string;
  /** Peso agregado ao score (0..1). */
  weight: number;
  /** Offset onde foi encontrada, quando aplicável. */
  offset?: number;
}

export interface FirmwareMatch {
  brandId: RtspBrand;
  profileId?: string;
  displayName: string;
  modelHints: string[];
  templates: string[];
  defaultPorts: { rtsp: number; onvif: number; http: number };
  /** 0..1. */
  score: number;
  evidence: FirmwareEvidence[];
  notes?: string;
}

export interface OnvifProbe {
  manufacturer?: string | null;
  model?: string | null;
  hardwareId?: string | null;
  firmwareVersion?: string | null;
}

// ---------- Utilitários internos ----------

/** Extrai string ASCII do buffer (bytes imprimíveis 0x20..0x7E ou \t/\n/\r). */
function extractAscii(bytes: Uint8Array): string {
  // Chunks de até 128KB para não estourar a stack em Array.from.
  const CHUNK = 128 * 1024;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    let s = '';
    for (let j = 0; j < slice.length; j++) {
      const b = slice[j] ?? 0;
      s += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '\n';
    }
    parts.push(s);
  }
  return parts.join('');
}

/** Extrai texto UTF-16LE do buffer (útil para firmwares Windows-derived). */
function extractUtf16Le(bytes: Uint8Array): string {
  // Percorre bytes pareados; substitui não-imprimíveis por \n para não colar.
  let s = '';
  const limit = bytes.length - 1;
  for (let i = 0; i < limit; i += 2) {
    const lo = bytes[i] ?? 0;
    const hi = bytes[i + 1] ?? 0;
    const code = lo | (hi << 8);
    s += code >= 0x20 && code <= 0x7e ? String.fromCharCode(code) : '\n';
  }
  return s;
}

function bytesStartWith(buf: Uint8Array, offset: number, pattern: readonly number[]): boolean {
  if (offset + pattern.length > buf.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (buf[offset + i] !== pattern[i]) return false;
  }
  return true;
}

function indexOfCaseInsensitive(haystack: string, needle: string): number {
  return haystack.toLowerCase().indexOf(needle.toLowerCase());
}

// ---------- Detecção principal ----------

const STRONG_STRING_WEIGHT = 0.35;
const WEAK_STRING_WEIGHT = 0.1;
const MAGIC_WEIGHT = 0.4;
const ONVIF_STRONG_WEIGHT = 0.5;

/**
 * Roda todas as assinaturas contra o buffer e retorna matches ordenados
 * por score (descendente). Buffers grandes são pré-processados uma única vez
 * em ASCII + UTF-16LE.
 */
export function detectFromBuffer(bytes: Uint8Array): FirmwareMatch[] {
  if (!bytes || bytes.length === 0) return [];
  const ascii = extractAscii(bytes);
  const utf16 = extractUtf16Le(bytes);
  const asciiLower = ascii.toLowerCase();
  const utf16Lower = utf16.toLowerCase();

  const matches: FirmwareMatch[] = [];
  for (const sig of FIRMWARE_SIGNATURES) {
    const evidence: FirmwareEvidence[] = [];
    let score = 0;

    // Magic bytes
    if (sig.magicBytes) {
      for (const magic of sig.magicBytes) {
        const off = magic.offset ?? 0;
        if (bytesStartWith(bytes, off, magic.bytes)) {
          score += MAGIC_WEIGHT;
          evidence.push({
            kind: 'magic',
            value: `magic bytes em 0x${off.toString(16)}`,
            weight: MAGIC_WEIGHT,
            offset: off,
          });
        }
      }
    }

    // Strings fortes
    for (const s of sig.strongStrings) {
      const needle = s.toLowerCase();
      let idx = asciiLower.indexOf(needle);
      if (idx < 0) idx = utf16Lower.indexOf(needle);
      if (idx >= 0) {
        score += STRONG_STRING_WEIGHT;
        evidence.push({
          kind: 'string',
          value: `string "${s}"`,
          weight: STRONG_STRING_WEIGHT,
          offset: idx >= 0 ? idx : undefined,
        });
      }
    }

    // Strings fracas
    if (sig.weakStrings) {
      for (const s of sig.weakStrings) {
        if (
          indexOfCaseInsensitive(asciiLower, s) >= 0 ||
          indexOfCaseInsensitive(utf16Lower, s) >= 0
        ) {
          score += WEAK_STRING_WEIGHT;
          evidence.push({
            kind: 'string',
            value: `string "${s}"`,
            weight: WEAK_STRING_WEIGHT,
          });
        }
      }
    }

    if (score > 0) {
      matches.push(buildMatch(sig, Math.min(1, score), evidence));
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches;
}

/**
 * Cruza uma sonda ONVIF (Manufacturer/Model/HardwareId) com as assinaturas.
 * Peso maior por ser sinal direto do dispositivo.
 */
export function detectFromOnvifProbe(probe: OnvifProbe): FirmwareMatch[] {
  const matches: FirmwareMatch[] = [];
  const profile: OnvifProfile | null =
    resolveProfileByHardwareId(probe.hardwareId ?? probe.model ?? null) ??
    resolveProfileByManufacturer(probe.manufacturer ?? null, probe.model ?? null);

  if (profile) {
    // Mapeia perfil → assinatura (por profileId ou por brand da variante recomendada).
    const preferredVariant =
      profile.rtspVariants.find((v) => v.recommended) ?? profile.rtspVariants[0];
    const brand = preferredVariant?.brand;
    const sig =
      FIRMWARE_SIGNATURES.find((s) => s.profileId === profile.id) ??
      FIRMWARE_SIGNATURES.find((s) => s.brandId === brand);
    if (sig) {
      const evidence: FirmwareEvidence[] = [];
      if (probe.manufacturer) {
        evidence.push({
          kind: 'onvif',
          value: `Manufacturer=${probe.manufacturer}`,
          weight: ONVIF_STRONG_WEIGHT,
        });
      }
      if (probe.model) {
        evidence.push({
          kind: 'onvif',
          value: `Model=${probe.model}`,
          weight: ONVIF_STRONG_WEIGHT,
        });
      }
      if (probe.hardwareId) {
        evidence.push({
          kind: 'onvif',
          value: `HardwareId=${probe.hardwareId}`,
          weight: ONVIF_STRONG_WEIGHT,
        });
      }
      const score = Math.min(1, evidence.length * ONVIF_STRONG_WEIGHT || ONVIF_STRONG_WEIGHT);
      matches.push(buildMatch(sig, score, evidence, profile.id));
    }
  }

  // Fallback textual: se manufacturer contém marca conhecida.
  const mfr = (probe.manufacturer ?? '').toLowerCase();
  if (matches.length === 0 && mfr) {
    for (const sig of FIRMWARE_SIGNATURES) {
      if (sig.strongStrings.some((s) => mfr.includes(s.toLowerCase()))) {
        matches.push(
          buildMatch(sig, ONVIF_STRONG_WEIGHT, [
            {
              kind: 'onvif',
              value: `Manufacturer contém "${sig.brandId}"`,
              weight: ONVIF_STRONG_WEIGHT,
            },
          ])
        );
        break;
      }
    }
  }

  return matches;
}

/**
 * Combina matches de firmware e ONVIF em um único ranking. Evidências do
 * mesmo `brandId` são somadas (com teto 1.0). Ordenado por score desc.
 */
export function mergeMatches(...groups: FirmwareMatch[][]): FirmwareMatch[] {
  const byBrand = new Map<string, FirmwareMatch>();
  for (const group of groups) {
    for (const m of group) {
      const key = `${m.brandId}:${m.profileId ?? ''}`;
      const existing = byBrand.get(key);
      if (!existing) {
        byBrand.set(key, { ...m, evidence: [...m.evidence] });
      } else {
        existing.score = Math.min(1, existing.score + m.score);
        existing.evidence = [...existing.evidence, ...m.evidence];
        // Preserva profileId se algum lado tiver.
        if (!existing.profileId && m.profileId) existing.profileId = m.profileId;
      }
    }
  }
  return Array.from(byBrand.values()).sort((a, b) => b.score - a.score);
}

function buildMatch(
  sig: FirmwareSignature,
  score: number,
  evidence: FirmwareEvidence[],
  overrideProfileId?: string
): FirmwareMatch {
  const profileId = overrideProfileId ?? sig.profileId;
  const notes = profileId ? (getProfileById(profileId)?.notes ?? sig.notes) : sig.notes;
  return {
    brandId: sig.brandId,
    profileId,
    displayName: sig.displayName,
    modelHints: [...sig.modelHints],
    templates: [...sig.templateIds],
    defaultPorts: { ...sig.defaultPorts },
    score,
    evidence,
    notes,
  };
}
