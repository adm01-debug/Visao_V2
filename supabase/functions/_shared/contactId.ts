// VISÃO — Onda 126: codificação SIA DC-09 / Ademco Contact ID para o edge runtime.
//
// Cópia deliberada de `src/lib/integrations/monitoringCenter.ts` (o edge runtime
// não compartilha o bundler do front). A identidade literal das funções
// `crc16Arc` e `formatContactIdFrame` é verificada por
// `scripts/check-monitoring-centers.mjs` — divergir quebra o CI.

export type ContactIdQualifier = 'E' | 'R';

export interface ContactIdFrameInput {
  readonly accountCode: string;
  readonly code: string;
  readonly qualifier: ContactIdQualifier;
  readonly partitionCode: string;
  readonly zoneCode: string;
  readonly sequence: number;
  readonly receiverNumber: string;
  readonly linePrefix: string;
  readonly at: Date;
}

function pad(value: number | string, width: number): string {
  const digits = String(value).replace(/\D/g, '');
  return digits.padStart(width, '0').slice(-width);
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

/** Monta o quadro SIA DC-09 com payload Contact ID. */
export function formatContactIdFrame(input: ContactIdFrameInput): string {
  const acct =
    input.accountCode
      .toUpperCase()
      .replace(/[^0-9A-F]/g, '')
      .slice(0, 6) || '0000';
  const q = input.qualifier === 'R' ? '3' : '1';
  const payload = `[#${acct}|${q}${pad(input.code, 3)} ${pad(input.partitionCode, 2)} ${pad(input.zoneCode, 3)}]`;
  const stamp = `_${input.at.toISOString().slice(11, 19)},${input.at.toISOString().slice(0, 10)}`;
  const body =
    `"ADM-CID"${pad(input.sequence, 4)}R${pad(input.receiverNumber, 6)}` +
    `L${pad(input.linePrefix, 6)}#${acct}${payload}${stamp}`;
  const crc = crc16Arc(body).toString(16).toUpperCase().padStart(4, '0');
  const len = body.length.toString(16).toUpperCase().padStart(4, '0');
  return `\n${crc}${len}${body}\r`;
}
