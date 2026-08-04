/**
 * Onda 223 — "Está armado agora?" por esquema de alarme.
 *
 * A tela `/esquemas-de-alarme` mostrava *o que foi configurado*. Faltava a
 * pergunta que o operador realmente faz às 3h da manhã: **este esquema está
 * valendo neste instante?** As leis abaixo existem porque cada uma delas é uma
 * forma diferente de mentir para quem confia no painel.
 *
 *  N1. Esquema desabilitado é `off`, mesmo dentro da janela. Agenda não
 *      ressuscita cadastro desligado.
 *  N2. Esquema **inoperante** nunca é apresentado como armado. Ele pode até
 *      estar no horário, mas não vai disparar — dizer "armado" aqui é o pior
 *      erro possível deste módulo.
 *  N3. Esquema **degradado** (inconsistente) dentro da janela é
 *      `armed_degraded`: está valendo, com ressalva declarada. Rebaixar para
 *      "não armado" esconderia vigilância real.
 *  N4. Agenda vazia é 24×7 declarado (S8/G1) — armado sem próxima virada.
 *  N5. Fora da janela, a resposta inclui **quando abre**, varrendo no máximo
 *      7 dias à frente. Se nenhuma janela abrir em 7 dias, a agenda é
 *      inalcançável: isso é dito (`unreachable`), não silenciado.
 *  N6. Relógio inválido não vira "não armado": vira `unknown`. Ausência de
 *      informação nunca é apresentada como ausência de vigilância.
 *  N7. Fuso é sempre explícito, como em `isWithinSchedule` — decidir pelo fuso
 *      do processo faria o mesmo cadastro armar em horas diferentes conforme
 *      onde o código roda.
 *  N8. A virada é calculada no eixo de minutos (varredura determinística), não
 *      por amostragem: nada de "checa a cada 5 minutos e torce".
 */

import {
  MINUTES_PER_DAY,
  isAlwaysOn,
  isWithinSchedule,
  normalizeSchedule,
  type AlarmSchedule,
} from './alarmAggregation';

export type ArmedState = 'armed' | 'armed_degraded' | 'idle' | 'off' | 'inoperative' | 'unknown';

export interface ArmedVerdict {
  readonly state: ArmedState;
  /** Verdadeiro só quando a vigilância está de fato valendo agora. */
  readonly effective: boolean;
  /** Minutos até a próxima virada (abrir ou fechar). `null` = 24×7 ou desconhecido. */
  readonly minutesToChange: number | null;
  /** Agenda declarada que nunca abre em 7 dias. */
  readonly unreachable: boolean;
  readonly label: string;
}

export interface ArmedInput {
  readonly enabled: boolean;
  readonly health: 'ok' | 'inconsistent' | 'inoperative';
  readonly schedule: AlarmSchedule | null | undefined;
}

const isClock = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Minuto local (0..1439) e dia da semana, no fuso declarado. */
function localPosition(at: number, tzOffsetMinutes: number): { weekday: number; minute: number } {
  const local = new Date(at + tzOffsetMinutes * 60_000);
  return {
    weekday: local.getUTCDay(),
    minute: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

/**
 * Varredura determinística (N8): caminha minuto a minuto por até 7 dias e
 * devolve em quantos minutos o estado de cobertura inverte.
 *
 * 7×1440 = 10.080 avaliações no pior caso — barato, e imune aos erros de borda
 * que uma aritmética "esperta" de intervalos cometeria com janelas que cruzam a
 * meia-noite.
 */
function minutesUntilFlip(
  schedule: AlarmSchedule | null | undefined,
  at: number,
  tzOffsetMinutes: number,
  covered: boolean
): number | null {
  const days = normalizeSchedule(schedule);
  const start = localPosition(at, tzOffsetMinutes);
  let weekday = start.weekday;
  let minute = start.minute;

  for (let step = 1; step <= 7 * MINUTES_PER_DAY; step += 1) {
    minute += 1;
    if (minute >= MINUTES_PER_DAY) {
      minute = 0;
      weekday = (weekday + 1) % 7;
    }
    let inside = false;
    for (const p of days[weekday] ?? []) {
      if (p.startMin < p.endMin) {
        if (minute >= p.startMin && minute < p.endMin) inside = true;
      } else if (minute >= p.startMin) {
        inside = true;
      }
    }
    if (!inside) {
      const previous = (weekday + 6) % 7;
      for (const p of days[previous] ?? []) {
        if (p.startMin > p.endMin && minute < p.endMin) inside = true;
      }
    }
    if (inside !== covered) return step;
  }
  return null;
}

function describe(state: ArmedState, minutes: number | null, unreachable: boolean): string {
  const when = minutes === null ? '' : ` · ${formatDuration(minutes)}`;
  switch (state) {
    case 'armed':
      return minutes === null ? 'Armado 24×7' : `Armado${when} até fechar`;
    case 'armed_degraded':
      return minutes === null
        ? 'Armado com ressalva (24×7)'
        : `Armado com ressalva${when} até fechar`;
    case 'idle':
      return unreachable
        ? 'Agenda nunca abre nos próximos 7 dias'
        : `Fora da janela${when} para abrir`;
    case 'off':
      return 'Desabilitado';
    case 'inoperative':
      return 'Inoperante — não dispara';
    default:
      return 'Indeterminado';
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0 ? `${days} d` : `${days} d ${restHours} h`;
}

/**
 * Responde "está armado agora?" para um esquema.
 *
 * `tzOffsetMinutes` é exigido explicitamente (N7). Passar o fuso do navegador
 * é escolha de quem chama — a régua não adivinha.
 */
export function evaluateArmedNow(input: ArmedInput, at: number, tzOffsetMinutes = 0): ArmedVerdict {
  // N6 — relógio impossível não é prova de que nada está armado.
  if (!isClock(at)) {
    return {
      state: 'unknown',
      effective: false,
      minutesToChange: null,
      unreachable: false,
      label: describe('unknown', null, false),
    };
  }

  // N1 — desabilitado vence a agenda.
  if (!input.enabled) {
    return {
      state: 'off',
      effective: false,
      minutesToChange: null,
      unreachable: false,
      label: describe('off', null, false),
    };
  }

  // N2 — inoperante nunca se apresenta como armado.
  if (input.health === 'inoperative') {
    return {
      state: 'inoperative',
      effective: false,
      minutesToChange: null,
      unreachable: false,
      label: describe('inoperative', null, false),
    };
  }

  // N4 — 24×7 declarado: não existe próxima virada.
  if (isAlwaysOn(input.schedule)) {
    const state: ArmedState = input.health === 'inconsistent' ? 'armed_degraded' : 'armed';
    return {
      state,
      effective: true,
      minutesToChange: null,
      unreachable: false,
      label: describe(state, null, false),
    };
  }

  const covered = isWithinSchedule(input.schedule, at, tzOffsetMinutes);
  const flip = minutesUntilFlip(input.schedule, at, tzOffsetMinutes, covered);

  if (covered) {
    // N3 — degradado dentro da janela continua valendo, com ressalva.
    const state: ArmedState = input.health === 'inconsistent' ? 'armed_degraded' : 'armed';
    return {
      state,
      effective: true,
      minutesToChange: flip,
      unreachable: false,
      label: describe(state, flip, false),
    };
  }

  // N5 — fora da janela: dizer quando abre, ou admitir que nunca abre.
  const unreachable = flip === null;
  return {
    state: 'idle',
    effective: false,
    minutesToChange: flip,
    unreachable,
    label: describe('idle', flip, unreachable),
  };
}

/** Deslocamento local do navegador no formato aceito por `isWithinSchedule`. */
export const browserTzOffsetMinutes = (at: number = Date.now()): number =>
  -new Date(at).getTimezoneOffset();
