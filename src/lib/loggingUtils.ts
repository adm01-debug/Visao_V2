/**
 * Logging Utilities
 * @module lib/loggingUtils
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry { level: LogLevel; message: string; timestamp: Date; context?: Record<string, unknown>; }

const logHistory: LogEntry[] = [];
const maxHistorySize = 1000;
let minLevel: LogLevel = 'info';

const levelPriority: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[minLevel];
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = { level, message, timestamp: new Date(), context };
  if (logHistory.length >= maxHistorySize) logHistory.shift();
  logHistory.push(entry);
  if (!shouldLog(level)) return;
  const prefix = `[${entry.timestamp.toISOString()}] [${level.toUpperCase()}]`;
  const args = context ? [prefix, message, context] : [prefix, message];
  switch (level) {
    case 'debug': console.debug(...args); break;
    case 'info': console.info(...args); break;
    case 'warn': console.warn(...args); break;
    case 'error': console.error(...args); break;
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
  setLevel: (level: LogLevel) => { minLevel = level; },
  getHistory: () => [...logHistory],
  clearHistory: () => { logHistory.length = 0; }
};

export default logger;
