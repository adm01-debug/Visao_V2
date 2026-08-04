import { describe, it, expect } from 'vitest';
import {
  buildPublishUrl,
  classifyIngestHealth,
  ingestPolicy,
  isPushProtocol,
  isValidStreamKey,
  maskStreamKey,
  INGEST_PROTOCOLS,
  type IngestEndpointSnapshot,
} from '@/lib/ingest/streamIngest';

const NOW = new Date('2026-07-26T12:00:00.000Z');
const key = 'a'.repeat(48);

const base = (over: Partial<IngestEndpointSnapshot> = {}): IngestEndpointSnapshot => ({
  protocol: 'rtmp_push',
  status: 'publishing',
  lastPublishAt: '2026-07-26T11:59:00.000Z',
  createdAt: '2026-07-01T00:00:00.000Z',
  staleAfterSeconds: ingestPolicy.defaultStaleAfterSeconds,
  ...over,
});

describe('streamIngest — forma da chave', () => {
  it('aceita apenas hex entre 32 e 64 caracteres', () => {
    expect(isValidStreamKey('a'.repeat(32))).toBe(true);
    expect(isValidStreamKey('f'.repeat(64))).toBe(true);
    expect(isValidStreamKey('a'.repeat(31))).toBe(false);
    expect(isValidStreamKey('a'.repeat(65))).toBe(false);
    expect(isValidStreamKey('A'.repeat(48))).toBe(false); // maiúscula não é aceita no CHECK
    expect(isValidStreamKey('z'.repeat(48))).toBe(false);
    expect(isValidStreamKey(null)).toBe(false);
  });

  it('mascara sem revelar o miolo', () => {
    const masked = maskStreamKey(key);
    expect(masked).toBe('aaaaaa…aaaa');
    expect(masked.length).toBeLessThan(key.length);
    expect(maskStreamKey('curta')).toBe('••••');
  });
});

describe('streamIngest — URLs de publicação', () => {
  it('monta RTMP com chave em campo separado', () => {
    const r = buildPublishUrl('rtmp_push', 'stream.exemplo.com/', key);
    expect(r.url).toBe('rtmp://stream.exemplo.com/ingest');
    expect(r.streamKeyField).toBe(key);
  });

  it('monta SRT embutindo o streamid', () => {
    const r = buildPublishUrl('srt_push', 'stream.exemplo.com', key);
    expect(r.url).toContain(`streamid=publish:ingest/${key}`);
    expect(r.streamKeyField).toBeNull();
  });

  it('não gera URL para modo puxar', () => {
    expect(buildPublishUrl('rtsp_pull', 'x', key).url).toBe('');
  });

  it('classifica corretamente quais protocolos são push', () => {
    expect(INGEST_PROTOCOLS.filter(isPushProtocol)).toEqual(['rtmp_push', 'srt_push']);
  });
});

describe('streamIngest — classificação de saúde (paridade com o SQL)', () => {
  it('considera saudável quem publicou dentro da tolerância', () => {
    const v = classifyIngestHealth(base(), NOW);
    expect(v.health).toBe('healthy');
    expect(v.severity).toBe('none');
  });

  it('marca como crítico quem já publicou e ficou em silêncio', () => {
    const v = classifyIngestHealth(base({ lastPublishAt: '2026-07-26T11:50:00.000Z' }), NOW);
    expect(v.health).toBe('silent');
    expect(v.severity).toBe('critical');
    expect(v.silentForSeconds).toBe(600);
  });

  it('marca como aviso quem nunca publicou (instalação em andamento)', () => {
    const v = classifyIngestHealth(base({ lastPublishAt: null, status: 'pending' }), NOW);
    expect(v.health).toBe('never_published');
    expect(v.severity).toBe('warning');
  });

  it('não acusa falha antes da tolerância mesmo sem nunca ter publicado', () => {
    const v = classifyIngestHealth(
      base({ lastPublishAt: null, status: 'pending', createdAt: '2026-07-26T11:58:00.000Z' }),
      NOW
    );
    expect(v.health).toBe('healthy');
  });

  it('chave revogada não é falha operacional', () => {
    const v = classifyIngestHealth(
      base({ status: 'revoked', lastPublishAt: '2020-01-01T00:00:00.000Z' }),
      NOW
    );
    expect(v.health).toBe('revoked');
    expect(v.severity).toBe('none');
  });

  it('modo puxar nunca entra no detector de silêncio', () => {
    const v = classifyIngestHealth(base({ protocol: 'rtsp_pull', lastPublishAt: null }), NOW);
    expect(v.health).toBe('not_push');
  });

  it('recuo de relógio do servidor não vira tempo negativo', () => {
    const v = classifyIngestHealth(base({ lastPublishAt: '2026-07-26T12:05:00.000Z' }), NOW);
    expect(v.silentForSeconds).toBe(0);
    expect(v.health).toBe('healthy');
  });

  it('respeita os limites de tolerância do CHECK do banco', () => {
    const tooLow = classifyIngestHealth(
      base({ staleAfterSeconds: 1, lastPublishAt: '2026-07-26T11:59:30.000Z' }),
      NOW
    );
    // 30s de silêncio com tolerância pedida de 1s: o piso de 60s manda.
    expect(tooLow.health).toBe('healthy');

    const tooHigh = classifyIngestHealth(
      base({ staleAfterSeconds: 999_999, lastPublishAt: '2020-01-01T00:00:00.000Z' }),
      NOW
    );
    expect(tooHigh.health).toBe('silent');
  });
});

describe('streamIngest — varredura de cenários', () => {
  it('nenhuma combinação produz severidade fora do vocabulário do barramento', () => {
    const allowed = new Set(['none', 'warning', 'critical']);
    let checked = 0;
    for (const protocol of INGEST_PROTOCOLS) {
      for (const status of ['pending', 'publishing', 'idle', 'revoked'] as const) {
        for (const lastPublishAt of [
          null,
          '2026-07-26T11:59:00.000Z',
          '2020-01-01T00:00:00.000Z',
        ]) {
          for (const staleAfterSeconds of [60, 300, 3600, 86_400]) {
            const v = classifyIngestHealth(
              base({ protocol, status, lastPublishAt, staleAfterSeconds }),
              NOW
            );
            expect(allowed.has(v.severity)).toBe(true);
            expect(v.silentForSeconds).toBeGreaterThanOrEqual(0);
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBe(3 * 4 * 3 * 4);
  });
});
