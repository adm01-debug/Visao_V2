import { describe, expect, it } from 'vitest';
import {
  classifyPathFailure,
  classifyTelemetryRow,
  TRANSPORT_ERROR_CODES,
} from '@/lib/devices/connectivityFailureKind';

describe('classifyPathFailure', () => {
  it('classifica todos os códigos de transporte como transport', () => {
    for (const code of TRANSPORT_ERROR_CODES) {
      expect(classifyPathFailure(code)).toBe('transport');
    }
  });

  it('trata código desconhecido como neutro (config), nunca transport', () => {
    expect(classifyPathFailure('codigo_que_ninguem_mapeou')).toBe('config');
  });

  it('é total: null, vazio e lixo não lançam', () => {
    expect(classifyPathFailure(null)).toBe('none');
    expect(classifyPathFailure(undefined)).toBe('none');
    expect(classifyPathFailure('   ')).toBe('none');
    expect(classifyPathFailure(42 as unknown as string)).toBe('none');
  });

  it('normaliza caixa e espaços', () => {
    expect(classifyPathFailure('  TIMEOUT ')).toBe('transport');
  });

  it('credencial e equipamento não culpam a rota', () => {
    expect(classifyPathFailure('unauthorized')).toBe('auth');
    expect(classifyPathFailure('camera_offline')).toBe('device');
  });
});

describe('classifyTelemetryRow', () => {
  it('sucesso nunca é falha', () => {
    expect(
      classifyTelemetryRow({ succeeded: true, error_code: 'timeout', retry_error_code: 'timeout' })
    ).toBe('none');
  });

  it('o código da tentativa tem precedência sobre o motivo original', () => {
    expect(
      classifyTelemetryRow({
        succeeded: false,
        error_code: 'private_host_blocked',
        retry_error_code: 'timeout',
      })
    ).toBe('transport');
  });

  it('sem código de tentativa, cai no código original', () => {
    expect(
      classifyTelemetryRow({
        succeeded: false,
        error_code: 'private_host_blocked',
        retry_error_code: null,
      })
    ).toBe('config');
  });
});
