/**
 * navigationCLSLog - Log persistente de resumos por navegação para
 * comparação "antes vs depois". Cada entrada é capturada quando o
 * `useRouteCLS` chama `markFinalReport` (3s após "load completo").
 *
 * Persistência: `localStorage` (chave `visao:cls-nav-log:v1`), com
 * limite de 500 entradas (FIFO). Em DEV expõe `window.__clsNavLog`
 * para download/inspect rápido.
 */
import { logger } from '@/lib/logger';
import type { RouteCLSReport } from '@/lib/clsMonitor';

export interface NavigationCLSEntry {
  /** ID do build/sessão para agrupar runs (antes/depois). */
  sessionId: string;
  /** ISO timestamp da captura. */
  capturedAt: string;
  path: string;
  cls: number;
  rating: RouteCLSReport['rating'];
  shiftCount: number;
  shiftWindowMs: number;
  topSources: Array<{ selector: string; value: number; timestamp: number }>;
}

const STORAGE_KEY = 'visao:cls-nav-log:v1';
const SESSION_KEY = 'visao:cls-nav-session:v1';
const MAX_ENTRIES = 500;

function genSessionId(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}_${rand}`;
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = genSessionId();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return genSessionId();
  }
}

function readAll(): NavigationCLSEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NavigationCLSEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: NavigationCLSEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = entries.length > MAX_ENTRIES ? entries.slice(-MAX_ENTRIES) : entries;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota — ignore */
  }
}

/** Append uma entrada derivada do snapshot final da rota. */
export function appendNavigationCLS(report: RouteCLSReport): void {
  // Evita gravar navegações sem qualquer shift (ruído).
  if (report.shiftCount === 0 && report.cls === 0) return;

  const entry: NavigationCLSEntry = {
    sessionId: getOrCreateSessionId(),
    capturedAt: new Date().toISOString(),
    path: report.path,
    cls: report.cls,
    rating: report.rating,
    shiftCount: report.shiftCount,
    shiftWindowMs: report.shiftWindowMs,
    topSources: report.topSources.map((s) => ({
      selector: s.selector,
      value: Number(s.value.toFixed(4)),
      timestamp: Math.round(s.timestamp),
    })),
  };

  const all = readAll();
  all.push(entry);
  writeAll(all);

  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.info(
      `[CLS nav] ${entry.path} cls=${entry.cls.toFixed(3)} shifts=${entry.shiftCount} top=${entry.topSources[0]?.selector ?? '—'}`
    );
  } else if (entry.cls >= 0.1) {
    logger.warn('Navigation CLS summary', entry, 'CLSNavLog');
  }
}

export function getNavigationCLSLog(): NavigationCLSEntry[] {
  return readAll();
}

export function clearNavigationCLSLog(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Serializa como NDJSON (uma entrada por linha — fácil de diff). */
export function exportNavigationCLSLogNDJSON(): string {
  return readAll()
    .map((e) => JSON.stringify(e))
    .join('\n');
}

/** Serializa como JSON pretty-printed. */
export function exportNavigationCLSLogJSON(): string {
  return JSON.stringify(readAll(), null, 2);
}

/** Dispara download de arquivo no browser. */
export function downloadNavigationCLSLog(format: 'json' | 'ndjson' = 'ndjson'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const content = format === 'json' ? exportNavigationCLSLogJSON() : exportNavigationCLSLogNDJSON();
  const mime = format === 'json' ? 'application/json' : 'application/x-ndjson';
  const ext = format === 'json' ? 'json' : 'ndjson';
  const session = getOrCreateSessionId();
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cls-nav-log_${session}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getNavigationCLSSessionId(): string {
  return getOrCreateSessionId();
}

// DEV: expõe API global para inspeção/export rápido no console.
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  (window as unknown as Record<string, unknown>).__clsNavLog = {
    get: getNavigationCLSLog,
    clear: clearNavigationCLSLog,
    download: downloadNavigationCLSLog,
    sessionId: getNavigationCLSSessionId,
  };
}
