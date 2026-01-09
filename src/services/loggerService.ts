// Logger Service - Projeto VISÃO
// Serviço de logging com tipagem forte

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: Record<string, unknown>;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  batchSize: number;
  flushInterval: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const config: LoggerConfig = {
  minLevel: 'info',
  enableConsole: true,
  enableRemote: false,
  batchSize: 10,
  flushInterval: 5000,
};

const buffer: LogEntry[] = [];

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
};

const formatEntry = (entry: LogEntry): string => {
  const timestamp = entry.timestamp.toISOString();
  const context = entry.context ? `[${entry.context}]` : '';
  return `${timestamp} ${entry.level.toUpperCase()} ${context} ${entry.message}`;
};

const log = (level: LogLevel, message: string, data?: Record<string, unknown>, context?: string): void => {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date(),
    context,
    data,
  };

  if (config.enableConsole) {
    const formatted = formatEntry(entry);
    const consoleFn = level === 'error' || level === 'fatal' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleFn(formatted, data || '');
  }

  buffer.push(entry);
};

export const logger = {
  debug: (message: string, data?: Record<string, unknown>, context?: string) => log('debug', message, data, context),
  info: (message: string, data?: Record<string, unknown>, context?: string) => log('info', message, data, context),
  warn: (message: string, data?: Record<string, unknown>, context?: string) => log('warn', message, data, context),
  error: (message: string, data?: Record<string, unknown>, context?: string) => log('error', message, data, context),
  fatal: (message: string, data?: Record<string, unknown>, context?: string) => log('fatal', message, data, context),
  setConfig: (newConfig: Partial<LoggerConfig>) => Object.assign(config, newConfig),
  getBuffer: () => [...buffer],
  clearBuffer: () => buffer.length = 0,
};

export default logger;
