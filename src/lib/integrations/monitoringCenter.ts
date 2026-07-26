/**
 * Onda 126 — Conectores para centrais de monitoramento (Sigma, Moni, Commbox).
 *
 * Fonte da verdade em TypeScript das MESMAS regras aplicadas no banco por
 * `public.monitoring_center_policy()`, `public.contact_id_for_event()` e pela
 * escada de reentrega de `public.settle_monitoring_center_dispatch()`.
 * A paridade literal é verificada no CI por `scripts/check-monitoring-centers.mjs`.
 *
 * Por que duplicar: a UI precisa mostrar "qual código será enviado à central" e
 * "quando será a próxima tentativa" sem ida ao servidor, e o simulador precisa
 * decidir offline. Duplicação sem gate é divergência garantida; com gate, é cache.
 *
 * Protocolo: SIA DC-09 transportando payload Ademco Contact ID ("ADM-CID"),
 * que é o denominador comum aceito por Sigma Cloud, Moni e Commbox.
 */

/** Provedores de central suportados. */
export const MONITORING_PROVIDERS = ['sigma', 'moni', 'commbox', 'sia_dc09'] as const;
export type MonitoringProvider = (typeof MONITORING_PROVIDERS)[number];

/** Política de despacho — espelho de `public.monitoring_center_policy()`. */
export const MONITORING_CENTER_POLICY = {
  /** Tentativas totais antes de declarar o evento como não entregue. */
  maxAttempts: 5,
  /** Primeiro recuo, em segundos. Dobra a cada falha. */
  baseBackoffSeconds: 15,
  /** Teto do recuo: acima disso a central está fora, não congestionada. */
  maxBackoffSeconds: 600,
  /** Duração da locação de um despacho reclamado por um worker. */
  leaseSeconds: 60,
  /**
   * Janela de deduplicação: o mesmo evento lógico repetido dentro dela é
   * absorvido (a central não deve receber a mesma invasão 40x por minuto).
   */
  dedupeWindowSeconds: 120,
  /** Prazo final absoluto: evento velho é ruído operacional, não alarme. */
  deadlineSeconds: 3600,
  /** Teste periódico obrigatório (DC-09 exige supervisão de linha). */
  heartbeatSeconds: 900,
} as const;

/** Qualificador Contact ID: evento novo (E=1) ou restauro (R=3). */
export type ContactIdQualifier = 'E' | 'R';

export interface ContactIdMapping {
  /** Código Ademco de 3 dígitos. */
  readonly code: string;
  readonly qualifier: ContactIdQualifier;
  /** Prioridade de fila: 1 é o mais urgente. */
  readonly priority: number;
}

/**
 * Mapa evento interno → Contact ID. Espelho de `public.contact_id_for_event()`.
 * Os códigos seguem a tabela Ademco padrão para que qualquer receptora
 * (Sigma/Moni/Commbox) interprete sem tradução proprietária.
 */
export const CONTACT_ID_MAP = {
  panic: { code: '120', qualifier: 'E', priority: 1 },
  duress: { code: '121', qualifier: 'E', priority: 1 },
  fire: { code: '110', qualifier: 'E', priority: 1 },
  intrusion: { code: '130', qualifier: 'E', priority: 2 },
  perimeter: { code: '131', qualifier: 'E', priority: 2 },
  tamper: { code: '137', qualifier: 'E', priority: 2 },
  blacklist_plate: { code: '150', qualifier: 'E', priority: 2 },
  loitering: { code: '150', qualifier: 'E', priority: 3 },
  camera_offline: { code: '380', qualifier: 'E', priority: 4 },
  camera_online: { code: '380', qualifier: 'R', priority: 5 },
  agent_offline: { code: '350', qualifier: 'E', priority: 4 },
  agent_online: { code: '350', qualifier: 'R', priority: 5 },
  storage_failure: { code: '300', qualifier: 'E', priority: 4 },
  arm: { code: '401', qualifier: 'R', priority: 6 },
  disarm: { code: '401', qualifier: 'E', priority: 6 },
  heartbeat: { code: '602', qualifier: 'E', priority: 9 },
} as const satisfies Record<string, ContactIdMapping>;

export type MonitoringEventKind = keyof typeof CONTACT_ID_MAP;

export const MONITORING_EVENT_KINDS = Object.keys(CONTACT_ID_MAP) as MonitoringEventKind[];

/** Retorna o mapeamento Contact ID, ou `null` para evento desconhecido. */
export function contactIdForEvent(kind: string): ContactIdMapping | null {
  return (CONTACT_ID_MAP as Record<string, ContactIdMapping>)[kind] ?? null;
}

/**
 * Recuo exponencial determinístico, idêntico ao do banco.
 * `attempts` é o número de tentativas JÁ consumidas (>= 1 quando falhou uma vez).
 */
export function backoffSeconds(attempts: number): number {
  const n = Math.max(1, Math.floor(attempts));
  const raw = MONITORING_CENTER_POLICY.baseBackoffSeconds * 2 ** (n - 1);
  return Math.min(raw, MONITORING_CENTER_POLICY.maxBackoffSeconds);
}

export type DispatchStatus = 'pending' | 'claimed' | 'delivered' | 'failed' | 'expired';

export interface DispatchState {
  readonly status: DispatchStatus;
  /** Tentativas já consumidas antes desta decisão. */
  readonly attempts: number;
  /** Epoch ms de criação do evento. */
  readonly createdAt: number;
}

export interface SettleOutcome {
  readonly status: DispatchStatus;
  readonly attempts: number;
  /** Epoch ms da próxima tentativa; `null` quando terminal. */
  readonly nextAttemptAt: number | null;
  readonly reason: 'delivered' | 'retry' | 'attempts_exhausted' | 'deadline_exceeded' | 'terminal';
}

/**
 * Decide o destino de um despacho após uma tentativa. Espelho exato de
 * `public.settle_monitoring_center_dispatch()`.
 *
 * Ordem das guardas importa: prazo final vence tentativas restantes, porque
 * entregar um alarme de invasão 70 minutos atrasado é pior que não entregar —
 * a central despacharia viatura para um fato já encerrado.
 */
export function settleDispatch(state: DispatchState, ok: boolean, now: number): SettleOutcome {
  if (state.status === 'delivered' || state.status === 'expired' || state.status === 'failed') {
    return { status: state.status, attempts: state.attempts, nextAttemptAt: null, reason: 'terminal' };
  }
  const attempts = state.attempts + 1;
  if (ok) {
    return { status: 'delivered', attempts, nextAttemptAt: null, reason: 'delivered' };
  }
  const ageSeconds = (now - state.createdAt) / 1000;
  if (ageSeconds >= MONITORING_CENTER_POLICY.deadlineSeconds) {
    return { status: 'expired', attempts, nextAttemptAt: null, reason: 'deadline_exceeded' };
  }
  if (attempts >= MONITORING_CENTER_POLICY.maxAttempts) {
    return { status: 'failed', attempts, nextAttemptAt: null, reason: 'attempts_exhausted' };
  }
  return {
    status: 'pending',
    attempts,
    nextAttemptAt: now + backoffSeconds(attempts) * 1000,
    reason: 'retry',
  };
}

/**
 * Chave de deduplicação: mesmo destino + mesmo código + mesma zona dentro da
 * janela é o MESMO fato. Inclui o qualificador para que o restauro (R) nunca
 * seja absorvido pelo evento (E) correspondente.
 */
export function dedupeKey(input: {
  accountId: string;
  code: string;
  qualifier: ContactIdQualifier;
  zoneCode: string;
  bucketAt: number;
}): string {
  const bucket = Math.floor(input.bucketAt / (MONITORING_CENTER_POLICY.dedupeWindowSeconds * 1000));
  return `${input.accountId}|${input.code}|${input.qualifier}|${input.zoneCode}|${bucket}`;
}

/** Normaliza um número para N dígitos decimais, truncando pela direita. */
function pad(value: number | string, width: number): string {
  const digits = String(value).replace(/\D/g, '');
  return digits.padStart(width, '0').slice(-width);
}

export interface ContactIdFrameInput {
  /** Conta na receptora (4 a 6 dígitos hex, conforme DC-09). */
  readonly accountCode: string;
  readonly code: string;
  readonly qualifier: ContactIdQualifier;
  /** Partição/área (00 = sistema). */
  readonly partitionCode: string;
  /** Zona ou usuário (000 = não aplicável). */
  readonly zoneCode: string;
  /** Número sequencial da mensagem, 1..9999. */
  readonly sequence: number;
  readonly receiverNumber: string;
  readonly linePrefix: string;
  /** Instante do evento em UTC. */
  readonly at: Date;
}

/** CRC-16/ARC — o polinômio exigido pelo SIA DC-09 (ANSI/SIA DC-09-2013). */
export function crc16Arc(input: string): number {
  let crc = 0;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) & 0xff;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
  }
  return crc & 0xffff;
}

/**
 * Monta o quadro SIA DC-09 com payload Contact ID.
 * Formato: LF CRC LLLL "ADM-CID" seq Rrcvr Lpref #acct [payload] _timestamp CR
 */
export function formatContactIdFrame(input: ContactIdFrameInput): string {
  const acct = input.accountCode.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6) || '0000';
  const q = input.qualifier === 'R' ? '3' : '1';
  const payload =
    `[#${acct}|${q}${pad(input.code, 3)} ${pad(input.partitionCode, 2)} ${pad(input.zoneCode, 3)}]`;
  const stamp = `_${input.at.toISOString().slice(11, 19)},${input.at.toISOString().slice(0, 10).replace(/-/g, '-')}`;
  const body =
    `"ADM-CID"${pad(input.sequence, 4)}R${pad(input.receiverNumber, 6)}` +
    `L${pad(input.linePrefix, 6)}#${acct}${payload}${stamp}`;
  const crc = crc16Arc(body).toString(16).toUpperCase().padStart(4, '0');
  const len = body.length.toString(16).toUpperCase().padStart(4, '0');
  return `\n${crc}${len}${body}\r`;
}

/** Valida um código de conta conforme DC-09 (4 a 6 dígitos hexadecimais). */
export function isValidAccountCode(code: string): boolean {
  return /^[0-9A-Fa-f]{4,6}$/.test(code.trim());
}
