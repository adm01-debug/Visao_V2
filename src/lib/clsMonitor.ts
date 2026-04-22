/**
 * CLS Monitor - Mede Cumulative Layout Shift por rota usando
 * PerformanceObserver nativo. Sem dependências externas.
 *
 * Thresholds (Web Vitals):
 *   good < 0.1, needs-improvement < 0.25, poor >= 0.25
 */
import { logger } from '@/lib/logger';

interface ShiftSource {
  selector: string;
  value: number;
  timestamp: number;
}

interface RouteSession {
  path: string;
  startedAt: number;
  cls: number;
  shifts: ShiftSource[];
  reportedThreshold: boolean;
  reportedFinal: boolean;
}

const isDev =
  typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

let observer: PerformanceObserver | null = null;
let session: RouteSession = createSession(
  typeof window !== 'undefined' ? window.location.pathname : '/'
);
const listeners = new Set<() => void>();

function createSession(path: string): RouteSession {
  return {
    path,
    startedAt: typeof performance !== 'undefined' ? performance.now() : 0,
    cls: 0,
    shifts: [],
    reportedThreshold: false,
    reportedFinal: false,
  };
}

function serializeNode(node: Node | null): string {
  if (!node || !(node instanceof Element)) return '<unknown>';
  const tag = node.tagName.toLowerCase();
  const cls = node.className;
  const firstToken =
    typeof cls === 'string' && cls.length > 0 ? cls.split(/\s+/)[0] : undefined;
  const firstClass = firstToken ? '.' + firstToken.slice(0, 20) : '';
  if (isDev) {
    const id = node.id ? `#${node.id}` : '';
    return `${tag}${firstClass}${id}`;
  }
  return `${tag}${firstClass}`;
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  sources?: Array<{ node: Node | null }>;
}

function handleEntries(list: PerformanceObserverEntryList): void {
  for (const raw of list.getEntries()) {
    const entry = raw as LayoutShiftEntry;
    if (entry.hadRecentInput || !entry.value) continue;
    session.cls += entry.value;
    const sources = entry.sources ?? [];
    const firstSource = sources[0];
    const selector = firstSource ? serializeNode(firstSource.node) : '<no-source>';
    session.shifts.push({
      selector,
      value: entry.value,
      timestamp: entry.startTime - session.startedAt,
    });

    if (
      isDev &&
      !session.reportedThreshold &&
      session.cls >= 0.1
    ) {
      session.reportedThreshold = true;
      const top = [...session.shifts]
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
      // eslint-disable-next-line no-console
      console.warn(
        `[CLS] ${session.path} crossed 0.1 (current: ${session.cls.toFixed(3)})`
      );
      // eslint-disable-next-line no-console
      console.table(top);
    }

    listeners.forEach((fn) => fn());
  }
}

export function startCLSMonitor(): void {
  if (observer || typeof window === 'undefined') return;
  if (!('PerformanceObserver' in window)) return;
  const supported =
    PerformanceObserver.supportedEntryTypes?.includes('layout-shift');
  if (!supported) return;
  try {
    observer = new PerformanceObserver(handleEntries);
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    observer = null;
  }
}

/** Rotas explicitamente monitoradas para o relatório consolidado. */
export const TRACKED_ROUTES = ['/dashboard', '/cameras', '/alerts', '/people'] as const;
export type TrackedRoute = (typeof TRACKED_ROUTES)[number];

export interface RouteCLSReport {
  path: string;
  cls: number;
  shiftCount: number;
  /** Janela de mudança de layout: do 1º ao último shift (ms). */
  shiftWindowMs: number;
  /** Timestamp do 1º shift (ms desde a navegação). */
  firstShiftAt: number | null;
  /** Timestamp do último shift (ms desde a navegação). */
  lastShiftAt: number | null;
  /** Top 3 fontes que mais contribuíram. */
  topSources: ShiftSource[];
  /** Todos os shifts ordenados por timestamp. */
  shifts: ShiftSource[];
  /** Quando o snapshot foi finalizado (epoch ms). */
  capturedAt: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

const STORAGE_KEY = 'visao:cls-route-reports:v1';
const reports = new Map<string, RouteCLSReport>();

function rateCLS(cls: number): RouteCLSReport['rating'] {
  if (cls < 0.1) return 'good';
  if (cls < 0.25) return 'needs-improvement';
  return 'poor';
}

function loadReports(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as RouteCLSReport[];
    for (const r of parsed) reports.set(r.path, r);
  } catch {
    /* ignore */
  }
}

function persistReports(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(reports.values())),
    );
  } catch {
    /* ignore */
  }
}

loadReports();

function buildSnapshot(s: RouteSession): RouteCLSReport {
  const sorted = [...s.shifts].sort((a, b) => a.timestamp - b.timestamp);
  const first = sorted[0]?.timestamp ?? null;
  const last = sorted[sorted.length - 1]?.timestamp ?? null;
  return {
    path: s.path,
    cls: Number(s.cls.toFixed(3)),
    shiftCount: s.shifts.length,
    shiftWindowMs:
      first !== null && last !== null ? Math.round(last - first) : 0,
    firstShiftAt: first !== null ? Math.round(first) : null,
    lastShiftAt: last !== null ? Math.round(last) : null,
    topSources: [...s.shifts].sort((a, b) => b.value - a.value).slice(0, 3),
    shifts: sorted,
    capturedAt: Date.now(),
    rating: rateCLS(s.cls),
  };
}

function captureReport(s: RouteSession): void {
  if (s.shifts.length === 0) return; // skip empty
  const snap = buildSnapshot(s);
  reports.set(s.path, snap);
  persistReports();
  listeners.forEach((fn) => fn());
}

export function resetForRoute(path: string): void {
  // Captura snapshot final da rota anterior antes de resetar
  captureReport(session);

  if (!session.reportedFinal && session.cls >= 0.1) {
    session.reportedFinal = true;
    if (!isDev) {
      logger.warn(
        'Route CLS exceeded 0.1',
        {
          path: session.path,
          cls: Number(session.cls.toFixed(3)),
          shiftCount: session.shifts.length,
          topSources: [...session.shifts]
            .sort((a, b) => b.value - a.value)
            .slice(0, 3),
        },
        'CLSMonitor'
      );
    }
  }
  session = createSession(path);
  listeners.forEach((fn) => fn());
}

export function getCurrentCLS(): number {
  return session.cls;
}

export function getCurrentPath(): string {
  return session.path;
}

export function getShiftLog(): ShiftSource[] {
  return [...session.shifts];
}

export function getRouteSnapshot() {
  return {
    path: session.path,
    cls: Number(session.cls.toFixed(3)),
    shiftCount: session.shifts.length,
    topSources: [...session.shifts]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3),
  };
}

/** Snapshot detalhado da rota atual (para o relatório). */
export function getCurrentReport(): RouteCLSReport {
  return buildSnapshot(session);
}

/** Todos os relatórios persistidos por rota. */
export function getAllReports(): RouteCLSReport[] {
  // Inclui rota atual se estiver em uma rota monitorada e tiver shifts
  const all = new Map(reports);
  if (session.shifts.length > 0) {
    all.set(session.path, buildSnapshot(session));
  }
  return Array.from(all.values()).sort((a, b) => a.path.localeCompare(b.path));
}

/** Relatórios apenas das rotas explicitamente monitoradas. */
export function getTrackedReports(): Array<RouteCLSReport | { path: TrackedRoute; missing: true }> {
  const all = new Map(getAllReports().map((r) => [r.path, r] as const));
  return TRACKED_ROUTES.map((path) =>
    all.get(path) ?? { path, missing: true as const },
  );
}

export function clearReports(): void {
  reports.clear();
  persistReports();
  listeners.forEach((fn) => fn());
}

export function subscribeCLS(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function markFinalReport(): void {
  if (session.reportedFinal) return;
  session.reportedFinal = true;
  // Captura snapshot ao marcar como final (heurística "load completo")
  captureReport(session);
  if (!isDev && session.cls >= 0.1) {
    logger.warn(
      'Route CLS final',
      getRouteSnapshot(),
      'CLSMonitor'
    );
  }
}

