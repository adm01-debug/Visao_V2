/**
 * Onda 190 — Conexão por Registro (device enrollment).
 *
 * Paridade com a "Conexão por Registro" do SIM Next: o gravador/agente em campo,
 * atrás de NAT, é quem procura o servidor. Como não há IP fixo para confiar, a
 * única prova de identidade é um **segredo de registro** — e um segredo que
 * vive para sempre é um segredo perdido.
 *
 * Esta é a **regra única** do livro de registros. É pura: não fala com banco,
 * não calcula hash, não gera aleatoriedade. Ela apenas **julga**.
 *
 * Invariantes (as que não podem ser violadas):
 *  1. **Segredo nunca é comparado aqui em claro.** A função recebe o hash já
 *     calculado pelo chamador (servidor) e compara hash com hash.
 *  2. **Revogação é terminal e vence tudo** — inclusive janela de graça,
 *     inclusive segredo correto, inclusive relógio favorável.
 *  3. **Expiração é pelo relógio declarado**, não por status. Registro `active`
 *     com prazo vencido é recusado.
 *  4. **Rotação tem graça curta e única.** Após rotacionar, a versão anterior
 *     ainda é aceita por `ROTATION_GRACE_MS` para o dispositivo em campo pegar
 *     a nova — e só a **imediatamente** anterior, nunca a antepenúltima.
 *  5. **Relógio anômalo nunca aceita.** Se o instante do julgamento é anterior
 *     à emissão do segredo vigente, o veredito é indeterminado (recusa), jamais
 *     aceitação "porque ainda não venceu".
 *  6. **Recusa não vaza existência.** Dispositivo inexistente e segredo errado
 *     produzem a mesma resposta pública (`denied`); o motivo detalhado é
 *     interno, para a trilha de auditoria.
 *  7. **Só aceitação é prova de vida.** Tentativa recusada nunca move
 *     `lastSeenAt` — senão um atacante manteria um dispositivo morto "vivo".
 */

/** Janela em que o segredo anterior ainda é aceito após uma rotação. */
export const ROTATION_GRACE_MS = 5 * 60_000;

/** Prazo padrão de um código de inscrição ainda não resgatado. */
export const ENROLLMENT_TTL_MS = 24 * 60 * 60_000;

/** Tamanho exigido do código de registro apresentado pelo dispositivo. */
export const DEVICE_CODE_LENGTH = 12;

export type DeviceStatus = 'pending' | 'active' | 'revoked';

export interface DeviceRegistration {
  deviceCode: string;
  status: DeviceStatus;
  /** Hash do segredo vigente. Nunca o segredo. */
  secretHash: string;
  secretVersion: number;
  /** Instante em que o segredo vigente passou a valer. */
  secretIssuedAt: number;
  /** Hash do segredo imediatamente anterior (graça de rotação), se houver. */
  previousSecretHash: string | null;
  /** Instante da rotação que aposentou `previousSecretHash`. */
  rotatedAt: number | null;
  /** Prazo absoluto do vínculo; `null` = sem prazo. */
  expiresAt: number | null;
  lastSeenAt: number | null;
}

/** Veredito público — o que volta para o dispositivo. */
export type AuthOutcome = 'accepted' | 'denied';

/** Motivo interno — o que vai para a trilha, nunca para o dispositivo. */
export type AuthReason =
  | 'ok_current'
  | 'ok_grace'
  | 'unknown_device'
  | 'malformed_code'
  | 'revoked'
  | 'expired'
  | 'not_activated'
  | 'grace_window_closed'
  | 'bad_secret'
  | 'clock_anomaly';

export interface AuthVerdict {
  outcome: AuthOutcome;
  reason: AuthReason;
  /** Versão do segredo efetivamente usada (só quando aceito). */
  usedVersion: number | null;
  /** Verdadeiro quando o dispositivo autenticou com o segredo já aposentado. */
  usedGrace: boolean;
  /** Registro após o julgamento (só aceitação move `lastSeenAt`, invariante 7). */
  registration: DeviceRegistration | null;
}

export interface AuthAttempt {
  deviceCode: string;
  /** Hash do segredo apresentado, calculado pelo servidor. */
  presentedHash: string;
  now: number;
}

const deny = (
  reason: AuthReason,
  registration: DeviceRegistration | null = null,
): AuthVerdict => ({
  outcome: 'denied',
  reason,
  usedVersion: null,
  usedGrace: false,
  registration,
});

/** Um código de registro bem formado: apenas maiúsculas/dígitos, tamanho fixo. */
export function isWellFormedCode(code: unknown): code is string {
  return typeof code === 'string' && new RegExp(`^[A-Z0-9]{${DEVICE_CODE_LENGTH}}$`).test(code);
}

/**
 * Julga uma tentativa de conexão por registro.
 *
 * A ordem das recusas é deliberada: o que é terminal (revogação) vem antes do
 * que é temporal (prazo), e ambos vêm antes da conferência do segredo — um
 * dispositivo revogado não deve nem chegar a descobrir se acertou o segredo.
 */
export function authenticateDevice(
  registration: DeviceRegistration | null,
  attempt: AuthAttempt,
): AuthVerdict {
  if (!isWellFormedCode(attempt.deviceCode)) return deny('malformed_code');
  if (registration === null) return deny('unknown_device');

  // Invariante 2 — revogação vence tudo.
  if (registration.status === 'revoked') return deny('revoked', registration);

  // Invariante 3 — prazo é do relógio, não do status.
  if (registration.expiresAt !== null && attempt.now >= registration.expiresAt) {
    return deny('expired', registration);
  }

  if (registration.status !== 'active') return deny('not_activated', registration);

  // Invariante 5 — relógio antes da emissão é anomalia, nunca licença.
  if (attempt.now < registration.secretIssuedAt) return deny('clock_anomaly', registration);

  const accept = (version: number, usedGrace: boolean, reason: AuthReason): AuthVerdict => ({
    outcome: 'accepted',
    reason,
    usedVersion: version,
    usedGrace,
    // Invariante 7 — só aceitação move a prova de vida, e nunca para trás.
    registration: {
      ...registration,
      lastSeenAt: Math.max(registration.lastSeenAt ?? attempt.now, attempt.now),
    },
  });

  if (constantShapeEquals(attempt.presentedHash, registration.secretHash)) {
    return accept(registration.secretVersion, false, 'ok_current');
  }

  // Invariante 4 — graça curta, única e sempre da versão imediatamente anterior.
  if (
    registration.previousSecretHash !== null &&
    registration.rotatedAt !== null &&
    constantShapeEquals(attempt.presentedHash, registration.previousSecretHash)
  ) {
    const withinGrace = attempt.now - registration.rotatedAt <= ROTATION_GRACE_MS;
    if (!withinGrace) return deny('grace_window_closed', registration);
    return accept(registration.secretVersion - 1, true, 'ok_grace');
  }

  return deny('bad_secret', registration);
}

/**
 * Comparação de hashes hexadecimais já derivados.
 *
 * Não é uma comparação criptográfica de segredo (isso acontece no servidor,
 * sobre o digest); aqui apenas garantimos igualdade estrita sem coerção.
 */
function constantShapeEquals(a: string, b: string): boolean {
  return typeof a === 'string' && typeof b === 'string' && a.length === b.length && a === b;
}

export interface RotationInput {
  registration: DeviceRegistration;
  /** Hash do novo segredo, derivado pelo servidor. */
  nextSecretHash: string;
  now: number;
}

export type RotationOutcome =
  | { ok: true; registration: DeviceRegistration }
  | { ok: false; reason: 'revoked' | 'same_secret' | 'clock_anomaly' };

/**
 * Rotaciona o segredo de um dispositivo.
 *
 * Rotacionar é um ato de governança, não um efeito colateral: um dispositivo
 * revogado NUNCA volta a ter segredo válido por rotação (isso seria uma
 * ressurreição silenciosa), e reemitir o mesmo hash é recusado, porque daria a
 * falsa sensação de que o segredo antigo deixou de valer.
 */
export function rotateSecret(input: RotationInput): RotationOutcome {
  const { registration, nextSecretHash, now } = input;
  if (registration.status === 'revoked') return { ok: false, reason: 'revoked' };
  if (nextSecretHash === registration.secretHash) return { ok: false, reason: 'same_secret' };
  if (now < registration.secretIssuedAt) return { ok: false, reason: 'clock_anomaly' };

  return {
    ok: true,
    registration: {
      ...registration,
      previousSecretHash: registration.secretHash,
      rotatedAt: now,
      secretHash: nextSecretHash,
      secretVersion: registration.secretVersion + 1,
      secretIssuedAt: now,
      status: 'active',
    },
  };
}

/**
 * Revoga um dispositivo. Terminal e idempotente: revogar de novo é inerte, e a
 * graça de rotação é apagada junto — um segredo aposentado não pode sobreviver
 * ao vínculo que o autorizava.
 */
export function revokeDevice(registration: DeviceRegistration): DeviceRegistration {
  if (registration.status === 'revoked') return registration;
  return {
    ...registration,
    status: 'revoked',
    previousSecretHash: null,
    rotatedAt: null,
  };
}

/** Idade do último contato, com clamp em 0 (relógio para trás não inventa futuro). */
export function silenceMs(registration: DeviceRegistration, now: number): number | null {
  if (registration.lastSeenAt === null) return null;
  return Math.max(0, now - registration.lastSeenAt);
}
