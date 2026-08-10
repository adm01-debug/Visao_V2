// Wave 40 — Política de retenção de clips por câmera/objeto (paridade Frigate `record.retain.days`).
// Função pura + tipos. Sem I/O, sem estado. Testável 100%.
// Consumida pela UI de câmeras (edição) e pelo job de limpeza (a definir server-side em onda futura).

export type ObjectClass = 'person' | 'vehicle' | 'plate' | 'face' | 'ppe' | 'other';

export interface RetentionPolicy {
  /** Retenção padrão em dias (aplica quando nenhuma regra específica bate). */
  defaultDays: number;
  /** Overrides por classe de objeto. Chave = ObjectClass, valor = dias. */
  perObject?: Partial<Record<ObjectClass, number>>;
  /** Sempre reter eventos marcados como críticos (bypassa expiração). */
  keepCritical?: boolean;
}

export interface ClipMetadata {
  createdAt: string | Date;
  objectClass?: ObjectClass;
  critical?: boolean;
}

export const DEFAULT_POLICY: RetentionPolicy = {
  defaultDays: 30,
  perObject: { plate: 90, face: 60, person: 30, vehicle: 30, ppe: 30, other: 14 },
  keepCritical: true,
};

/** Resolve quantos dias reter um clip, aplicando override por objeto quando presente. */
export function resolveRetentionDays(policy: RetentionPolicy, objectClass?: ObjectClass): number {
  if (
    objectClass &&
    policy.perObject?.[objectClass] !== null &&
    policy.perObject?.[objectClass] !== undefined
  ) {
    return Math.max(0, policy.perObject[objectClass]!);
  }
  return Math.max(0, policy.defaultDays);
}

/** Calcula o timestamp de expiração de um clip conforme a política. */
export function computeExpiryDate(clip: ClipMetadata, policy: RetentionPolicy): Date | null {
  if (clip.critical && policy.keepCritical) return null; // nunca expira
  const days = resolveRetentionDays(policy, clip.objectClass);
  if (days === 0) return null; // 0 = manter indefinidamente por configuração explícita
  const created = clip.createdAt instanceof Date ? clip.createdAt : new Date(clip.createdAt);
  return new Date(created.getTime() + days * 86_400_000);
}

/** Retorna true se o clip já ultrapassou a retenção conforme `now`. */
export function isClipExpired(
  clip: ClipMetadata,
  policy: RetentionPolicy,
  now: Date = new Date()
): boolean {
  const expiry = computeExpiryDate(clip, policy);
  if (!expiry) return false;
  return now.getTime() >= expiry.getTime();
}

/** Valida uma política (dias >= 0, inteiros). Retorna array de erros vazio se ok. */
export function validatePolicy(policy: RetentionPolicy): string[] {
  const errs: string[] = [];
  if (!Number.isInteger(policy.defaultDays) || policy.defaultDays < 0) {
    errs.push('defaultDays deve ser inteiro >= 0');
  }
  if (policy.perObject) {
    for (const [k, v] of Object.entries(policy.perObject)) {
      if (v !== null && v !== undefined && (!Number.isInteger(v) || v < 0))
        errs.push(`perObject.${k} deve ser inteiro >= 0`);
    }
  }
  return errs;
}
