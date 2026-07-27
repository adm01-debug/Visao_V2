/**
 * Onda 154 — Extratores SOAP das portas de I/O do equipamento ONVIF.
 *
 * Separado do `index.ts` de propósito: parsing de XML de fabricante é a parte
 * que mais varia entre marcas e a que mais precisa de teste. Aqui não há rede,
 * só texto entra e estrutura sai — o que permite fixar respostas reais de
 * Intelbras, Hikvision e XiongMai como casos de regressão.
 *
 * Duas fontes ONVIF, e elas não concordam entre si:
 *
 *  - `tds:GetRelayOutputs` (Device service, ONVIF Core) — universal, devolve
 *    token, modo (`Monostable`/`Bistable`), estado de repouso e tempo de
 *    retardo em formato de duração ISO-8601 (`PT2S`).
 *  - `tmd:GetDigitalInputs` (DeviceIO service) — mais novo e opcional; muitos
 *    equipamentos populares no Brasil não o implementam. Ausência dele NÃO é
 *    erro: significa "sem entradas declaradas", nunca "câmera com defeito".
 *
 * Regra que atravessa o módulo: **nunca inventar porta**. Um token vazio ou
 * duplicado é descartado, porque uma porta fantasma na UI vira um operador
 * clicando num botão que não aciona nada — e desconfiando do sistema inteiro.
 */

export type DiscoveredDirection = 'input' | 'output';

export interface DiscoveredIoPort {
  direction: DiscoveredDirection;
  portToken: string;
  /** `monostable` quando o equipamento não declara — é o comportamento seguro. */
  outputMode: 'monostable' | 'bistable';
  /** Estado de repouso do contato. */
  idleState: 'open' | 'closed';
  /** Retardo declarado pelo equipamento, em ms; `null` quando ausente. */
  delayMs: number | null;
}

/**
 * Converte duração ISO-8601 curta (`PT0.5S`, `PT2S`, `PT1M30S`) em ms.
 * Retorna `null` para qualquer coisa que não seja reconhecida com certeza —
 * chutar o tempo de um relé é pior que não saber.
 */
export function parseIsoDurationMs(value: string | null | undefined): number | null {
  if (typeof value !== 'string') return null;
  const m = /^PT(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value.trim());
  if (!m || (!m[1] && !m[2])) return null;
  const minutes = m[1] ? Number(m[1]) : 0;
  const seconds = m[2] ? Number(m[2]) : 0;
  const ms = Math.round((minutes * 60 + seconds) * 1000);
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

function dedupeByToken(ports: DiscoveredIoPort[]): DiscoveredIoPort[] {
  const seen = new Set<string>();
  const out: DiscoveredIoPort[] = [];
  for (const port of ports) {
    const token = port.portToken.trim();
    if (token === '' || seen.has(token)) continue;
    seen.add(token);
    out.push({ ...port, portToken: token });
  }
  return out;
}

/** Extrai as saídas a relé de uma resposta `GetRelayOutputsResponse`. */
export function extractRelayOutputs(xml: string): DiscoveredIoPort[] {
  const out: DiscoveredIoPort[] = [];
  // O prefixo de namespace varia (tds:, tt:, sem prefixo). Casamos pelo nome local.
  const re = /<(?:\w+:)?RelayOutputs[^>]*token="([^"]*)"[^>]*>([\s\S]*?)<\/(?:\w+:)?RelayOutputs>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const token = m[1];
    const body = m[2];
    const mode = /<(?:\w+:)?Mode>\s*Bistable\s*<\//i.test(body) ? 'bistable' : 'monostable';
    const idle = /<(?:\w+:)?IdleState>\s*closed\s*<\//i.test(body) ? 'closed' : 'open';
    const delay = /<(?:\w+:)?DelayTime>([^<]+)<\//i.exec(body)?.[1] ?? null;
    out.push({
      direction: 'output',
      portToken: token,
      outputMode: mode,
      idleState: idle,
      delayMs: parseIsoDurationMs(delay),
    });
  }
  return dedupeByToken(out);
}

/** Extrai as entradas digitais de uma resposta `GetDigitalInputsResponse`. */
export function extractDigitalInputs(xml: string): DiscoveredIoPort[] {
  const out: DiscoveredIoPort[] = [];
  const re = /<(?:\w+:)?DigitalInputs[^>]*token="([^"]*)"[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    out.push({
      direction: 'input',
      portToken: m[1],
      outputMode: 'monostable',
      idleState: 'open',
      delayMs: null,
    });
  }
  return dedupeByToken(out);
}

/**
 * Estado das entradas (`GetDigitalInputConfigurationOptions` não serve; o
 * estado vem por evento ou por `GetRelayOutputState`). Aqui tratamos apenas o
 * estado de saída, que é o que o equipamento devolve de forma síncrona.
 */
export function extractRelayState(xml: string): 'active' | 'inactive' | 'unknown' {
  if (/<(?:\w+:)?LogicalState>\s*active\s*<\//i.test(xml)) return 'active';
  if (/<(?:\w+:)?LogicalState>\s*inactive\s*<\//i.test(xml)) return 'inactive';
  return 'unknown';
}
