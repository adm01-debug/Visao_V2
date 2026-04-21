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
  const firstClass =
    typeof cls === 'string' && cls.length > 0
      ? '.' + cls.split(/\s+/)[0].slice(0, 20)
      : '';
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
    const selector =
      sources.length > 0 ? serializeNode(sources[0].node) : '<no-source>';
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

export function resetForRoute(path: string): void {
  // Final report on previous route if not yet reported
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

export function subscribeCLS(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function markFinalReport(): void {
  if (session.reportedFinal) return;
  session.reportedFinal = true;
  if (!isDev && session.cls >= 0.1) {
    logger.warn(
      'Route CLS final',
      getRouteSnapshot(),
      'CLSMonitor'
    );
  }
}
