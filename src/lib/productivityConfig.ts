/**
 * VISÃO — Critérios de métricas de produtividade
 *
 * Define os tipos, defaults e helpers puros usados pelo Relatório Semanal
 * para decidir quais eventos entram no cálculo das métricas do time.
 * A persistência é feita por usuário no backend (tabela
 * `productivity_metric_preferences`), permitindo uso entre dispositivos.
 */

export const PRODUCTIVITY_EVENT_TYPES = ['alerts', 'panic', 'recognitions'] as const;
export type ProductivityEventType = (typeof PRODUCTIVITY_EVENT_TYPES)[number];

export const PRODUCTIVITY_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type ProductivitySeverity = (typeof PRODUCTIVITY_SEVERITIES)[number];

export interface ProductivityConfig {
  /** Tipos de evento considerados nas métricas. */
  eventTypes: ProductivityEventType[];
  /** Início da janela de trabalho (HH:mm). */
  windowStart: string;
  /** Fim da janela de trabalho (HH:mm). Pode cruzar a meia-noite. */
  windowEnd: string;
  /** Dias da semana considerados (0 = domingo ... 6 = sábado). */
  weekdays: number[];
  /** Severidades de alerta incluídas. */
  severities: ProductivitySeverity[];
}

export const DEFAULT_PRODUCTIVITY_CONFIG: ProductivityConfig = {
  eventTypes: [...PRODUCTIVITY_EVENT_TYPES],
  windowStart: '00:00',
  windowEnd: '23:59',
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  severities: [...PRODUCTIVITY_SEVERITIES],
};

export const EVENT_TYPE_LABEL: Record<ProductivityEventType, string> = {
  alerts: 'Alertas / incidentes',
  panic: 'Eventos de pânico',
  recognitions: 'Reconhecimentos',
};

export const SEVERITY_LABEL: Record<ProductivitySeverity, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const WEEKDAY_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

/** Preset pronto de critérios, para configuração rápida. */
export interface ProductivityPreset {
  id: string;
  label: string;
  description: string;
  config: ProductivityConfig;
}

export const PRODUCTIVITY_PRESETS: ProductivityPreset[] = [
  {
    id: 'full',
    label: 'Tudo (padrão)',
    description: 'Todos os eventos, 24h, todos os dias',
    config: DEFAULT_PRODUCTIVITY_CONFIG,
  },
  {
    id: 'business-hours',
    label: 'Horário comercial',
    description: 'Seg–Sex, 08:00–18:00, todos os eventos',
    config: {
      eventTypes: [...PRODUCTIVITY_EVENT_TYPES],
      windowStart: '08:00',
      windowEnd: '18:00',
      weekdays: [1, 2, 3, 4, 5],
      severities: [...PRODUCTIVITY_SEVERITIES],
    },
  },
  {
    id: 'night-shift',
    label: 'Turno da noite',
    description: '19:00–06:00, todos os dias, severidade média+',
    config: {
      eventTypes: [...PRODUCTIVITY_EVENT_TYPES],
      windowStart: '19:00',
      windowEnd: '06:00',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      severities: ['medium', 'high', 'critical'],
    },
  },
  {
    id: 'weekend',
    label: 'Fim de semana',
    description: 'Sáb e Dom, 24h, todos os eventos',
    config: {
      eventTypes: [...PRODUCTIVITY_EVENT_TYPES],
      windowStart: '00:00',
      windowEnd: '23:59',
      weekdays: [0, 6],
      severities: [...PRODUCTIVITY_SEVERITIES],
    },
  },
  {
    id: 'panic-only',
    label: 'Somente pânico',
    description: 'Apenas eventos de pânico, 24h',
    config: {
      eventTypes: ['panic'],
      windowStart: '00:00',
      windowEnd: '23:59',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      severities: [...PRODUCTIVITY_SEVERITIES],
    },
  },
  {
    id: 'critical-only',
    label: 'Só críticos',
    description: 'Alertas e pânico com severidade alta/crítica',
    config: {
      eventTypes: ['alerts', 'panic'],
      windowStart: '00:00',
      windowEnd: '23:59',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      severities: ['high', 'critical'],
    },
  },
];

/** Compara dois conjuntos ignorando a ordem dos elementos. */
function sameSet<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((item) => setB.has(item));
}

/** Retorna o preset equivalente à configuração atual, ou null se for personalizada. */
export function matchPreset(config: ProductivityConfig): ProductivityPreset | null {
  return (
    PRODUCTIVITY_PRESETS.find(
      (preset) =>
        preset.config.windowStart === config.windowStart &&
        preset.config.windowEnd === config.windowEnd &&
        sameSet(preset.config.eventTypes, config.eventTypes) &&
        sameSet(preset.config.weekdays, config.weekdays) &&
        sameSet(preset.config.severities, config.severities)
    ) ?? null
  );
}

/** Converte "HH:mm[:ss]" em minutos desde a meia-noite. Retorna null se inválido. */
export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Normaliza "HH:mm:ss" (formato do Postgres `time`) para "HH:mm". */
export function normalizeTime(value: string, fallback: string): string {
  const minutes = timeToMinutes(value);
  if (minutes === null) return fallback;
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Indica se a data cai dentro da janela configurada.
 * Suporta turnos que cruzam a meia-noite (ex.: 19:00 → 06:00).
 */
export function isWithinWindow(date: Date, config: ProductivityConfig): boolean {
  if (!config.weekdays.includes(date.getDay())) return false;

  const start = timeToMinutes(config.windowStart);
  const end = timeToMinutes(config.windowEnd);
  if (start === null || end === null) return true; // configuração inválida → não filtra

  const current = date.getHours() * 60 + date.getMinutes();
  if (start <= end) return current >= start && current <= end;
  // Janela noturna: vale do início até 23:59 e de 00:00 até o fim.
  return current >= start || current <= end;
}

/** Verifica se um tipo de evento entra no cálculo. */
export function includesEventType(
  config: ProductivityConfig,
  type: ProductivityEventType
): boolean {
  return config.eventTypes.includes(type);
}

/** Verifica se uma severidade entra no cálculo. */
export function includesSeverity(config: ProductivityConfig, severity: string): boolean {
  return config.severities.includes(severity as ProductivitySeverity);
}

/** Resumo textual dos critérios ativos, usado na UI e no PDF. */
export function describeConfig(config: ProductivityConfig): string {
  const types = config.eventTypes.length
    ? config.eventTypes.map((t) => EVENT_TYPE_LABEL[t]).join(', ')
    : 'nenhum tipo selecionado';
  const days =
    config.weekdays.length === 7
      ? 'todos os dias'
      : config.weekdays.length === 0
        ? 'nenhum dia'
        : config.weekdays
            .slice()
            .sort((a, b) => a - b)
            .map((d) => WEEKDAY_LABEL[d])
            .join('/');
  const severities =
    config.severities.length === PRODUCTIVITY_SEVERITIES.length
      ? 'todas as severidades'
      : config.severities.map((s) => SEVERITY_LABEL[s]).join(', ') || 'nenhuma severidade';

  return `${types} · ${config.windowStart}–${config.windowEnd} · ${days} · ${severities}`;
}

/** Converte uma linha do banco em configuração tipada, com fallback seguro. */
export function fromRow(row: {
  event_types: string[] | null;
  window_start: string | null;
  window_end: string | null;
  weekdays: number[] | null;
  severities: string[] | null;
}): ProductivityConfig {
  return {
    eventTypes: (row.event_types ?? DEFAULT_PRODUCTIVITY_CONFIG.eventTypes).filter(
      (t): t is ProductivityEventType => (PRODUCTIVITY_EVENT_TYPES as readonly string[]).includes(t)
    ),
    windowStart: normalizeTime(row.window_start ?? '', DEFAULT_PRODUCTIVITY_CONFIG.windowStart),
    windowEnd: normalizeTime(row.window_end ?? '', DEFAULT_PRODUCTIVITY_CONFIG.windowEnd),
    weekdays: (row.weekdays ?? DEFAULT_PRODUCTIVITY_CONFIG.weekdays).filter(
      (d) => d >= 0 && d <= 6
    ),
    severities: (row.severities ?? DEFAULT_PRODUCTIVITY_CONFIG.severities).filter(
      (s): s is ProductivitySeverity => (PRODUCTIVITY_SEVERITIES as readonly string[]).includes(s)
    ),
  };
}
