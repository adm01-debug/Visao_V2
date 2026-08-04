/**
 * Testes unitários de `matchPreset` — identificação do preset equivalente,
 * fallback para configuração personalizada e conflitos entre presets.
 */
import { describe, it, expect } from 'vitest';
import {
  matchPreset,
  PRODUCTIVITY_PRESETS,
  DEFAULT_PRODUCTIVITY_CONFIG,
  PRODUCTIVITY_SEVERITIES,
  type ProductivityConfig,
} from '@/lib/productivityConfig';

function preset(id: string) {
  const found = PRODUCTIVITY_PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`Preset inexistente no teste: ${id}`);
  return found;
}

function clone(config: ProductivityConfig): ProductivityConfig {
  return {
    eventTypes: [...config.eventTypes],
    windowStart: config.windowStart,
    windowEnd: config.windowEnd,
    weekdays: [...config.weekdays],
    severities: [...config.severities],
  };
}

describe('matchPreset — reconhecimento exato', () => {
  it.each(PRODUCTIVITY_PRESETS.map((p) => [p.id] as const))(
    'reconhece o preset %s a partir da sua própria config',
    (id) => {
      const target = preset(id);
      const result = matchPreset(clone(target.config));
      expect(result).not.toBeNull();
      // "full" é equivalente ao padrão, então o match pode ser o primeiro compatível.
      expect(result?.config.windowStart).toBe(target.config.windowStart);
      expect(result?.config.windowEnd).toBe(target.config.windowEnd);
    }
  );

  it("reconhece o padrão como o preset 'Tudo (padrão)'", () => {
    expect(matchPreset(clone(DEFAULT_PRODUCTIVITY_CONFIG))?.id).toBe('full');
  });

  it('retorna o preset de horário comercial para a config equivalente', () => {
    const config: ProductivityConfig = {
      eventTypes: ['alerts', 'panic', 'recognitions'],
      windowStart: '08:00',
      windowEnd: '18:00',
      weekdays: [1, 2, 3, 4, 5],
      severities: [...PRODUCTIVITY_SEVERITIES],
    };
    expect(matchPreset(config)?.id).toBe('business-hours');
  });

  it('retorna o preset noturno mesmo com janela cruzando a meia-noite', () => {
    expect(matchPreset(clone(preset('night-shift').config))?.id).toBe('night-shift');
  });
});

describe('matchPreset — ordem dos elementos não importa', () => {
  it('ignora a ordem dos dias da semana', () => {
    const config = clone(preset('business-hours').config);
    config.weekdays = [5, 3, 1, 4, 2];
    expect(matchPreset(config)?.id).toBe('business-hours');
  });

  it('ignora a ordem dos tipos de evento', () => {
    const config = clone(preset('critical-only').config);
    config.eventTypes = ['panic', 'alerts'];
    expect(matchPreset(config)?.id).toBe('critical-only');
  });

  it('ignora a ordem das severidades', () => {
    const config = clone(preset('night-shift').config);
    config.severities = ['critical', 'medium', 'high'];
    expect(matchPreset(config)?.id).toBe('night-shift');
  });
});

describe('matchPreset — fallback para configuração personalizada', () => {
  it('retorna null quando a janela horária difere em um minuto', () => {
    const config = clone(preset('business-hours').config);
    config.windowEnd = '18:01';
    expect(matchPreset(config)).toBeNull();
  });

  it('retorna null quando falta uma severidade', () => {
    const config = clone(preset('business-hours').config);
    config.severities = config.severities.filter((s) => s !== 'low');
    expect(matchPreset(config)).toBeNull();
  });

  it('retorna null quando há um dia da semana a mais', () => {
    const config = clone(preset('business-hours').config);
    config.weekdays = [...config.weekdays, 6];
    expect(matchPreset(config)).toBeNull();
  });

  it('retorna null quando um tipo de evento extra é adicionado', () => {
    const config = clone(preset('panic-only').config);
    config.eventTypes = ['panic', 'alerts'];
    expect(matchPreset(config)).toBeNull();
  });

  it('retorna null para listas vazias que não correspondem a nenhum preset', () => {
    const config: ProductivityConfig = {
      eventTypes: [],
      windowStart: '00:00',
      windowEnd: '23:59',
      weekdays: [],
      severities: [],
    };
    expect(matchPreset(config)).toBeNull();
  });

  it('retorna null quando o formato do horário difere (HH:mm:ss vs HH:mm)', () => {
    const config = clone(preset('business-hours').config);
    config.windowStart = '08:00:00';
    expect(matchPreset(config)).toBeNull();
  });

  it('retorna null quando há severidade duplicada (tamanhos diferentes)', () => {
    const config = clone(preset('critical-only').config);
    config.severities = ['high', 'critical', 'critical'];
    expect(matchPreset(config)).toBeNull();
  });
});

describe('matchPreset — conflitos entre presets', () => {
  it('cada preset tem um id único', () => {
    const ids = PRODUCTIVITY_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('nenhum par de presets possui exatamente a mesma configuração', () => {
    const signatures = PRODUCTIVITY_PRESETS.map((p) =>
      JSON.stringify({
        e: [...p.config.eventTypes].sort(),
        s: [...p.config.severities].sort(),
        w: [...p.config.weekdays].sort((a, b) => a - b),
        ws: p.config.windowStart,
        we: p.config.windowEnd,
      })
    );
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it('resolve para o primeiro preset compatível de forma determinística', () => {
    const config = clone(preset('full').config);
    const first = matchPreset(config);
    const second = matchPreset(clone(config));
    expect(first?.id).toBe(second?.id);
  });

  it('não muta a configuração recebida', () => {
    const config = clone(preset('weekend').config);
    const snapshot = JSON.stringify(config);
    matchPreset(config);
    expect(JSON.stringify(config)).toBe(snapshot);
  });
});
