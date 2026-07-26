import { describe, expect, it } from 'vitest';
import {
  CONTACT_ID_MAP,
  MONITORING_CENTER_POLICY,
  MONITORING_EVENT_KINDS,
  backoffSeconds,
  contactIdForEvent,
  crc16Arc,
  dedupeKey,
  formatContactIdFrame,
  isValidAccountCode,
  settleDispatch,
  type DispatchState,
} from '@/lib/integrations/monitoringCenter';

const T0 = Date.UTC(2026, 6, 26, 12, 0, 0);

describe('Onda 126 — mapa Contact ID', () => {
  it('todo evento mapeia para código Ademco de 3 dígitos e qualificador válido', () => {
    for (const kind of MONITORING_EVENT_KINDS) {
      const m = contactIdForEvent(kind);
      expect(m, kind).not.toBeNull();
      expect(m!.code, kind).toMatch(/^\d{3}$/);
      expect(['E', 'R'], kind).toContain(m!.qualifier);
      expect(m!.priority, kind).toBeGreaterThanOrEqual(1);
      expect(m!.priority, kind).toBeLessThanOrEqual(9);
    }
  });

  it('eventos de vida (pânico/coação/incêndio) têm prioridade máxima', () => {
    for (const kind of ['panic', 'duress', 'fire'] as const) {
      expect(CONTACT_ID_MAP[kind].priority).toBe(1);
    }
  });

  it('pares evento/restauro compartilham código e divergem no qualificador', () => {
    for (const [e, r] of [
      ['camera_offline', 'camera_online'],
      ['agent_offline', 'agent_online'],
    ] as const) {
      expect(CONTACT_ID_MAP[e].code).toBe(CONTACT_ID_MAP[r].code);
      expect(CONTACT_ID_MAP[e].qualifier).toBe('E');
      expect(CONTACT_ID_MAP[r].qualifier).toBe('R');
    }
  });

  it('evento desconhecido não inventa código', () => {
    for (const junk of ['', 'PANIC', 'intrusao', '130', '__proto__', 'toString']) {
      expect(contactIdForEvent(junk), junk).toBeNull();
    }
  });
});

describe('Onda 126 — recuo exponencial', () => {
  it('dobra até o teto e nunca regride', () => {
    let prev = 0;
    for (let a = 1; a <= 40; a += 1) {
      const s = backoffSeconds(a);
      expect(s).toBeGreaterThanOrEqual(prev);
      expect(s).toBeLessThanOrEqual(MONITORING_CENTER_POLICY.maxBackoffSeconds);
      prev = s;
    }
    expect(backoffSeconds(1)).toBe(15);
    expect(backoffSeconds(2)).toBe(30);
    expect(backoffSeconds(3)).toBe(60);
    expect(backoffSeconds(4)).toBe(120);
  });

  it('entradas degeneradas caem no primeiro degrau em vez de explodir', () => {
    for (const bad of [0, -1, -999, 0.4, Number.NaN]) {
      expect(backoffSeconds(bad as number)).toBe(MONITORING_CENTER_POLICY.baseBackoffSeconds);
    }
  });
});

describe('Onda 126 — máquina de estados do despacho (varredura exaustiva)', () => {
  it('nunca produz transição inválida em centenas de combinações', () => {
    const statuses: DispatchState['status'][] = ['pending', 'claimed', 'delivered', 'failed', 'expired'];
    const ages = [0, 30, 300, 1800, 3599, 3600, 7200];
    let scenarios = 0;
    for (const status of statuses) {
      for (let attempts = 0; attempts <= 7; attempts += 1) {
        for (const age of ages) {
          for (const ok of [true, false]) {
            scenarios += 1;
            const now = T0 + age * 1000;
            const state: DispatchState = { status, attempts, createdAt: T0 };
            const out = settleDispatch(state, ok, now);

            if (status === 'delivered' || status === 'failed' || status === 'expired') {
              expect(out.reason).toBe('terminal');
              expect(out.status).toBe(status);
              expect(out.attempts).toBe(attempts);
              expect(out.nextAttemptAt).toBeNull();
              continue;
            }
            expect(out.attempts).toBe(attempts + 1);
            if (ok) {
              expect(out.status).toBe('delivered');
              expect(out.nextAttemptAt).toBeNull();
              continue;
            }
            if (age >= MONITORING_CENTER_POLICY.deadlineSeconds) {
              // Prazo final vence tentativas restantes: alarme velho não vira viatura.
              expect(out.status).toBe('expired');
              expect(out.nextAttemptAt).toBeNull();
            } else if (attempts + 1 >= MONITORING_CENTER_POLICY.maxAttempts) {
              expect(out.status).toBe('failed');
              expect(out.nextAttemptAt).toBeNull();
            } else {
              expect(out.status).toBe('pending');
              expect(out.nextAttemptAt).toBe(now + backoffSeconds(attempts + 1) * 1000);
            }
          }
        }
      }
    }
    expect(scenarios).toBeGreaterThanOrEqual(500);
  });

  it('sequência realista de central fora do ar termina em failed antes do prazo', () => {
    let state: DispatchState = { status: 'pending', attempts: 0, createdAt: T0 };
    let now = T0;
    const trail: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      const out = settleDispatch(state, false, now);
      trail.push(out.status);
      if (out.nextAttemptAt === null) break;
      now = out.nextAttemptAt;
      state = { status: 'claimed', attempts: out.attempts, createdAt: T0 };
    }
    expect(trail).toEqual(['pending', 'pending', 'pending', 'pending', 'failed']);
    expect(now - T0).toBeLessThan(MONITORING_CENTER_POLICY.deadlineSeconds * 1000);
  });
});

describe('Onda 126 — deduplicação', () => {
  it('absorve repetição dentro do balde e libera fora dele', () => {
    const base = { accountId: 'acc-1', code: '130', qualifier: 'E' as const, zoneCode: '007' };
    const w = MONITORING_CENTER_POLICY.dedupeWindowSeconds * 1000;
    const bucketStart = Math.floor(T0 / w) * w;
    expect(dedupeKey({ ...base, bucketAt: bucketStart })).toBe(
      dedupeKey({ ...base, bucketAt: bucketStart + w - 1 }),
    );
    expect(dedupeKey({ ...base, bucketAt: bucketStart })).not.toBe(
      dedupeKey({ ...base, bucketAt: bucketStart + w }),
    );
  });

  it('restauro nunca é absorvido pelo evento correspondente', () => {
    const base = { accountId: 'a', code: '380', zoneCode: '001', bucketAt: T0 };
    expect(dedupeKey({ ...base, qualifier: 'E' })).not.toBe(dedupeKey({ ...base, qualifier: 'R' }));
  });

  it('contas e zonas distintas nunca colidem (varredura)', () => {
    const seen = new Set<string>();
    for (const accountId of ['a1', 'a2', 'a3']) {
      for (const code of ['120', '130', '380']) {
        for (const zoneCode of ['000', '001', '042']) {
          for (const qualifier of ['E', 'R'] as const) {
            const k = dedupeKey({ accountId, code, qualifier, zoneCode, bucketAt: T0 });
            expect(seen.has(k)).toBe(false);
            seen.add(k);
          }
        }
      }
    }
    expect(seen.size).toBe(54);
  });
});

describe('Onda 126 — quadro SIA DC-09 / Contact ID', () => {
  const frameInput = {
    accountCode: '1234',
    code: '130',
    qualifier: 'E' as const,
    partitionCode: '01',
    zoneCode: '007',
    sequence: 42,
    receiverNumber: '1',
    linePrefix: '2',
    at: new Date(T0),
  };

  it('respeita o envelope: LF, CRC, tamanho e CR', () => {
    const frame = formatContactIdFrame(frameInput);
    expect(frame.startsWith('\n')).toBe(true);
    expect(frame.endsWith('\r')).toBe(true);
    const body = frame.slice(9, -1);
    expect(frame.slice(1, 5)).toBe(crc16Arc(body).toString(16).toUpperCase().padStart(4, '0'));
    expect(parseInt(frame.slice(5, 9), 16)).toBe(body.length);
    expect(body).toContain('"ADM-CID"0042');
    expect(body).toContain('[#1234|1130 01 007]');
  });

  it('qualificador de restauro vira 3 no payload', () => {
    expect(formatContactIdFrame({ ...frameInput, qualifier: 'R' })).toContain('|3130 ');
  });

  it('CRC-16/ARC bate com vetores conhecidos', () => {
    expect(crc16Arc('123456789')).toBe(0xbb3d);
    expect(crc16Arc('')).toBe(0);
    expect(crc16Arc('A')).toBe(0x30c0);
  });

  it('normaliza entradas sujas sem quebrar o comprimento dos campos', () => {
    const dirty = formatContactIdFrame({
      ...frameInput,
      accountCode: 'ab-cd-ef-99',
      partitionCode: 'x',
      zoneCode: '12345',
      sequence: 123456,
    });
    expect(dirty).toContain('[#ABCDEF|1130 00 345]');
    expect(dirty).toContain('"ADM-CID"3456');
  });

  it('CRC muda quando qualquer campo relevante muda (varredura)', () => {
    const crcs = new Set<string>();
    for (const code of Object.values(CONTACT_ID_MAP).map((m) => m.code)) {
      for (let seq = 1; seq <= 25; seq += 1) {
        for (const zoneCode of ['000', '013', '250']) {
          const f = formatContactIdFrame({ ...frameInput, code, sequence: seq, zoneCode });
          crcs.add(f.slice(1, 5) + f.slice(5, 9));
        }
      }
    }
    expect(crcs.size).toBeGreaterThan(100);
  });
});

describe('Onda 126 — validação de conta', () => {
  it('aceita 4 a 6 dígitos hexadecimais e rejeita o resto', () => {
    for (const good of ['1234', 'ABCD', 'abcdef', '00FF12', ' 1234 ']) {
      expect(isValidAccountCode(good), good).toBe(true);
    }
    for (const bad of ['', '123', '1234567', 'GHIJ', '12 34', '12-34', '1234\n']) {
      expect(isValidAccountCode(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});
