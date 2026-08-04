/**
 * Testes unitários de `isWithinWindow` — foco em janelas que cruzam a
 * meia-noite, limites exatos e mudanças de horário (DST / fuso).
 */
import { describe, it, expect } from 'vitest';
import {
  isWithinWindow,
  DEFAULT_PRODUCTIVITY_CONFIG,
  type ProductivityConfig,
} from '@/lib/productivityConfig';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function makeConfig(overrides: Partial<ProductivityConfig> = {}): ProductivityConfig {
  return { ...DEFAULT_PRODUCTIVITY_CONFIG, weekdays: [...ALL_DAYS], ...overrides };
}

/** Constrói uma data local com hora/minuto explícitos. */
function at(dateISO: string, hours: number, minutes: number): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, d, hours, minutes, 0, 0);
}

describe('isWithinWindow — janela diurna simples', () => {
  const config = makeConfig({ windowStart: '08:00', windowEnd: '18:00' });

  it('inclui o instante exato de início (limite inferior inclusivo)', () => {
    expect(isWithinWindow(at('2026-07-20', 8, 0), config)).toBe(true);
  });

  it('inclui o instante exato de fim (limite superior inclusivo)', () => {
    expect(isWithinWindow(at('2026-07-20', 18, 0), config)).toBe(true);
  });

  it('exclui um minuto antes do início', () => {
    expect(isWithinWindow(at('2026-07-20', 7, 59), config)).toBe(false);
  });

  it('exclui um minuto após o fim', () => {
    expect(isWithinWindow(at('2026-07-20', 18, 1), config)).toBe(false);
  });

  it('ignora segundos e milissegundos na comparação', () => {
    const d = at('2026-07-20', 18, 0);
    d.setSeconds(59, 999);
    expect(isWithinWindow(d, config)).toBe(true);
  });

  it('inclui o meio da janela', () => {
    expect(isWithinWindow(at('2026-07-20', 12, 30), config)).toBe(true);
  });
});

describe('isWithinWindow — janela que cruza a meia-noite', () => {
  const config = makeConfig({ windowStart: '19:00', windowEnd: '06:00' });

  it.each([
    [19, 0, true, 'início exato'],
    [23, 59, true, 'último minuto do dia'],
    [0, 0, true, 'meia-noite exata'],
    [3, 15, true, 'madrugada'],
    [6, 0, true, 'fim exato'],
    [6, 1, false, 'um minuto após o fim'],
    [12, 0, false, 'meio-dia (fora)'],
    [18, 59, false, 'um minuto antes do início'],
  ])('%i:%i → %s (%s)', (h, m, expected) => {
    expect(isWithinWindow(at('2026-07-20', h as number, m as number), config)).toBe(expected);
  });

  it('trata a virada de dia como contínua (23:59 e 00:00 seguintes ambos dentro)', () => {
    expect(isWithinWindow(at('2026-07-20', 23, 59), config)).toBe(true);
    expect(isWithinWindow(at('2026-07-21', 0, 0), config)).toBe(true);
  });
});

describe('isWithinWindow — janelas degeneradas', () => {
  it('janela de um único minuto (start === end) só aceita esse minuto', () => {
    const config = makeConfig({ windowStart: '07:30', windowEnd: '07:30' });
    expect(isWithinWindow(at('2026-07-20', 7, 30), config)).toBe(true);
    expect(isWithinWindow(at('2026-07-20', 7, 29), config)).toBe(false);
    expect(isWithinWindow(at('2026-07-20', 7, 31), config)).toBe(false);
  });

  it('janela 00:00–23:59 exclui apenas nada relevante (cobre o dia inteiro em minutos)', () => {
    const config = makeConfig({ windowStart: '00:00', windowEnd: '23:59' });
    expect(isWithinWindow(at('2026-07-20', 0, 0), config)).toBe(true);
    expect(isWithinWindow(at('2026-07-20', 23, 59), config)).toBe(true);
  });

  it('não filtra quando o horário é inválido (fail-open)', () => {
    const config = makeConfig({ windowStart: '25:00', windowEnd: '06:00' });
    expect(isWithinWindow(at('2026-07-20', 13, 0), config)).toBe(true);
  });

  it('não filtra quando o fim é inválido (fail-open)', () => {
    const config = makeConfig({ windowStart: '08:00', windowEnd: '8h' });
    expect(isWithinWindow(at('2026-07-20', 22, 0), config)).toBe(true);
  });

  it('aceita horários com segundos vindos do Postgres (HH:mm:ss)', () => {
    const config = makeConfig({ windowStart: '08:00:00', windowEnd: '18:00:00' });
    expect(isWithinWindow(at('2026-07-20', 9, 0), config)).toBe(true);
    expect(isWithinWindow(at('2026-07-20', 19, 0), config)).toBe(false);
  });
});

describe('isWithinWindow — dias da semana', () => {
  it('exclui o dia não selecionado mesmo dentro da janela horária', () => {
    // 2026-07-20 é uma segunda-feira.
    const config = makeConfig({ windowStart: '08:00', windowEnd: '18:00', weekdays: [2, 3, 4] });
    expect(at('2026-07-20', 12, 0).getDay()).toBe(1);
    expect(isWithinWindow(at('2026-07-20', 12, 0), config)).toBe(false);
  });

  it('retorna false quando nenhum dia está selecionado', () => {
    const config = makeConfig({ weekdays: [] });
    expect(isWithinWindow(at('2026-07-20', 12, 0), config)).toBe(false);
  });

  it('no turno noturno o dia avaliado é o do próprio instante, não o do início do turno', () => {
    // Turno noturno configurado só para segunda (1). A madrugada de terça (2)
    // pertence ao turno iniciado na segunda, mas é avaliada como terça.
    const config = makeConfig({ windowStart: '19:00', windowEnd: '06:00', weekdays: [1] });
    expect(isWithinWindow(at('2026-07-20', 20, 0), config)).toBe(true); // segunda 20h
    expect(isWithinWindow(at('2026-07-21', 2, 0), config)).toBe(false); // terça 02h
  });
});

describe('isWithinWindow — mudanças de horário e fuso', () => {
  it('usa horário local do runtime, não UTC', () => {
    const config = makeConfig({ windowStart: '08:00', windowEnd: '18:00' });
    const local = at('2026-07-20', 9, 0);
    // A conversão UTC pode cair fora da janela; o resultado deve seguir o local.
    expect(isWithinWindow(local, config)).toBe(true);
    expect(local.getHours()).toBe(9);
  });

  it('mantém coerência em datas de transição de DST (horário local preservado)', () => {
    // Domingos historicamente usados para transição de horário de verão.
    const config = makeConfig({ windowStart: '00:00', windowEnd: '23:59' });
    for (const iso of ['2026-03-08', '2026-11-01', '2026-10-18', '2026-02-15']) {
      for (const hour of [0, 1, 2, 3, 23]) {
        const d = at(iso, hour, 30);
        // getHours pode ser deslocado pelo runtime em horas inexistentes;
        // a função deve seguir exatamente o que getHours reporta.
        const expected = d.getHours() * 60 + d.getMinutes() <= 23 * 60 + 59;
        expect(isWithinWindow(d, config)).toBe(expected);
      }
    }
  });

  it('um mesmo instante absoluto pode entrar ou sair da janela conforme o fuso do cliente', () => {
    const config = makeConfig({ windowStart: '19:00', windowEnd: '06:00' });
    const instant = new Date('2026-07-20T22:00:00Z');
    const localHour = instant.getHours();
    const inWindow = localHour >= 19 || localHour <= 6;
    expect(isWithinWindow(instant, config)).toBe(inWindow);
  });

  it('é estável para o mesmo instante avaliado repetidamente', () => {
    const config = makeConfig({ windowStart: '19:00', windowEnd: '06:00' });
    const d = at('2026-07-20', 23, 0);
    const results = Array.from({ length: 5 }, () => isWithinWindow(d, config));
    expect(new Set(results).size).toBe(1);
  });

  it('varre as 1440 posições do dia sem inconsistência na janela noturna', () => {
    const config = makeConfig({ windowStart: '22:15', windowEnd: '05:45' });
    for (let minutes = 0; minutes < 1440; minutes++) {
      const d = at('2026-07-20', Math.floor(minutes / 60), minutes % 60);
      const expected = minutes >= 22 * 60 + 15 || minutes <= 5 * 60 + 45;
      expect(isWithinWindow(d, config)).toBe(expected);
    }
  });
});
