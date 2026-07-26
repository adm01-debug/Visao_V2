/**
 * Configuração das métricas de produtividade do relatório semanal.
 *
 * Define QUAIS eventos contam para a produtividade do time e EM QUE janelas de
 * tempo eles são considerados (faixa horária + dias da semana). Persistido em
 * localStorage por usuário do navegador — é uma preferência de visualização,
 * não um dado de negócio.
 */

export type ProductivityEventKind =
  | "recognitions"
  | "acknowledged_alerts"
  | "resolved_alerts"
  | "panic_events";

export interface ProductivityConfig {
  /** Tipos de evento incluídos no cálculo. */
  events: ProductivityEventKind[];
  /** Hora inicial (0-23) da janela considerada. */
  startHour: number;
  /** Hora final exclusiva (1-24). Se menor que startHour, a janela cruza a meia-noite. */
  endHour: number;
  /** Dias da semana considerados (0 = domingo ... 6 = sábado). */
  weekdays: number[];
}

export const PRODUCTIVITY_EVENT_LABELS: Record<ProductivityEventKind, string> = {
  recognitions: "Reconhecimentos faciais",
  acknowledged_alerts: "Alertas reconhecidos",
  resolved_alerts: "Alertas resolvidos",
  panic_events: "Eventos de pânico",
};

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export const DEFAULT_PRODUCTIVITY_CONFIG: ProductivityConfig = {
  events: ["recognitions", "acknowledged_alerts", "resolved_alerts", "panic_events"],
  startHour: 0,
  endHour: 24,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
};

const STORAGE_KEY = "visao:weekly-report:productivity-config";

const clampHour = (value: unknown, fallback: number, max: number): number => {
  const n = typeof value === "number" ? Math.trunc(value) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > max) return fallback;
  return n;
};

/** Normaliza qualquer entrada (inclusive dados corrompidos no storage) numa config válida. */
export function normalizeProductivityConfig(input: unknown): ProductivityConfig {
  if (!input || typeof input !== "object") return DEFAULT_PRODUCTIVITY_CONFIG;
  const raw = input as Partial<ProductivityConfig>;

  const validEvents = Object.keys(PRODUCTIVITY_EVENT_LABELS) as ProductivityEventKind[];
  const events = Array.isArray(raw.events)
    ? Array.from(new Set(raw.events.filter((e): e is ProductivityEventKind => validEvents.includes(e as ProductivityEventKind))))
    : DEFAULT_PRODUCTIVITY_CONFIG.events;

  const weekdays = Array.isArray(raw.weekdays)
    ? Array.from(new Set(raw.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort()
    : DEFAULT_PRODUCTIVITY_CONFIG.weekdays;

  const startHour = clampHour(raw.startHour, DEFAULT_PRODUCTIVITY_CONFIG.startHour, 23);
  const endHour = clampHour(raw.endHour, DEFAULT_PRODUCTIVITY_CONFIG.endHour, 24);

  return {
    events: events.length ? events : DEFAULT_PRODUCTIVITY_CONFIG.events,
    startHour,
    endHour: endHour === startHour ? DEFAULT_PRODUCTIVITY_CONFIG.endHour : endHour,
    weekdays: weekdays.length ? weekdays : DEFAULT_PRODUCTIVITY_CONFIG.weekdays,
  };
}

export function loadProductivityConfig(): ProductivityConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRODUCTIVITY_CONFIG;
    return normalizeProductivityConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_PRODUCTIVITY_CONFIG;
  }
}

export function saveProductivityConfig(config: ProductivityConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* storage indisponível (modo privado): a config vale só para a sessão */
  }
}

/**
 * Verifica se um instante está dentro da janela configurada.
 * Suporta janelas que cruzam a meia-noite (ex.: 22h → 6h).
 */
export function isWithinWindow(date: Date | string, config: ProductivityConfig): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return false;
  if (!config.weekdays.includes(d.getDay())) return false;

  const hour = d.getHours();
  const { startHour, endHour } = config;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  // Janela noturna cruzando a meia-noite.
  return hour >= startHour || hour < endHour;
}

export function isEventEnabled(config: ProductivityConfig, kind: ProductivityEventKind): boolean {
  return config.events.includes(kind);
}

/** Resumo textual usado em badges e no cabeçalho do PDF. */
export function describeProductivityConfig(config: ProductivityConfig): string {
  const hours =
    config.startHour === 0 && config.endHour === 24
      ? "24h"
      : `${String(config.startHour).padStart(2, "0")}h–${String(config.endHour % 24).padStart(2, "0")}h`;
  const days =
    config.weekdays.length === 7
      ? "todos os dias"
      : config.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ");
  return `${hours} · ${days} · ${config.events.length}/4 tipos de evento`;
}
