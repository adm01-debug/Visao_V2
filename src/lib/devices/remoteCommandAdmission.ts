/**
 * Onda 193 — Admissão de comando remoto ao equipamento (menu OSD / manutenção).
 *
 * As Ondas 190–192 deram ao equipamento em campo **identidade** (registro),
 * **porta** (`device-connect`) e **diagnóstico de presença** (silêncio). A
 * lacuna que sobra do SIM Next é a mão inversa: **o operador mandar algo para
 * o equipamento** — abrir o menu OSD, sincronizar relógio, reiniciar.
 *
 * Este arquivo é a **regra única** que decide se um comando pode sequer entrar
 * na fila. É pura: não fala com banco, não conhece transporte, não escreve
 * trilha. Ela responde uma pergunta e só uma: *este pedido, agora, com este
 * equipamento neste estado, é admissível?*
 *
 * O erro caro deste tipo de fila é **aceitar tudo e deixar o transporte
 * descobrir**. Um comando aceito é uma promessa ao operador; promessa que o
 * equipamento nunca poderá cumprir é pior que uma recusa imediata, porque o
 * operador vai embora achando que resolveu. Daí as decisões abaixo:
 *
 *  1. **Registro morto nunca enfileira.** Revogado ou vencido não vai executar
 *     nada, nem hoje nem amanhã: a recusa é terminal, não adiamento. Enfileirar
 *     "para quando voltar" seria mentir sobre um retorno que não existe.
 *  2. **Silêncio adia; recusa de credencial não.** Um equipamento calado pode
 *     voltar — comando idempotente espera. Um equipamento que *chega e é
 *     recusado* (`rejected_presence`) tem rede e não tem credencial: a fila só
 *     acumularia lixo até expirar. Recusa na hora, com o motivo certo.
 *  3. **Efeito físico exige prova de vida recente.** Reiniciar um gravador que
 *     não se apresenta há duas horas é agir às cegas: pode chegar junto com o
 *     técnico que já está no local. Comando de efeito só entra com presença
 *     saudável; adiar reinício é o mesmo que agendar um susto.
 *  4. **Todo comando morre.** Pedido sem prazo válido é recusado. Comando eterno
 *     ressuscita semanas depois, contra um estado que ninguém mais reconhece.
 *  5. **Repetição não é duplicação.** A mesma chave de idempotência dentro da
 *     janela devolve o veredito original — nunca um segundo comando. Dedo
 *     nervoso no botão não pode virar três reinícios.
 *  6. **Um comando exclusivo por vez.** Enquanto houver comando de efeito em
 *     voo e não expirado, outro é recusado por concorrência: dois "reiniciar"
 *     empilhados é uma forma barata de derrubar a frota.
 *  7. **Desconhecido é desconhecido.** Comando fora do catálogo é recusado sem
 *     eco do que foi pedido — a recusa não pode virar oráculo de capacidades.
 *  8. **Permissão é checada aqui e de novo no servidor.** Esta régua é espelho
 *     da autorização, não substituta dela.
 */

import type { Capability } from '@/lib/permissions/capabilities';
import type { DeviceSilenceState } from '@/lib/devices/deviceSilence';

/** Catálogo fechado de comandos remotos. Nada fora daqui é admissível. */
export const REMOTE_COMMANDS = [
  'osd.open',
  'osd.apply',
  'clock.sync',
  'config.read',
  'stream.restart',
  'device.reboot',
] as const;

export type RemoteCommandKind = (typeof REMOTE_COMMANDS)[number];

const COMMAND_SET = new Set<string>(REMOTE_COMMANDS);

/**
 * Comandos que alteram o estado do equipamento de forma perceptível em campo.
 * Só entram com presença saudável — nunca adiados (ver decisão 3).
 */
const EFFECTFUL: ReadonlySet<RemoteCommandKind> = new Set([
  'osd.apply',
  'stream.restart',
  'device.reboot',
]);

/**
 * Comandos que exigem exclusividade: enquanto um estiver em voo, outro do mesmo
 * equipamento é recusado por concorrência.
 */
const EXCLUSIVE: ReadonlySet<RemoteCommandKind> = new Set(['device.reboot', 'stream.restart']);

/** Permissão mínima exigida por comando. */
export const COMMAND_CAPABILITY: Readonly<Record<RemoteCommandKind, Capability>> = {
  'osd.open': 'cameras.view',
  'osd.apply': 'cameras.manage',
  'clock.sync': 'cameras.manage',
  'config.read': 'cameras.view',
  'stream.restart': 'cameras.manage',
  'device.reboot': 'cameras.manage',
};

/** Rótulos em português para a tela. */
export const COMMAND_LABEL: Readonly<Record<RemoteCommandKind, string>> = {
  'osd.open': 'Abrir menu do equipamento',
  'osd.apply': 'Aplicar configuração do menu',
  'clock.sync': 'Sincronizar relógio',
  'config.read': 'Ler configuração',
  'stream.restart': 'Reiniciar transmissão',
  'device.reboot': 'Reiniciar equipamento',
};

/** Prazo máximo de vida de um comando na fila. */
export const MAX_TTL_MINUTES = 30;

/** Prazo mínimo: abaixo disso o comando expira antes de qualquer entrega. */
export const MIN_TTL_MINUTES = 1;

/** Janela em que a mesma chave de idempotência devolve o veredito original. */
export const IDEMPOTENCY_WINDOW_MINUTES = 10;

/**
 * Presença considerada saudável o bastante para comando de efeito.
 * `rotation_grace` entra: a ausência ali é curta e declarada pelo operador.
 */
const HEALTHY_PRESENCE: ReadonlySet<DeviceSilenceState> = new Set<DeviceSilenceState>([
  'ok',
  'rotation_grace',
]);

/** Estados em que o silêncio é intencional — nada será executado. */
const TERMINAL_PRESENCE: ReadonlySet<DeviceSilenceState> = new Set<DeviceSilenceState>([
  'expected_silence',
  'enrollment_lapsed',
]);

export type AdmissionDecision = 'admit' | 'defer' | 'reject' | 'replay';

export type AdmissionReason =
  /** Aceito para entrega imediata. */
  | 'admitted'
  /** Aceito, mas aguarda o equipamento voltar a se apresentar. */
  | 'awaiting_presence'
  /** Mesma chave de idempotência dentro da janela: veredito original devolvido. */
  | 'duplicate_request'
  /** Comando fora do catálogo. */
  | 'unknown_command'
  /** Registro revogado ou vencido: nada será executado. */
  | 'registration_inactive'
  /** Equipamento chega e é recusado: credencial, não rede. */
  | 'credential_rejected'
  /** Registro emitido e nunca resgatado. */
  | 'never_enrolled'
  /** Comando de efeito sem prova de vida recente. */
  | 'presence_required'
  /** Relógio do equipamento inconsistente: efeito seria cego. */
  | 'clock_unreliable'
  /** Prazo ausente, curto demais ou longo demais. */
  | 'invalid_ttl'
  /** Operador sem a permissão exigida. */
  | 'capability_missing'
  /** Já existe comando exclusivo em voo. */
  | 'conflicting_command'
  /** Instante do pedido ilegível. */
  | 'invalid_request';

export interface InFlightCommand {
  readonly kind: RemoteCommandKind;
  /** Momento em que o comando em voo expira. */
  readonly expiresAt: number;
}

export interface PriorAdmission {
  readonly decision: AdmissionDecision;
  readonly reason: AdmissionReason;
  readonly decidedAt: number;
}

export interface AdmissionRequest {
  readonly command: string;
  readonly registrationStatus: 'pending' | 'active' | 'revoked';
  readonly presence: DeviceSilenceState;
  readonly capabilities: ReadonlySet<Capability> | readonly Capability[];
  readonly ttlMinutes: number;
  /** Comando exclusivo já em voo para o mesmo equipamento, se houver. */
  readonly inFlight?: InFlightCommand | null;
  /** Veredito anterior da mesma chave de idempotência, se houver. */
  readonly prior?: PriorAdmission | null;
}

export interface AdmissionVerdict {
  readonly decision: AdmissionDecision;
  readonly reason: AdmissionReason;
  /** Explicação em português, pronta para a tela. */
  readonly message: string;
  /** Instante em que o comando admitido/adiado deixa de valer. */
  readonly expiresAt: number | null;
  /** `true` quando a recusa jamais mudará para este registro. */
  readonly terminal: boolean;
}

const MESSAGE: Readonly<Record<AdmissionReason, string>> = {
  admitted: 'Comando aceito e enviado para entrega.',
  awaiting_presence: 'Comando na fila: aguardando o equipamento se apresentar.',
  duplicate_request: 'Pedido repetido dentro da janela — nenhum comando novo foi criado.',
  unknown_command: 'Comando não reconhecido.',
  registration_inactive:
    'O registro deste equipamento está revogado ou vencido: nenhum comando será executado.',
  credential_rejected:
    'O equipamento está se conectando e sendo recusado. Corrija o segredo de registro antes de enviar comandos.',
  never_enrolled: 'Este registro nunca foi resgatado por um equipamento.',
  presence_required:
    'Comando com efeito no equipamento exige prova de vida recente. Aguarde ele voltar a se apresentar.',
  clock_unreliable:
    'O relógio informado pelo equipamento está inconsistente. Sincronize o relógio antes de enviar comandos com efeito.',
  invalid_ttl: `Prazo inválido: informe entre ${MIN_TTL_MINUTES} e ${MAX_TTL_MINUTES} minutos.`,
  capability_missing: 'Seu perfil não tem permissão para este comando.',
  conflicting_command: 'Já existe um comando exclusivo em andamento para este equipamento.',
  invalid_request: 'Pedido inválido.',
};

const verdict = (
  decision: AdmissionDecision,
  reason: AdmissionReason,
  expiresAt: number | null,
  terminal = false,
): AdmissionVerdict => ({ decision, reason, message: MESSAGE[reason], expiresAt, terminal });

const hasCapability = (
  caps: AdmissionRequest['capabilities'],
  needed: Capability,
): boolean =>
  caps instanceof Set
    ? caps.has(needed)
    : Array.from(caps as readonly Capability[]).includes(needed);

/** `true` quando o comando altera o estado percebido em campo. */
export const isEffectful = (kind: RemoteCommandKind): boolean => EFFECTFUL.has(kind);

/** `true` quando o comando não admite outro em paralelo. */
export const isExclusive = (kind: RemoteCommandKind): boolean => EXCLUSIVE.has(kind);

/**
 * Onda 193 — regra única de admissão de comando remoto.
 *
 * A ordem das guardas é deliberada e não pode ser reorganizada por estética:
 * o que é terminal precisa ser respondido antes do que é temporário, senão o
 * operador recebe "aguarde" para um equipamento que nunca voltará.
 */
export function admitRemoteCommand(
  request: AdmissionRequest,
  now: number,
): AdmissionVerdict {
  if (!Number.isFinite(now)) return verdict('reject', 'invalid_request', null, false);

  // 0. Replay antes de tudo: repetir o pedido nunca cria efeito novo, mesmo
  //    que o estado do mundo tenha mudado no meio da janela.
  const prior = request.prior ?? null;
  if (
    prior !== null &&
    Number.isFinite(prior.decidedAt) &&
    now - prior.decidedAt >= 0 &&
    now - prior.decidedAt <= IDEMPOTENCY_WINDOW_MINUTES * 60_000
  ) {
    return {
      decision: 'replay',
      reason: prior.reason,
      message: `${MESSAGE.duplicate_request} ${MESSAGE[prior.reason]}`,
      expiresAt: null,
      terminal: prior.decision === 'reject' && isTerminalReason(prior.reason),
    };
  }

  // 1. Catálogo fechado — sem eco do que foi pedido.
  if (!COMMAND_SET.has(request.command)) {
    return verdict('reject', 'unknown_command', null, true);
  }
  const kind = request.command as RemoteCommandKind;

  // 2. Permissão. Vem antes do estado do equipamento de propósito: quem não
  //    pode mandar não deve nem descobrir se o equipamento está calado.
  if (!hasCapability(request.capabilities, COMMAND_CAPABILITY[kind])) {
    return verdict('reject', 'capability_missing', null, false);
  }

  // 3. Prazo. Comando sem morte declarada não entra.
  const ttl = request.ttlMinutes;
  if (
    !Number.isFinite(ttl) ||
    !Number.isInteger(ttl) ||
    ttl < MIN_TTL_MINUTES ||
    ttl > MAX_TTL_MINUTES
  ) {
    return verdict('reject', 'invalid_ttl', null, false);
  }
  const expiresAt = now + ttl * 60_000;

  // 4. Registro morto: recusa terminal, jamais adiamento.
  if (request.registrationStatus === 'revoked') {
    return verdict('reject', 'registration_inactive', null, true);
  }
  if (TERMINAL_PRESENCE.has(request.presence)) {
    return verdict(
      'reject',
      request.presence === 'enrollment_lapsed' ? 'never_enrolled' : 'registration_inactive',
      null,
      true,
    );
  }

  // 5. Chega e é recusado: problema é credencial. Enfileirar só acumularia lixo.
  if (request.presence === 'rejected_presence') {
    return verdict('reject', 'credential_rejected', null, false);
  }

  // 6. Nunca visto, ainda dentro do prazo de resgate: pode chegar, então adia
  //    o que é inócuo e recusa o que teria efeito.
  if (request.presence === 'awaiting_first_contact') {
    return EFFECTFUL.has(kind)
      ? verdict('reject', 'presence_required', null, false)
      : verdict('defer', 'awaiting_presence', expiresAt);
  }

  // 7. Relógio inconsistente: comando de efeito seria cego; leitura é inofensiva.
  if (request.presence === 'clock_anomaly') {
    return EFFECTFUL.has(kind)
      ? verdict('reject', 'clock_unreliable', null, false)
      : verdict('defer', 'awaiting_presence', expiresAt);
  }

  // 8. Exclusividade: só depois de saber que o comando é viável.
  const inFlight = request.inFlight ?? null;
  if (
    inFlight !== null &&
    Number.isFinite(inFlight.expiresAt) &&
    inFlight.expiresAt > now &&
    (EXCLUSIVE.has(kind) || EXCLUSIVE.has(inFlight.kind))
  ) {
    return verdict('reject', 'conflicting_command', null, false);
  }

  // 9. Presença. Efeito exige prova de vida; leitura pode esperar.
  if (!HEALTHY_PRESENCE.has(request.presence)) {
    return EFFECTFUL.has(kind)
      ? verdict('reject', 'presence_required', null, false)
      : verdict('defer', 'awaiting_presence', expiresAt);
  }

  return verdict('admit', 'admitted', expiresAt);
}

/** Recusas que jamais mudarão de veredito para o mesmo registro. */
export function isTerminalReason(reason: AdmissionReason): boolean {
  return (
    reason === 'unknown_command' ||
    reason === 'registration_inactive' ||
    reason === 'never_enrolled'
  );
}
