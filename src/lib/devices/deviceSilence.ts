/**
 * Onda 192 — Fan-in de silêncio de dispositivo no barramento de manutenção.
 *
 * As Ondas 190/191 deram identidade ao equipamento em campo e uma porta blindada
 * para ele se apresentar. Falta a pergunta que o operador realmente faz:
 * **"e quando ele para de aparecer?"**
 *
 * Esta é a **regra única** do diagnóstico de presença. É pura: não fala com
 * banco, não conhece cron, não escreve alerta. Ela olha o retrato de um
 * registro e diz **o que está acontecendo** e **quão grave é**.
 *
 * O erro clássico — e caro — deste tipo de vigia é tratar todo silêncio como
 * "equipamento caiu". Silêncio tem causas muito diferentes, e confundi-las
 * manda o técnico para o lugar errado:
 *
 *  1. **Silêncio que nós mesmos causamos nunca é incidente.** Registro revogado
 *     ou com prazo vencido *deve* ficar quieto. Alertar aqui é ruído garantido,
 *     e ruído garantido é como um painel morre.
 *  2. **Nunca visto ≠ sumido.** Um código recém-emitido e ainda não resgatado
 *     está *aguardando instalação*, não offline. Só vira aviso quando o prazo
 *     de resgate passa sem ninguém aparecer — e aí o assunto é "instalação não
 *     concluída", não "queda".
 *  3. **Chegar e ser recusado é o oposto de sumir.** Se a trilha mostra
 *     tentativa recente negada, o equipamento tem rede, energia e rota: o que
 *     falta é credencial. Esse caso **vence** o silêncio e recebe diagnóstico
 *     próprio — mandar alguém checar cabo seria desperdício.
 *  4. **Rotação compra carência.** Logo após trocar o segredo, uma ausência
 *     curta é esperada (o equipamento ainda vai buscar o novo). Gritar dentro
 *     da carência é acusar o próprio operador pelo ato que ele acabou de fazer.
 *  5. **Relógio para trás nunca vira gravidade.** Prova de vida no futuro é
 *     anomalia de relógio, tratada como tal — nunca convertida em silêncio
 *     negativo, nem em "tudo bem" silencioso.
 *  6. **Gravidade é função do estado observado, não do histórico.** Quem decide
 *     repetir aviso é o barramento (cooldown); aqui só se classifica.
 */

/** Cadência esperada de apresentação do equipamento em campo. */
export const HEARTBEAT_MINUTES = 15;

/** Múltiplo da cadência a partir do qual a ausência vira aviso. */
export const WARN_FACTOR = 3;

/** Múltiplo da cadência a partir do qual a ausência vira incidente. */
export const CRITICAL_FACTOR = 8;

/** Carência concedida após uma rotação de segredo, além da cadência. */
export const ROTATION_GRACE_MINUTES = 10;

/** Janela em que uma recusa recente domina o diagnóstico. */
export const DENIAL_WINDOW_MINUTES = 60;

/** Tolerância de relógio adiantado antes de chamar de anomalia. */
export const CLOCK_SKEW_TOLERANCE_MINUTES = 2;

export type DeviceSilenceState =
  /** Apresentou-se dentro da cadência esperada. */
  | 'ok'
  /** Silêncio esperado: revogado ou com prazo vencido. Nunca alerta. */
  | 'expected_silence'
  /** Código emitido, ainda dentro do prazo de resgate, nunca usado. */
  | 'awaiting_first_contact'
  /** Prazo de resgate passou sem o equipamento nunca aparecer. */
  | 'enrollment_lapsed'
  /** Está chegando, mas sendo recusado: problema é credencial, não rede. */
  | 'rejected_presence'
  /** Ausência curta logo após rotação — carência declarada. */
  | 'rotation_grace'
  /** Ausência acima da cadência tolerada. */
  | 'silent_warn'
  /** Ausência prolongada. */
  | 'silent_critical'
  /** Prova de vida no futuro: relógio, não presença. */
  | 'clock_anomaly';

export type DeviceSilenceSeverity = 'warning' | 'critical';

export interface DeviceSilenceSnapshot {
  registrationId: string;
  deviceCode: string;
  label: string;
  status: 'pending' | 'active' | 'revoked';
  /** Instante da última autenticação **aceita**. `null` = nunca se apresentou. */
  lastSeenAt: number | null;
  /** Instante da última tentativa **recusada**, se houver. */
  lastDeniedAt: number | null;
  /** Prazo absoluto do vínculo; `null` = sem prazo. */
  expiresAt: number | null;
  /** Instante da última rotação de segredo. */
  rotatedAt: number | null;
  createdAt: number;
}

export interface DeviceSilenceVerdict {
  registrationId: string;
  deviceCode: string;
  state: DeviceSilenceState;
  /** `null` quando o estado não deve virar alerta. */
  severity: DeviceSilenceSeverity | null;
  /** Minutos de ausência observados; `null` quando não se aplica. */
  silenceMinutes: number | null;
  /** Chave estável no barramento de manutenção. */
  routineKey: string;
  reason: string;
}

const MINUTE = 60_000;

const minutesBetween = (from: number, to: number): number => (to - from) / MINUTE;

const round = (value: number): number => Math.round(value);

/**
 * Julga um único registro. Determinístico e sem efeitos: mesmo retrato e mesmo
 * relógio produzem sempre o mesmo veredito.
 */
export function classifyDeviceSilence(
  snapshot: DeviceSilenceSnapshot,
  now: number,
): DeviceSilenceVerdict {
  const routineKey = `device:${snapshot.deviceCode}`;
  const base = { registrationId: snapshot.registrationId, deviceCode: snapshot.deviceCode, routineKey };

  // (1) Silêncio que nós mesmos causamos. Vem antes de tudo: um registro
  // revogado pode ter recusa recente e ausência longa, e nenhuma das duas
  // coisas é problema — é o efeito pretendido da revogação.
  if (snapshot.status === 'revoked') {
    return {
      ...base,
      state: 'expected_silence',
      severity: null,
      silenceMinutes: null,
      reason: 'registro revogado: ausência é o efeito pretendido',
    };
  }
  if (snapshot.expiresAt !== null && snapshot.expiresAt <= now && snapshot.lastSeenAt !== null) {
    return {
      ...base,
      state: 'expected_silence',
      severity: null,
      silenceMinutes: null,
      reason: 'vínculo com prazo vencido: ausência é o efeito pretendido',
    };
  }

  // (5) Relógio antes de qualquer aritmética de ausência: sem isto, prova de
  // vida no futuro viraria silêncio negativo e depois "ok" por acidente.
  if (snapshot.lastSeenAt !== null && snapshot.lastSeenAt > now + CLOCK_SKEW_TOLERANCE_MINUTES * MINUTE) {
    return {
      ...base,
      state: 'clock_anomaly',
      severity: 'warning',
      silenceMinutes: null,
      reason: `prova de vida ${round(minutesBetween(now, snapshot.lastSeenAt))} min no futuro: relógio do equipamento ou do servidor está errado`,
    };
  }

  // (3) Recusa recente vence silêncio: quem é recusado está chegando.
  const deniedRecently =
    snapshot.lastDeniedAt !== null &&
    snapshot.lastDeniedAt <= now + CLOCK_SKEW_TOLERANCE_MINUTES * MINUTE &&
    minutesBetween(snapshot.lastDeniedAt, now) <= DENIAL_WINDOW_MINUTES;
  const deniedAfterLastSuccess =
    snapshot.lastDeniedAt !== null &&
    (snapshot.lastSeenAt === null || snapshot.lastDeniedAt > snapshot.lastSeenAt);

  if (deniedRecently && deniedAfterLastSuccess) {
    return {
      ...base,
      state: 'rejected_presence',
      severity: 'critical',
      silenceMinutes: snapshot.lastSeenAt === null ? null : Math.max(0, round(minutesBetween(snapshot.lastSeenAt, now))),
      reason:
        'equipamento está se apresentando e sendo recusado: verifique o segredo de registro, não a rede',
    };
  }

  // (2) Nunca visto ≠ sumido.
  if (snapshot.lastSeenAt === null) {
    const lapsed = snapshot.expiresAt !== null && snapshot.expiresAt <= now;
    if (!lapsed) {
      return {
        ...base,
        state: 'awaiting_first_contact',
        severity: null,
        silenceMinutes: null,
        reason: 'código emitido, aguardando a primeira conexão do equipamento',
      };
    }
    return {
      ...base,
      state: 'enrollment_lapsed',
      severity: 'warning',
      silenceMinutes: null,
      reason: `código de registro expirou sem nunca ser usado (emitido há ${round(
        Math.max(0, minutesBetween(snapshot.createdAt, now)),
      )} min): instalação não foi concluída`,
    };
  }

  const silenceMinutes = Math.max(0, minutesBetween(snapshot.lastSeenAt, now));

  // (4) Rotação compra carência — mas só se a rotação for mais recente que a
  // última prova de vida; rotação antiga não desculpa ausência de hoje.
  if (
    snapshot.rotatedAt !== null &&
    snapshot.rotatedAt >= snapshot.lastSeenAt &&
    minutesBetween(snapshot.rotatedAt, now) <= HEARTBEAT_MINUTES + ROTATION_GRACE_MINUTES
  ) {
    return {
      ...base,
      state: 'rotation_grace',
      severity: null,
      silenceMinutes: round(silenceMinutes),
      reason: 'segredo rotacionado há pouco: carência para o equipamento buscar a nova credencial',
    };
  }

  if (silenceMinutes >= CRITICAL_FACTOR * HEARTBEAT_MINUTES) {
    return {
      ...base,
      state: 'silent_critical',
      severity: 'critical',
      silenceMinutes: round(silenceMinutes),
      reason: `equipamento não se apresenta há ${round(silenceMinutes)} min (cadência esperada de ${HEARTBEAT_MINUTES} min)`,
    };
  }

  if (silenceMinutes >= WARN_FACTOR * HEARTBEAT_MINUTES) {
    return {
      ...base,
      state: 'silent_warn',
      severity: 'warning',
      silenceMinutes: round(silenceMinutes),
      reason: `equipamento atrasado: sem apresentação há ${round(silenceMinutes)} min (cadência esperada de ${HEARTBEAT_MINUTES} min)`,
    };
  }

  return {
    ...base,
    state: 'ok',
    severity: null,
    silenceMinutes: round(silenceMinutes),
    reason: 'apresentando-se dentro da cadência',
  };
}

/** Ordem de gravidade para painéis: pior primeiro, depois maior ausência. */
const STATE_WEIGHT: Record<DeviceSilenceState, number> = {
  rejected_presence: 0,
  silent_critical: 1,
  silent_warn: 2,
  clock_anomaly: 3,
  enrollment_lapsed: 4,
  rotation_grace: 5,
  awaiting_first_contact: 6,
  ok: 7,
  expected_silence: 8,
};

export function compareDeviceSilence(a: DeviceSilenceVerdict, b: DeviceSilenceVerdict): number {
  const byState = STATE_WEIGHT[a.state] - STATE_WEIGHT[b.state];
  if (byState !== 0) return byState;
  const bySilence = (b.silenceMinutes ?? -1) - (a.silenceMinutes ?? -1);
  if (bySilence !== 0) return bySilence;
  return a.deviceCode.localeCompare(b.deviceCode);
}

export interface DeviceSilenceSummary {
  total: number;
  ok: number;
  actionable: number;
  critical: number;
  warning: number;
  quiet: number;
  worst: DeviceSilenceVerdict | null;
}

/** Resumo para o painel. `quiet` = silêncio esperado ou aguardado, nunca alerta. */
export function summarizeDeviceSilence(verdicts: readonly DeviceSilenceVerdict[]): DeviceSilenceSummary {
  const sorted = [...verdicts].sort(compareDeviceSilence);
  let ok = 0;
  let critical = 0;
  let warning = 0;
  let quiet = 0;
  for (const v of sorted) {
    if (v.state === 'ok') ok += 1;
    else if (v.severity === 'critical') critical += 1;
    else if (v.severity === 'warning') warning += 1;
    else quiet += 1;
  }
  return {
    total: sorted.length,
    ok,
    actionable: critical + warning,
    critical,
    warning,
    quiet,
    worst: sorted.length > 0 && sorted[0].severity !== null ? sorted[0] : null,
  };
}
