/* eslint-disable no-console, visao/no-hardcoded-colors -- Logger é o ponto autorizado para console.* e usa cores ANSI/CSS literais. */
/**
 * VISÃO - Logger Estruturado Unificado
 * 
 * Logger com níveis, contexto, buffering e supressão em produção.
 * Uso: import { logger } from '@/lib/logger';
 *      logger.info('Câmera conectada', { cameraId: '123' }, 'CameraService');
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
  requestId?: string;
  traceId?: string;
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  maxBufferSize: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

const config: LoggerConfig = {
  minLevel: isDev ? 'debug' : 'warn',
  enableConsole: true,
  maxBufferSize: 100,
};

const buffer: LogEntry[] = [];

let requestIdCounter = 0;
let currentTraceId: string | undefined;

const generateRequestId = (): string => {
  requestIdCounter += 1;
  return `req_${Date.now()}_${requestIdCounter}`;
};

/**
 * Propriedade para manter o traceId atual (propagado pelo fetcher)
 */
export const setGlobalTraceId = (id: string | undefined) => {
  currentTraceId = id;
};

export const getGlobalTraceId = () => currentTraceId;

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
};

const CONSOLE_STYLES: Record<LogLevel, string> = {
  debug: 'color: #9CA3AF',
  info: 'color: #3B82F6; font-weight: bold',
  warn: 'color: #F59E0B; font-weight: bold',
  error: 'color: #EF4444; font-weight: bold',
  fatal: 'color: #DC2626; font-weight: bold; text-decoration: underline',
};

const log = (
  level: LogLevel,
  message: string,
  data?: unknown,
  context?: string
): void => {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    data,
    requestId: generateRequestId(),
  };

  // Console output with structured format
  if (config.enableConsole) {
    const prefix = context ? `[${context}]` : '';
    const consoleFn =
      level === 'error' || level === 'fatal'
        ? console.error
        : level === 'warn'
        ? console.warn
        : console.log;

    if (isDev) {
      consoleFn(
        `%c[${level.toUpperCase()}] ${entry.timestamp} ${prefix}`,
        CONSOLE_STYLES[level],
        message,
        data ?? ''
      );
    }
    // In production, only errors/fatals get console output
    else if (level === 'error' || level === 'fatal') {
      consoleFn(JSON.stringify(entry));
    }
  }

  // Buffer for potential remote shipping
  buffer.push(entry);
  if (buffer.length > config.maxBufferSize) {
    buffer.splice(0, buffer.length - config.maxBufferSize);
  }
};

export const logger = {
  debug: (message: string, data?: unknown, context?: string) =>
    log('debug', message, data, context),
  info: (message: string, data?: unknown, context?: string) =>
    log('info', message, data, context),
  warn: (message: string, data?: unknown, context?: string) =>
    log('warn', message, data, context),
  error: (message: string, data?: unknown, context?: string) =>
    log('error', message, data, context),
  fatal: (message: string, data?: unknown, context?: string) =>
    log('fatal', message, data, context),

  /** Configure logger at runtime */
  setConfig: (newConfig: Partial<LoggerConfig>) => Object.assign(config, newConfig),

  /** Get buffered log entries */
  getBuffer: (): LogEntry[] => [...buffer],

  /** Clear buffer */
  clearBuffer: () => { buffer.length = 0; },

  /** Create a child logger with fixed context */
  child: (context: string) => ({
    debug: (msg: string, data?: unknown) => log('debug', msg, data, context),
    info: (msg: string, data?: unknown) => log('info', msg, data, context),
    warn: (msg: string, data?: unknown) => log('warn', msg, data, context),
    error: (msg: string, data?: unknown) => log('error', msg, data, context),
    fatal: (msg: string, data?: unknown) => log('fatal', msg, data, context),
  }),
};

export default logger;
